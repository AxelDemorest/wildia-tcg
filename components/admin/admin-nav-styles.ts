// Classes shared by the shell's server-rendered entries and AdminNav, a client component. A plain
// module on purpose: a "use client" module's exports reach server components as references.

/** A sidebar entry, link or button: 40 px high, radius 8, icon then label. */
export const sidebarEntry = "flex h-10 items-center gap-2.5 rounded-[8px] px-3";

/** A sidebar entry that is not the current page. */
export const idleSidebarEntry = `${sidebarEntry} font-medium text-admin-text hover:bg-admin-subtle`;

/** The current page, in the sidebar and in the phone tabs. */
export const currentEntry = "bg-admin-brand-soft font-semibold text-brand-strong";

/** An icon button of the phone top bar, named by its aria-label. */
export const topBarIconButton =
  "flex size-11 items-center justify-center rounded-[8px] text-admin-text";
