import { ReactElement, Suspense, lazy, useEffect, useState } from "react";
import { lazyWithPreload } from "react-lazy-with-preload";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { convertLegacyUrl, isLegacyUrl } from "@/backend/metadata/getmeta";
import { generateQuickSearchMediaUrl } from "@/backend/metadata/tmdb";
import { DetailsModal } from "@/components/overlays/detailsModal";
import { DownloadModal } from "@/components/overlays/downloadModal";
import { GamepadControlsModal } from "@/components/overlays/GamepadControlsModal";
import { KeyboardCommandsEditModal } from "@/components/overlays/KeyboardCommandsEditModal";
import { KeyboardCommandsModal } from "@/components/overlays/KeyboardCommandsModal";
import { NotificationModal } from "@/components/overlays/notificationsModal";
import { SupportInfoModal } from "@/components/overlays/SupportInfoModal";
import { TipJarModal } from "@/components/overlays/tipJarModal";
import { SimklAuthHandler } from "@/components/auth/SimklAuthHandler";
import { NoticeStackHost } from "@/components/NoticeStack";
import { UpdateNotice } from "@/components/UpdateNotice";
import { TraktAuthHandler } from "@/components/auth/TraktAuthHandler";
import { useGlobalKeyboardEvents } from "@/hooks/useGlobalKeyboardEvents";
import { useOnlineListener } from "@/hooks/usePing";
import { useGamepadNavigation } from "@/hooks/useGamepadNavigation";
import { useSpatialNavigation } from "@/hooks/useSpatialNavigation";
import { AboutPage } from "@/pages/About";
import { AppsPage } from "@/pages/Apps";
import { AdminPage } from "@/pages/admin/AdminPage";
import { AllBookmarks } from "@/pages/bookmarks/AllBookmarks";
import VideoTesterView from "@/pages/developer/VideoTesterView";
import { DiscoverMore } from "@/pages/discover/AllMovieLists";
import { Discover } from "@/pages/discover/Discover";
import { MoreContent } from "@/pages/discover/MoreContent";
import MaintenancePage from "@/pages/errors/MaintenancePage";
import { NotFoundPage } from "@/pages/errors/NotFoundPage";
import { HomePage } from "@/pages/HomePage";
import { PersonView } from "@/pages/PersonView";
import { CelPage } from "@/pages/Cel";
import { LegalPage, shouldHaveLegalPage } from "@/pages/Legal";
import { LoginPage } from "@/pages/Login";
import { MigrationPage } from "@/pages/migration/Migration";
import { MigrationDirectPage } from "@/pages/migration/MigrationDirect";
import { MigrationDownloadPage } from "@/pages/migration/MigrationDownload";
import { MigrationPasskeyPage } from "@/pages/migration/MigrationPasskey";
import { MigrationUploadPage } from "@/pages/migration/MigrationUpload";
import { OnboardingPage } from "@/pages/onboarding/Onboarding";
import { OnboardingExtensionPage } from "@/pages/onboarding/OnboardingExtension";
import { OnboardingProxyPage } from "@/pages/onboarding/OnboardingProxy";
import { PasPage } from "@/pages/Pas";
import { RegisterPage } from "@/pages/Register";
import { SupportPage } from "@/pages/Support";
import { MyAlgorithmPage } from "@/pages/algorithm/MyAlgorithm";
import { WatchHistory } from "@/pages/watchHistory/WatchHistory";
import { Layout } from "@/setup/Layout";
import { useAdsStore } from "@/stores/ads";
import { useHistoryListener } from "@/stores/history";
import { useClearModalsOnNavigation } from "@/stores/interface/overlayStack";
import { LanguageProvider } from "@/stores/language";
import { conf } from "@/setup/config";

const DeveloperPage = lazy(() => import("@/pages/DeveloperPage"));
const TestView = lazy(() => import("@/pages/developer/TestView"));
const PlayerView = lazyWithPreload(() => import("@/pages/PlayerView"));
const SettingsPage = lazyWithPreload(() => import("@/pages/Settings"));

PlayerView.preload();
SettingsPage.preload();

function LegacyUrlView({ children }: { children: ReactElement }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const url = location.pathname;
    if (!isLegacyUrl(url)) return;
    convertLegacyUrl(location.pathname).then((convertedUrl) => {
      navigate(convertedUrl ?? "/", { replace: true });
    });
  }, [location.pathname, navigate]);

  if (isLegacyUrl(location.pathname)) return null;
  return children;
}

function QuickSearch() {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      generateQuickSearchMediaUrl(query).then((url) => {
        navigate(url ?? "/", { replace: true });
      });
    } else {
      navigate("/", { replace: true });
    }
  }, [query, navigate]);

  return null;
}

