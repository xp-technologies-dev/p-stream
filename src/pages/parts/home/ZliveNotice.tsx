import { useTranslation } from "react-i18next";

import { Icons } from "@/components/Icon";
import {
  Notice,
  NoticeOrder,
  useDismissibleNotice,
} from "@/components/NoticeStack";

const STORAGE_KEY = "zstream::zlive-notice-dismissed";
const ZLIVE_URL = "https://zlive.st";

export function ZliveNotice() {
  const { t } = useTranslation();
  const { visible, dismiss } = useDismissibleNotice(STORAGE_KEY, 1300);

  if (!visible) return null;

  return (
    <Notice
      order={NoticeOrder.Zlive}
      accent="orange"
      icon={Icons.PLAY}
      title={t("zliveNotice.title")}
      badge={t("zliveNotice.badge")}
      description={t("zliveNotice.description")}
      dismissLabel={t("zliveNotice.dismiss")}
      onDismiss={dismiss}
      action={({ className, close }) => (
        <a
          href={ZLIVE_URL}
          target="_blank"
          rel="noreferrer"
          onClick={close}
          className={className}
        >
          {t("zliveNotice.visit")}
        </a>
      )}
    />
  );
}
