import { useTranslation } from "react-i18next";

import { Icons } from "@/components/Icon";
import { Notice, NoticeOrder } from "@/components/NoticeStack";
import { useAppUpdateCheck } from "@/hooks/useAppUpdateCheck";

export function UpdateNotice() {
  const { t } = useTranslation();
  const { updateAvailable, dismiss } = useAppUpdateCheck();

  const refresh = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.href = url.toString();
  };

  if (!updateAvailable) return null;

  return (
    <Notice
      order={NoticeOrder.Update}
      accent="purple"
      icon={Icons.RELOAD}
      title={t("updateNotice.title")}
      description={t("updateNotice.description")}
      dismissLabel={t("updateNotice.dismiss")}
      onDismiss={dismiss}
      action={({ className }) => (
        <button type="button" onClick={refresh} className={className}>
          {t("updateNotice.refresh")}
        </button>
      )}
    />
  );
}