function QueryView() {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      navigate(`/browse/${encodeURIComponent(query)}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [query, navigate]);

  return null;
}

export const maintenanceTime = "March 31th 11:00 PM - 5:00 AM EST";

function App() {
  useHistoryListener();
  useOnlineListener();
  useGlobalKeyboardEvents();
  useSpatialNavigation();
  useGamepadNavigation();
  useClearModalsOnNavigation();
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith("/media/");
  const maintenance = false; // Shows maintance page
  const [showDowntime, setShowDowntime] = useState(maintenance);
  const adsDisabled = useAdsStore((s) => s.adsDisabled);

  useEffect(() => {
    const cfg = conf();
    if (!cfg.ENABLE_RYBBIT || !cfg.RYBBIT_SCRIPT_URL || !cfg.RYBBIT_SITE_ID)
      return;
    if (typeof document === "undefined") return;
    if (document.querySelector("script[data-rybbit]")) return;
    const s = document.createElement("script");
    s.src = cfg.RYBBIT_SCRIPT_URL;
    s.defer = true;
    s.dataset.siteId = cfg.RYBBIT_SITE_ID;
    s.dataset.rybbit = "1";
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (isWatchPage) return;
    if (adsDisabled) return;
    const cfg = conf();
    if (
      !cfg.ENABLE_POPUNDER ||
      !cfg.POPUNDER_SCRIPT_URL ||
      !cfg.POPUNDER_ZONE_ID
    )
      return;
    if (typeof document === "undefined") return;

    if (document.querySelector(`script[data-zone="${cfg.POPUNDER_ZONE_ID}"]`)) {
      return;
    }

    const target = [document.documentElement, document.body]
      .filter(Boolean)
      .pop();
    if (!target) return;

    const s = target.appendChild(document.createElement("script"));
    s.dataset.zone = cfg.POPUNDER_ZONE_ID;
    s.src = cfg.POPUNDER_SCRIPT_URL;
  }, [adsDisabled, isWatchPage]);

  const handleButtonClick = () => {
    setShowDowntime(false);
  };

  useEffect(() => {
    const sessionToken = sessionStorage.getItem("downtimeToken");
    if (!sessionToken && maintenance) {
      setShowDowntime(true);
      sessionStorage.setItem("downtimeToken", "true");
    }
  }, [setShowDowntime, maintenance]);

  return (
    <Layout>
      <TraktAuthHandler />
      <SimklAuthHandler />
      <LanguageProvider />
      <NoticeStackHost />
      <UpdateNotice />
      <NotificationModal id="notifications" />
      <TipJarModal id="tip-jar" />
      <DownloadModal id="download" />
      <KeyboardCommandsModal id="keyboard-commands" />
      <KeyboardCommandsEditModal id="keyboard-commands-edit" />
      <GamepadControlsModal id="gamepad-controls-edit" />
      <SupportInfoModal id="support-info" />
      <DetailsModal id="details" />
      <DetailsModal id="discover-details" />
      <DetailsModal id="player-details" />
      {/* DebugFab: dev-only floating panel (cookie/ratings/local-data resets) */}
      <main className="contents">
        {!showDowntime && (
          <Routes>
            {/* functional routes */}
            <Route path="/s/:query" element={<QuickSearch />} />
            <Route path="/search/:type" element={<Navigate to="/browse" />} />
            <Route path="/search/:type/:query?" element={<QueryView />} />
            {/* pages */}
            <Route
              path="/media/:media"
              element={
                <LegacyUrlView>
                  <Suspense fallback={null}>
                    <PlayerView />
                  </Suspense>
                </LegacyUrlView>
              }
            />
            <Route
              path="/media/:media/:season/:episode"
              element={
                <LegacyUrlView>
                  <Suspense fallback={null}>
                    <PlayerView />
                  </Suspense>
                </LegacyUrlView>
              }
            />
            <Route path="/browse/:query?" element={<HomePage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route
              path="/onboarding/extension"
              element={<OnboardingExtensionPage />}
            />
            <Route path="/onboarding/proxy" element={<OnboardingProxyPage />} />

            {/* Migration pages - awaiting import and export fixes */}
            <Route path="/migration" element={<MigrationPage />} />
            <Route path="/migration/direct" element={<MigrationDirectPage />} />
            <Route
              path="/migration/download"
              element={<MigrationDownloadPage />}
            />
            <Route path="/migration/upload" element={<MigrationUploadPage />} />
            <Route
              path="/migration/passkey"
              element={<MigrationPasskeyPage />}
            />

            {shouldHaveLegalPage() ? (
              <Route path="/legal" element={<LegalPage />} />
            ) : null}
            {/* Support page */}
            <Route path="/support" element={<SupportPage />} />
            <Route path="/cel" element={<CelPage />} />
            <Route path="/pas" element={<PasPage />} />
            {/* Discover pages */}
            <Route path="/discover" element={<Discover />} />
            <Route
              path="/discover/more/:contentType/:mediaType"
              element={<MoreContent />}
            />
            <Route
              path="/discover/more/:contentType/:id/:mediaType"
              element={<MoreContent />}
            />
            <Route path="/discover/more/:category" element={<MoreContent />} />
            <Route path="/discover/all" element={<DiscoverMore />} />
            {/* Bookmarks page */}
            <Route path="/bookmarks" element={<AllBookmarks />} />
            <Route path="/person/:id" element={<PersonView />} />
            {/* Watch History page */}
            <Route path="/watch-history" element={<WatchHistory />} />
            <Route path="/algorithm" element={<MyAlgorithmPage />} />
            {/* Settings page */}
            <Route
              path="/settings"
              element={
                <Suspense fallback={null}>
                  <SettingsPage />
                </Suspense>
              }
            />
            {/* admin routes */}
            <Route path="/admin" element={<AdminPage />} />
            {/* other */}
            <Route path="/dev" element={<DeveloperPage />} />
            <Route path="/dev/video" element={<VideoTesterView />} />
            {/* developer routes that can abuse workers are disabled in production */}
            {process.env.NODE_ENV === "development" ? (
              <Route path="/dev/test" element={<TestView />} />
            ) : null}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        )}
        {showDowntime && (
          <MaintenancePage onHomeButtonClick={handleButtonClick} />
        )}
      </main>
    </Layout>
  );
}

export default App;
