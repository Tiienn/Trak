/** A Higher-or-Lower run counts its successful answers plus the final miss. */
export function higherLowerAnsweredRounds(run: number): number {
  return Math.max(0, Math.floor(Number.isFinite(run) ? run : 0)) + 1;
}

