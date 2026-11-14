"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/server/actions/auth";

type Props = {
  userId: string;
  locale: string;
  avatarUrl: string;
  avatarAlt: string;
  logoutLabel: string;
  profileLabel: string;
  settingsLabel: string;
};

export function HeaderProfileMenu({
  userId,
  locale,
  avatarUrl,
  avatarAlt,
  logoutLabel,
  profileLabel,
  settingsLabel,
}: Props) {
  const [open, setOpen] = useState(false);
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
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-zinc-200 shadow-sm ring-1 ring-black/10 transition hover:ring-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <Image src={avatarUrl} alt="" fill sizes="40px" className="object-cover" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[11rem] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          <Link
            href={`/players/${userId}`}
            role="menuitem"
            className="block px-3 py-2 text-sm text-foreground hover:bg-black/[0.04]"
            onClick={() => setOpen(false)}
          >
            {profileLabel}
          </Link>
          <Link
            href="/settings/profile"
            role="menuitem"
            className="block px-3 py-2 text-sm text-foreground hover:bg-black/[0.04]"
            onClick={() => setOpen(false)}
          >
            {settingsLabel}
          </Link>
          <div className="my-1 border-t border-border" role="separator" />
          <form
            action={signOut.bind(null, locale)}
            role="none"
            onSubmit={() => setOpen(false)}
          >
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-brand-strong hover:bg-black/[0.04]"
            >
              {logoutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
