import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "./button";

export function LanguageToggle() {
  const { locale, toggleLocale, t } = useI18n();
  const next = locale === "en" ? "ID" : "EN";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      aria-label={`${t("common.switchLanguage")} (${next})`}
      title={t("common.switchLanguage")}
      className="gap-1.5 px-2"
    >
      <Languages className="h-4 w-4" />
      <span className="font-mono text-[10px] font-semibold uppercase">{locale}</span>
    </Button>
  );
}
