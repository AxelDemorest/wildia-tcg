import { getTranslations } from "next-intl/server";
import { Surface } from "@/components/ui/surface";

export async function ProfileHubTabPlaceholder() {
  const t = await getTranslations("Profile.hub");
  return (
    <Surface className="p-8 text-center">
      <p className="text-lg font-semibold text-foreground">{t("tabSoonTitle")}</p>
      <p className="mt-2 text-sm text-muted">{t("tabSoonBody")}</p>
    </Surface>
  );
}