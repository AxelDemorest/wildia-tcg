/** Whether a pointer press is the primary button of a primary pointer: the only one that charges the pack. */
export function isPrimaryPress(press: { button: number; isPrimary: boolean }): boolean {
  return press.button === 0 && press.isPrimary;
}
