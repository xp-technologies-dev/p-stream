export type Direction = "up" | "down" | "left" | "right";

export interface NavRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

const EPSILON = 1e-6;

/** §8.4: 30 across a horizontal move, 2 across a vertical one. */
const ORTHOGONAL_WEIGHT_HORIZONTAL = 30;
const ORTHOGONAL_WEIGHT_VERTICAL = 2;

/** §8.4: `alignment = alignBias * alignWeight`. */
const ALIGN_WEIGHT = 5;

function isHorizontal(direction: Direction): boolean {
  return direction === "left" || direction === "right";
}

function axisGap(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
): number {
  if (bMin > aMax) return bMin - aMax;
  if (bMax < aMin) return bMax - aMin;
  return 0;
}

/** Length shared by two 1-D intervals, 0 if they are disjoint. */
function overlapLength(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
): number {
  return Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
}

function intersectionArea(a: NavRect, b: NavRect): number {
  return (
    overlapLength(a.left, a.right, b.left, b.right) *
    overlapLength(a.top, a.bottom, b.top, b.bottom)
  );
}

export function navigationDistance(
  origin: NavRect,
  candidate: NavRect,
  direction: Direction,
): number {
  const dx = axisGap(
    origin.left,
    origin.right,
    candidate.left,
    candidate.right,
  );
  const dy = axisGap(
    origin.top,
    origin.bottom,
    candidate.top,
    candidate.bottom,
  );
  const euclidean = Math.sqrt(dx * dx + dy * dy);

  const horizontal = isHorizontal(direction);

  const orthogonalDistance = Math.abs(horizontal ? dy : dx);
  const orthogonalBias = (horizontal ? origin.height : origin.width) / 2;
  const orthogonalWeight = horizontal
    ? ORTHOGONAL_WEIGHT_HORIZONTAL
    : ORTHOGONAL_WEIGHT_VERTICAL;
  const displacement = (orthogonalDistance + orthogonalBias) * orthogonalWeight;

  const projectedOverlap = horizontal
    ? overlapLength(origin.top, origin.bottom, candidate.top, candidate.bottom)
    : overlapLength(origin.left, origin.right, candidate.left, candidate.right);
  const referenceDimension = horizontal ? origin.height : origin.width;
  const alignBias =
    referenceDimension > 0 ? projectedOverlap / referenceDimension : 0;
  const alignment = alignBias * ALIGN_WEIGHT;

  const overlap = intersectionArea(origin, candidate);

  return euclidean + displacement - alignment - Math.sqrt(overlap);
}

function advancesLeadingEdge(
  origin: NavRect,
  candidate: NavRect,
  direction: Direction,
): boolean {
  switch (direction) {
    case "down":
      return candidate.top > origin.top + EPSILON;
    case "up":
      return candidate.bottom < origin.bottom - EPSILON;
    case "right":
      return candidate.left > origin.left + EPSILON;
    default:
      return candidate.right < origin.right - EPSILON;
  }
}

/** How far past the origin's leading edge the candidate's leading edge sits. */
function leadingEdgeOffset(
  origin: NavRect,
  candidate: NavRect,
  direction: Direction,
): number {
  switch (direction) {
    case "down":
      return candidate.top - origin.top;
    case "up":
      return origin.bottom - candidate.bottom;
    case "right":
      return candidate.left - origin.left;
    default:
      return origin.right - candidate.right;
  }
}

function isBeyond(
  origin: NavRect,
  candidate: NavRect,
  direction: Direction,
): boolean {
  switch (direction) {
    case "down":
      return candidate.top >= origin.bottom - EPSILON;
    case "up":
      return candidate.bottom <= origin.top + EPSILON;
    case "right":
      return candidate.left >= origin.right - EPSILON;
    default:
      return candidate.right <= origin.left + EPSILON;
  }
}

export function pickCandidate(
  origin: NavRect,
  candidates: readonly NavRect[],
  direction: Direction,
): number | null {
  let best: number | null = null;
  let bestScore = Infinity;

  // Pass 1 — overlapping the origin.
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (!advancesLeadingEdge(origin, candidate, direction)) continue;
    if (intersectionArea(origin, candidate) <= 0) continue;
    const offset = leadingEdgeOffset(origin, candidate, direction);
    if (offset < bestScore - EPSILON) {
      best = i;
      bestScore = offset;
    }
  }
  if (best !== null) return best;

  // Pass 2 — clear of the origin.
  bestScore = Infinity;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (!isBeyond(origin, candidate, direction)) continue;
    const score = navigationDistance(origin, candidate, direction);
    if (score < bestScore - EPSILON) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}
