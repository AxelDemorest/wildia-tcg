"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import type { CatalogCard } from "@/lib/cards/types";
import { SHOWCASE_SLOT_COUNT } from "@/lib/profiles/showcase";
import {
  saveProfileBanner,
  saveProfileSettings,
  type BannerActionState,
  type ProfileActionState,
} from "@/server/actions/profile";

type Props = {
  locale: string;
  displayName: string | null;
  bio: string | null;
  isPublic: boolean;
  showcaseSlots: (string | null)[];
  ownedCards: CatalogCard[];
};

const profileInitial: ProfileActionState = { ok: false };
const bannerInitial: BannerActionState = { ok: false };

export function ProfileSettingsForm({
  locale,
  displayName,
  bio,
  isPublic,
  showcaseSlots,
  ownedCards,
}: Props) {
  const t = useTranslations("Profile");
  const [profileState, profileAction, profilePending] = useActionState(
    saveProfileSettings,
    profileInitial,
  );
  const [bannerState, bannerAction, bannerPending] = useActionState(
    saveProfileBanner,
    bannerInitial,
  );

  return (
    <div className="space-y-8">
      <Surface className="p-6">
        <form action={profileAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-white/85">
              {t("displayName")}
            </label>
            <input
              id="displayName"
              name="displayName"
              defaultValue={displayName ?? ""}
              maxLength={40}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-white focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-white/85">
              {t("bio")}
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={bio ?? ""}
              maxLength={500}
              rows={4}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-white focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-white/85">{t("showcaseTitle")}</legend>
            <p className="text-xs text-muted">{t("showcaseHint")}</p>
            {Array.from({ length: SHOWCASE_SLOT_COUNT }, (_, index) => {
              const slot = index + 1;
              const fieldId = `showcaseSlot${slot}`;
              return (
                <div key={slot}>
                  <label htmlFor={fieldId} className="block text-xs font-medium text-muted">
                    {t("showcaseSlot", { slot })}
                  </label>
                  <select
                    id={fieldId}
                    name={fieldId}
                    defaultValue={showcaseSlots[index] ?? ""}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-white focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="">{t("featuredNone")}</option>
                    {ownedCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublic"
              value="true"
              defaultChecked={isPublic}
              className="size-4 rounded border-border accent-[var(--brand)]"
            />
            {t("isPublic")}
          </label>
          {profileState.message && !profileState.ok && (
            <p className="text-sm text-red-300" role="alert">
              {t(`error.${profileState.message}`)}
            </p>
          )}
          {profileState.ok && <p className="text-sm text-secondary">{t("saved")}</p>}
          <Button type="submit" disabled={profilePending}>
            {profilePending ? t("saving") : t("save")}
          </Button>
        </form>
      </Surface>

      <Surface className="p-6">
        <h2 className="text-lg font-bold text-foreground">{t("bannerTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("bannerHint")}</p>
        <form action={bannerAction} className="mt-4 space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input
            type="file"
            name="banner"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/[0.12]"
          />
          {bannerState.message && !bannerState.ok && (
            <p className="text-sm text-red-300" role="alert">
              {t(`bannerError.${bannerState.message}`)}
            </p>
          )}
          {bannerState.ok && <p className="text-sm text-secondary">{t("bannerSaved")}</p>}
          <Button type="submit" disabled={bannerPending}>
            {bannerPending ? t("bannerUploading") : t("bannerUpload")}
          </Button>
        </form>
      </Surface>
    </div>
  );
}