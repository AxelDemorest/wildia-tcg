/** Toggle pill used by the catalog filters and the collection sort. */
export function chipClass(active: boolean): string {
  return `rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
    active
      ? "bg-brand/15 text-white ring-secondary/45"
      : "text-muted ring-border hover:bg-white/[0.04] hover:text-white hover:ring-border-strong"
  }`;
}
