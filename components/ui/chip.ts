/** Toggle pill used by the catalog filters and the collection sort. */
export function chipClass(active: boolean): string {
  return `rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
    active
      ? "border-brand/50 bg-brand/12 text-white"
      : "border-border bg-surface text-muted hover:border-white/20 hover:text-white"
  }`;
}
