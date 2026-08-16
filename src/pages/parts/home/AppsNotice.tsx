import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Icons } from "@/components/Icon";
import {
  Notice,
  NoticeOrder,
  useDismissibleNotice,
} from "@/components/NoticeStack";

const STORAGE_KEY = "zstream::apps-notice-dismissed";

export function AppsNotice() {
  const { t } = useTranslation();
  const { visible, dismiss } = useDismissibleNotice(STORAGE_KEY, 2200);

  if (!visible) return null;

  return (
    <Notice
      order={NoticeOrder.Apps}
      accent="indigo"
      icon={Icons.DOWNLOAD}
      title={t("appsNotice.title")}
      badge={t("appsNotice.badge")}
      description={t("appsNotice.description")}
      dismissLabel={t("appsNotice.dismiss")}
      onDismiss={dismiss}
      action={({ className, close }) => (
        <Link to="/apps" onClick={close} className={className}>
          {t("appsNotice.visit")}
        </Link>
      )}
    />
  );
}
