export type AppCategory = "short_drama" | "utility" | "casual_games"

export const HORIZON = 90

/** Light-touch tail decay reference only — never overrides anchor data. */
export const CATEGORY_TAIL_B: Record<AppCategory, number> = {
  short_drama: -0.62,
  utility: -0.18,
  casual_games: -0.38,
}

/** Category nudge weight on tail exponent only (≤ 15%). */
const CATEGORY_BLEND = 0.12

export type PowerTailParams = {
  a: number
  b: number
  c: number
  bEmpirical: number
  bCategory: number
}

export type DailyCurveResult = {
  daily: number[]
  cumulative: number[]
  maxAnchorDay: number
  tailParams: PowerTailParams
  junctionSlope: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Fritsch–Carlson monotone PCHIP slopes. */
function computePchipSlopes(days: number[], values: number[]): number[] {
  const n = days.length
  const slopes = new Array<number>(n).fill(0)

  if (n === 1) return slopes

  const h: number[] = []
  const delta: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const hi = days[i + 1] - days[i]
    h.push(hi)
    delta.push(hi > 0 ? (values[i + 1] - values[i]) / hi : 0)
  }

  slopes[0] = delta[0]
  slopes[n - 1] = delta[n - 2]

  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      slopes[i] = 0
    } else {
      const w1 = 2 * h[i] + h[i - 1]
      const w2 = h[i] + 2 * h[i - 1]
      slopes[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i])
    }
  }

  return slopes
}

function findSegment(days: number[], day: number): number {
  let i = 0
  while (i < days.length - 2 && day > days[i + 1]) i++
  return i
}

/** Evaluate PCHIP interpolant at integer day. */
function pchipEval(days: number[], values: number[], slopes: number[], day: number): number {
  if (days.length === 1) return values[0]

  const x = clamp(day, days[0], days[days.length - 1])
  const i = findSegment(days, x)
  const h = days[i + 1] - days[i]
  if (h <= 0) return values[i]

  const t = (x - days[i]) / h
  const t2 = t * t
  const t3 = t2 * t

  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2

  return h00 * values[i] + h10 * h * slopes[i] + h01 * values[i + 1] + h11 * h * slopes[i + 1]
}

/** First derivative of PCHIP at `day` (C¹ tail junction). */
function pchipDerivative(days: number[], values: number[], slopes: number[], day: number): number {
  if (days.length === 1) return 0

  const x = clamp(day, days[0], days[days.length - 1])
  const i = findSegment(days, x)
  const h = days[i + 1] - days[i]
  if (h <= 0) return 0

  const t = (x - days[i]) / h
  const t2 = t * t

  const dh00 = 6 * t2 - 6 * t
  const dh10 = 3 * t2 - 4 * t + 1
  const dh01 = -6 * t2 + 6 * t
  const dh11 = 3 * t2 - 2 * t

  const dydt = dh00 * values[i] + dh10 * h * slopes[i] + dh01 * values[i + 1] + dh11 * h * slopes[i + 1]
  return dydt / h
}

function estimateDecayExponent(days: number[], values: number[]): number {
  for (let i = days.length - 1; i >= 1; i--) {
    const y1 = values[i - 1]
    const y2 = values[i]
    const x1 = days[i - 1]
    const x2 = days[i]
    if (y1 > 0 && y2 > 0 && x2 > x1) {
      return Math.log(y2 / y1) / Math.log((x2 + 1) / (x1 + 1))
    }
  }
  return -0.25
}

function evalTail(day: number, p: PowerTailParams): number {
  return p.a * Math.pow(day + 1, p.b) + p.c
}

/**
 * Fit Y = a·(X+1)^b + c for tail with C¹ continuity at junction M.
 * Category only nudges b (~12%); a,c from value + derivative constraints.
 */
function fitTailParams(
  junctionDay: number,
  junctionValue: number,
  junctionSlope: number,
  category: AppCategory,
  anchorDays: number[],
  anchorValues: number[],
): PowerTailParams {
  const bEmpirical = estimateDecayExponent(anchorDays, anchorValues)
  const bCategory = CATEGORY_TAIL_B[category]
  let b = (1 - CATEGORY_BLEND) * bEmpirical + CATEGORY_BLEND * bCategory
  b = clamp(b, -0.9, 0.05)

  const M = junctionDay
  const yM = Math.max(0, junctionValue)
  const slopeM = junctionSlope

  if (Math.abs(b) < 1e-6) b = -0.05

  let a: number
  let c: number
  const denom = b * Math.pow(M + 1, b - 1)

  if (Math.abs(denom) > 1e-9) {
    a = slopeM / denom
    c = yM - a * Math.pow(M + 1, b)
  } else {
    a = yM / Math.pow(M + 1, b)
    c = 0
  }

  if (c < 0) {
    c = 0
    a = yM / Math.pow(M + 1, b)
  }
  if (a < 0) {
    a = Math.max(0, yM * 0.01)
    c = Math.max(0, yM - a * Math.pow(M + 1, b))
  }

  return { a, b, c, bEmpirical, bCategory }
}

function buildCumulative(daily: number[]): number[] {
  const cumulative: number[] = []
  let sum = 0
  for (let d = 0; d < daily.length; d++) {
    sum += daily[d] ?? 0
    cumulative[d] = sum
  }
  return cumulative
}

/**
 * Smooth daily curve: PCHIP on [0,M] through exact anchors; C¹ power tail on (M,90].
 */
export function buildSmoothDailyCurve(
  anchors: Map<number, number>,
  category: AppCategory,
  horizon = HORIZON,
): DailyCurveResult {
  const anchorDays = Array.from(anchors.keys()).sort((a, b) => a - b)
  const anchorValues = anchorDays.map((d) => anchors.get(d)!)
  const maxAnchorDay = anchorDays[anchorDays.length - 1] ?? 0

  const slopes = computePchipSlopes(anchorDays, anchorValues)
  const daily: number[] = new Array(horizon + 1).fill(0)

  for (let d = 0; d <= maxAnchorDay; d++) {
    daily[d] = pchipEval(anchorDays, anchorValues, slopes, d)
  }

  for (const [day, value] of anchors) {
    daily[day] = value
  }

  for (let d = 0; d <= maxAnchorDay; d++) {
    daily[d] = Math.max(0, daily[d])
  }

  const junctionValue = daily[maxAnchorDay]
  const junctionSlope = pchipDerivative(anchorDays, anchorValues, slopes, maxAnchorDay)
  const tailParams = fitTailParams(
    maxAnchorDay,
    junctionValue,
    junctionSlope,
    category,
    anchorDays,
    anchorValues,
  )

  for (let d = maxAnchorDay + 1; d <= horizon; d++) {
    daily[d] = Math.max(0, evalTail(d, tailParams))
  }

  let cumulative = buildCumulative(daily)

  for (let d = 1; d <= horizon; d++) {
    if (cumulative[d] <= cumulative[d - 1]) {
      daily[d] = Math.max(daily[d], 1e-6)
      cumulative[d] = cumulative[d - 1] + daily[d]
    }
  }

  return {
    daily,
    cumulative,
    maxAnchorDay,
    tailParams,
    junctionSlope,
  }
}

export function cumulativeRoiPct(cumulativeRevenue: number, totalCost: number): number {
  if (totalCost <= 0) return 0
  return (cumulativeRevenue / totalCost) * 100
}
