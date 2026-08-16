import "@/setup/pwa";
import "core-js/stable";
import "./stores/__old/imports";
import "@/setup/ga";
import "@/assets/css/index.css";

import { StrictMode, Suspense, useCallback, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { useAsync, useAsyncFn } from "react-use";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Loading } from "@/components/layout/Loading";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAuthRestore } from "@/hooks/auth/useAuthRestore";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { ErrorBoundary } from "@/pages/errors/ErrorBoundary";
import { MigrationPart } from "@/pages/parts/migrations/MigrationPart";
import { LargeTextPart } from "@/pages/parts/util/LargeTextPart";
import App from "@/setup/App";
import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";
import { BookmarkSyncer } from "@/stores/bookmarks/BookmarkSyncer";
import { GroupSyncer } from "@/stores/groupOrder/GroupSyncer";
import { changeAppLanguage, useLanguageStore } from "@/stores/language";
import { ProgressSyncer } from "@/stores/progress/ProgressSyncer";
import { SettingsSyncer } from "@/stores/subtitles/SettingsSyncer";
import { ThemeProvider } from "@/stores/theme";
import { TraktBookmarkSyncer } from "@/stores/trakt/TraktBookmarkSyncer";
import { TraktHistorySyncer } from "@/stores/trakt/TraktHistorySyncer";
import { SimklBookmarkSyncer } from "@/stores/simkl/SimklBookmarkSyncer";
import { SimklHistorySyncer } from "@/stores/simkl/SimklHistorySyncer";
import { TraktScrobbler } from "@/stores/trakt/TraktScrobbler";
import { WatchHistorySyncer } from "@/stores/watchHistory/WatchHistorySyncer";
import { initInputModality } from "@/utils/browser/inputModality";
import { initNavDebug } from "@/utils/browser/navDebug";
import { detectRegion, useRegionStore } from "@/utils/locale/detectRegion";

import {
  extensionInfo,
  isExtensionActiveCached,
} from "./backend/extension/messaging";
import { initializeImageFadeIn } from "./setup/imageFadeIn";
import { initializeOldStores } from "./stores/__old/migrations";



// Restore native decodeURIComponent if a browser extension (e.g. AdBlock Plus)
// has replaced it with a broken version that throws ReferenceError on the browse page.
try {
  const iframe = document.createElement("iframe");
  document.head.appendChild(iframe);
  const nativeDecode = (iframe.contentWindow as Window & typeof globalThis)
    .decodeURIComponent;
  document.head.removeChild(iframe);
  if (typeof nativeDecode === "function") {
    window.decodeURIComponent = nativeDecode;
  }
} catch {
  // If restoring fails, leave whatever is available
}

// initialize
initializeImageFadeIn();
initInputModality();
initNavDebug();

function LoadingScreen(props: { type: "user" | "lazy" }) {
  const mapping = {
    user: "screens.loadingUser",
    lazy: "screens.loadingApp",
  };
  const { t } = useTranslation();
  return (
    <LargeTextPart iconSlot={<Loading />}>
      {t(mapping[props.type] ?? "unknown.translation")}
    </LargeTextPart>
  );
}

