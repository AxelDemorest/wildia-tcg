"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MOCK_AVATAR_PATH } from "@/lib/profiles/mock-avatar";
import { signOut } from "@/server/actions/auth";

type Props = {
  userId: string;
  locale: string;
  avatarUrl: string;
  avatarAlt: string;
  logoutLabel: string;
  profileLabel: string;
  collectionLabel: string;
  settingsLabel: string;
};

export function HeaderProfileMenu({
  userId,
  locale,
  avatarUrl,
  avatarAlt,
  logoutLabel,
  profileLabel,
  collectionLabel,
  settingsLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={avatarAlt}
        onClick={() => setOpen((value) => !value)}
        className="relative cursor-pointer size-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-brand to-secondary p-[2px] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="relative block size-full overflow-hidden rounded-[4px]">
          <Image
            src={avatarFailed ? MOCK_AVATAR_PATH : avatarUrl}
            alt=""
            fill
            sizes="36px"
            className="object-cover"
            onError={() => setAvatarFailed(true)}
          />
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[12rem] overflow-hidden rounded-lg border border-border-strong bg-panel py-1.5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.8)]"
        >
          <Link
            href={`/players/${userId}`}
            role="menuitem"
            className="block px-3.5 py-2 text-sm text-foreground hover:bg-white/[0.05]"
            onClick={() => setOpen(false)}
          >
            {profileLabel}
          </Link>
          <Link
            href={`/players/${userId}/collection`}
            role="menuitem"
            className="block px-3.5 py-2 text-sm text-foreground hover:bg-white/[0.05]"
            onClick={() => setOpen(false)}
          >
            {collectionLabel}
          </Link>
          <Link
            href={`/players/${userId}/settings`}
            role="menuitem"
            className="block px-3.5 py-2 text-sm text-foreground hover:bg-white/[0.05]"
            onClick={() => setOpen(false)}
          >
            {settingsLabel}
          </Link>
          <div className="my-1 border-t border-border" role="separator" />
          <form action={signOut.bind(null, locale)} role="none" onSubmit={() => setOpen(false)}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3.5 py-2 text-left text-sm text-red-300 hover:bg-white/[0.05]"
            >
              {logoutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
