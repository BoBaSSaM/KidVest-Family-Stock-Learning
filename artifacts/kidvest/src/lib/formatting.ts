const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const LEFT_TO_RIGHT_ISOLATE = "\u2066";
const POP_DIRECTIONAL_ISOLATE = "\u2069";

export function formatUsd(value: number | undefined | null): string {
  const amount = Number.isFinite(value) ? (value as number) : 0;
  return `${LEFT_TO_RIGHT_ISOLATE}${usdFormatter.format(amount)}${POP_DIRECTIONAL_ISOLATE}`;
}
