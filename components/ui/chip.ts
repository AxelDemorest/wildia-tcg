/** Toggle pill used by the catalog filters and the collection sort. */
export function chipClass(active: boolean): string {
  return `rounded-xl px-3 py-1.5 text-sm font-medium transition ${
    active
      ? "bg-brand/12 text-white"
      : "bg-surface text-muted hover:bg-white/[0.06] hover:text-white"
  }`;
}