function ErrorScreen(props: {
  children: ReactNode;
  showResetButton?: boolean;
  showLogoutButton?: boolean;
  showReloadButton?: boolean;
  showDisconnectButton?: boolean;
}) {
  const { t } = useTranslation();
  const { logout, disconnectFromBackend } = useAuth();
  const setBackendUrl = useAuthStore((s) => s.setBackendUrl);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const resetBackend = useCallback(() => {
    setBackendUrl(null);
    // eslint-disable-next-line no-restricted-globals
    location.reload();
  }, [setBackendUrl]);

  const logoutFromBackend = useCallback(() => {
    logout().then(() => {
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    });
  }, [logout]);

  const handleDisconnectConfirm = useCallback(() => {
    disconnectFromBackend().then(() => {
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    });
  }, [disconnectFromBackend]);

  return (
    <LargeTextPart
      iconSlot={
        <Icon className="text-type-danger text-2xl" icon={Icons.WARNING} />
      }
    >
      {props.children}
      {props.showResetButton ? (
        <div className="mt-6">
          <Button theme="secondary" onClick={resetBackend}>
            {t("screens.loadingUserError.reset")}
          </Button>
        </div>
      ) : null}
      {props.showLogoutButton ? (
        <div className="mt-6">
          <Button theme="secondary" onClick={logoutFromBackend}>
            {t("screens.loadingUserError.logout")}
          </Button>
        </div>
      ) : null}
      {props.showDisconnectButton ? (
        <div className="mt-6">
          <Button
            theme="secondary"
            onClick={() => setShowDisconnectConfirm(true)}
          >
            {t("screens.loadingUserError.disconnect")}
          </Button>
        </div>
      ) : null}
      {props.showReloadButton ? (
        <div className="mt-6">
          <Button theme="secondary" onClick={() => window.location.reload()}>
            {t("screens.loadingUserError.reload")}
          </Button>
        </div>
      ) : null}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-modal-background rounded-xl p-8 max-w-md mx-4">
            <h2 className="text-white text-xl font-semibold mb-4">
              {t("screens.loadingUserError.disconnectTitle")}
            </h2>
            <p className="text-type-secondary mb-6">
              {t("screens.loadingUserError.disconnectMessage")}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                theme="secondary"
                onClick={() => setShowDisconnectConfirm(false)}
              >
                {t("screens.loadingUserError.disconectCancel")}
              </Button>
              <Button theme="danger" onClick={handleDisconnectConfirm}>
                {t("screens.loadingUserError.disconnectConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </LargeTextPart>
  );
}

function AuthWrapper() {
  const status = useAuthRestore();
  const backendUrl = conf().BACKEND_URL;
  const userBackendUrl = useBackendUrl();
  const { t } = useTranslation();

  const isCustomUrl = backendUrl !== userBackendUrl;

  if (status.loading) return <LoadingScreen type="user" />;
  if (status.error)
    return (
      <ErrorScreen
        showResetButton={isCustomUrl}
        showLogoutButton={!isCustomUrl}
        showDisconnectButton={!isCustomUrl}
        showReloadButton={!isCustomUrl}
      >
        {t(
          isCustomUrl
            ? "screens.loadingUserError.textWithReset"
            : "screens.loadingUserError.text",
        )}
      </ErrorScreen>
    );
  return <App />;
}

function MigrationRunner() {
  const status = useAsync(async () => {
    changeAppLanguage(useLanguageStore.getState().language);
    await initializeOldStores();

    const region = await detectRegion();
    useRegionStore.getState().setRegion(region);
  }, []);
  const { t } = useTranslation();

  if (status.loading) return <MigrationPart />;
  if (status.error)
    return <ErrorScreen>{t("screens.migration.failed")}</ErrorScreen>;
  return <AuthWrapper />;
}

function TheRouter(props: { children: ReactNode }) {
  const normalRouter = conf().NORMAL_ROUTER;

  if (normalRouter)
    return (
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {props.children}
      </BrowserRouter>
    );
  return (
    <HashRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {props.children}
    </HashRouter>
  );
}

// Checks if the extension is installed
function ExtensionStatus() {
  const { t } = useTranslation();
  const [state] = useAsyncFn(async () => {
    if (!isExtensionActiveCached) {
      return extensionInfo();
    }
  });

  if (state.loading) {
    return <LoadingScreen type="lazy" />;
  }
  if (state.error) {
    return <ErrorScreen>{t("screens.loadingUserError.reload")}</ErrorScreen>;
  }
  return null;
}
const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <Suspense fallback={<LoadingScreen type="lazy" />}>
          <ExtensionStatus />
          <ThemeProvider applyGlobal>
            <ProgressSyncer />
            <BookmarkSyncer />
            <WatchHistorySyncer />
            <GroupSyncer />
            <SettingsSyncer />
            <TraktBookmarkSyncer />
            <TraktHistorySyncer />
            <SimklBookmarkSyncer />
            <SimklHistorySyncer />
            <TraktScrobbler />
            <TheRouter>
              <MigrationRunner />
            </TheRouter>
          </ThemeProvider>
        </Suspense>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
