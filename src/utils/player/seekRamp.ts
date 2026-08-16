const BANDS: { after: number; step: number }[] = [
  { after: 0, step: 5 },
  { after: 1500, step: 15 },
  { after: 3000, step: 30 },
  { after: 5000, step: 60 },
];

/** The largest fraction of a title one press may cross. */
const MAX_FRACTION = 0.05;

export function stepForHold(heldMs: number, duration = 0): number {
  let step = BANDS[0].step;
  for (let i = 0; i < BANDS.length; i += 1) {
    if (heldMs >= BANDS[i].after) step = BANDS[i].step;
  }

  if (duration > 0) {
    // Never below a second, or a short title would need hundreds of presses.
    step = Math.min(step, Math.max(1, duration * MAX_FRACTION));
  }

  return step;
}
