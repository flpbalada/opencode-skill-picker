export function getMaxStringLength(values: readonly string[]) {
  return Math.max(0, ...values.map((value) => value.length));
}
