import {
  buildSmoothDailyCurve,
  cumulativeRoiPct,
  HORIZON,
  type AppCategory as MathAppCategory,
} from "@/lib/math"

/** Standard breakpoint options in the dynamic-row dropdown (ordered). */
export const STANDARD_CUSTOM_DAY_OPTIONS = [
  1, 2, 3, 7, 10, 14, 18, 20, 25, 30, 35, 40, 45, 60,
] as const

/** Fixed base fields — shown disabled in the dynamic-row dropdown. */
export const DROPDOWN_DISABLED_DAYS = [1, 3, 7] as const

export const CUSTOM_DAY_SENTINEL = "__custom__" as const

/** @deprecated Use STANDARD_CUSTOM_DAY_OPTIONS */
export const ALL_DAY_OPTIONS = STANDARD_CUSTOM_DAY_OPTIONS
export type DayOption = (typeof STANDARD_CUSTOM_DAY_OPTIONS)[number]

/** Days captured by fixed inputs above (includes D0). */
export const FIXED_INPUT_DAYS: readonly number[] = [0, 1, 3, 7]

export type RevenueAnchor = { day: number; income: number }

export type CustomRevenuePoint = {
  id: string
  day: number
  /** When true, user typed an arbitrary day via "自定义天数..." */
  isCustomDayEntry: boolean
  revenue: number
}

export type AppCategory = MathAppCategory

export type CategoryPrior = {
  id: AppCategory
  label: string
  description: string
}

export const CATEGORY_PRIORS: Record<AppCategory, CategoryPrior> = {
  short_drama: {
    id: "short_drama",
    label: "短剧/网文 (Short Drama)",
    description: "头部高爆发，长尾极陡峭衰减",
  },
  utility: {
    id: "utility",
    label: "系统工具 (Utility)",
    description: "长尾极其平稳，LTV 弱幂函数缓慢爬坡",
  },
  casual_games: {
    id: "casual_games",
    label: "休闲游戏 (Casual Games)",
    description: "中期受关卡或新活动影响有留存韧性",
  },
}

export const CATEGORY_LIST = Object.values(CATEGORY_PRIORS)

export type RoiInputs = {
  category: AppCategory
  users: number
  totalCost: number
  d0Roi: number
  d1Revenue: number
  d3Revenue: number
  d7Revenue: number
  customRevenues: CustomRevenuePoint[]
}

export const defaultInputs: RoiInputs = {
  category: "casual_games",
  users: 10000,
  totalCost: 15000,
  d0Roi: 35,
  d1Revenue: 3800,
  d3Revenue: 4200,
  d7Revenue: 3100,
  customRevenues: [],
}

type Point = { x: number; y: number }

/** Day 0 cumulative recovery = purchase-day total revenue. */
export function getD0Revenue(inputs: RoiInputs): number {
  return inputs.totalCost * (inputs.d0Roi / 100)
}

/**
 * Merge fixed nodes, standard dropdown rows, and custom day rows into a sorted clean dataset.
 * Filters empty revenue rows; dedupes by day (last entry wins).
 */
export function buildSortedRevenueAnchors(inputs: RoiInputs): RevenueAnchor[] {
  const entries: RevenueAnchor[] = [{ day: 0, income: getD0Revenue(inputs) }]

  const fixed: { day: number; revenue: number }[] = [
    { day: 1, revenue: inputs.d1Revenue },
    { day: 3, revenue: inputs.d3Revenue },
    { day: 7, revenue: inputs.d7Revenue },
  ]

  for (const { day, revenue } of fixed) {
    if (revenue > 0 && Number.isFinite(revenue)) {
      entries.push({ day, income: revenue })
    }
  }

  for (const custom of inputs.customRevenues) {
    const day = Math.floor(custom.day)
    if (
      day >= 1 &&
      day <= HORIZON &&
      custom.revenue > 0 &&
      Number.isFinite(custom.revenue)
    ) {
      entries.push({ day, income: custom.revenue })
    }
  }

  const byDay = new Map<number, number>()
  for (const { day, income } of entries) {
    byDay.set(day, income)
  }

  return Array.from(byDay.entries())
    .map(([day, income]) => ({ day, income }))
    .sort((a, b) => a.day - b.day)
}

/**
 * Known **daily** revenue at anchor days — built from the unified sorted pipeline.
 */
export function collectDailyAnchors(inputs: RoiInputs): Map<number, number> {
  return new Map(buildSortedRevenueAnchors(inputs).map(({ day, income }) => [day, income]))
}

/** Maximum day with user-supplied anchor data (includes Day 0). */
export function getMaxActualDataDay(inputs: RoiInputs): number {
  const anchors = collectDailyAnchors(inputs)
  return Math.max(0, ...anchors.keys())
}

/** Fit points for diagnostics — X=0 is always Day 0 daily revenue. */
export function collectRevenuePoints(inputs: RoiInputs): Point[] {
  const anchors = collectDailyAnchors(inputs)
  return Array.from(anchors.entries())
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => a.x - b.x)
}

/** Sum of daily revenues from Day 0 through `day` (inclusive). */
export function cumulativeRevenueAtDay(dailyRevenues: number[], day: number): number {
  let cumulative = 0
  for (let t = 0; t <= day; t++) {
    cumulative += dailyRevenues[t] ?? 0
  }
  return cumulative
}

function cumulativeRoiAtDay(dailyRevenues: number[], day: number, totalCost: number): number {
  return cumulativeRoiPct(cumulativeRevenueAtDay(dailyRevenues, day), totalCost)
}

/** Returns payback day with one decimal, or -1 if not recovered within 90 days. */
export function calculatePaybackDays(dailyRevenues: number[], totalCost: number): number {
  if (totalCost <= 0) return -1

  let prevRoi = 0

  for (let day = 0; day <= HORIZON; day++) {
    const cumulative = cumulativeRevenueAtDay(dailyRevenues, day)
    const cumulativeRoi = cumulativeRoiPct(cumulative, totalCost)

    if (cumulativeRoi >= 100) {
      if (day === 0) return 0
      const delta = cumulativeRoi - prevRoi
      if (delta <= 0) return day
      const fraction = (100 - prevRoi) / delta
      return Math.round((day - 1 + fraction) * 10) / 10
    }

    prevRoi = cumulativeRoi
  }

  return -1
}

export function getMilestoneDays(inputs: RoiInputs): number[] {
  const days = new Set<number>([0, 1, 3, 7, 30, 90])
  for (const { day } of buildSortedRevenueAnchors(inputs)) {
    days.add(day)
  }
  return Array.from(days).sort((a, b) => a - b)
}

export function getUsedCustomRowDays(inputs: RoiInputs): Set<number> {
  return new Set(inputs.customRevenues.map((c) => Math.floor(c.day)))
}

export function isDropdownDisabledDay(day: number): boolean {
  return (DROPDOWN_DISABLED_DAYS as readonly number[]).includes(day)
}

export function isDayDisabledInDropdown(day: number, usedDays: Set<number>, currentDay?: number): boolean {
  if (isDropdownDisabledDay(day)) return true
  return usedDays.has(day) && day !== currentDay
}

/** First unused standard dropdown day (skips fixed 1/3/7). */
export function getNextAvailableStandardDay(inputs: RoiInputs): number {
  const used = getUsedCustomRowDays(inputs)
  used.add(1)
  used.add(3)
  used.add(7)

  const available = STANDARD_CUSTOM_DAY_OPTIONS.find((d) => !used.has(d))
  if (available !== undefined) return available

  for (let d = 2; d <= HORIZON; d++) {
    if (!used.has(d)) return d
  }
  return 2
}

export type MilestoneRoi = { day: number; cumulativeRoi: number; cumulativeRevenue: number }

export type ChartDataPoint = {
  day: number
  cumulativeRoi: number
  cumulativeRevenue: number
  cumulativeRoiActual: number | null
  cumulativeRoiForecast: number | null
}

export type RoiResults = {
  cpi: number
  d0Revenue: number
  d0CumulativeRoi: number
  paybackDays: number
  cumulativeRoiD30: number
  cumulativeRoiD90: number
  maxActualDataDay: number
  category: AppCategory
  categoryLabel: string
  milestoneRois: MilestoneRoi[]
  dailyRevenues: number[]
  chartData: ChartDataPoint[]
  revenueFit: { a: number; b: number; c: number; bEmpirical: number; bCategory: number }
  fitPointCount: number
}

export function calculateRoi(inputs: RoiInputs): RoiResults {
  const cpi = inputs.users > 0 ? inputs.totalCost / inputs.users : 0
  const d0Revenue = getD0Revenue(inputs)
  const d0CumulativeRoi = cumulativeRoiPct(d0Revenue, inputs.totalCost)

  const anchors = collectDailyAnchors(inputs)
  const fitPoints = collectRevenuePoints(inputs)
  const curve = buildSmoothDailyCurve(anchors, inputs.category, HORIZON)

  const dailyRevenues = curve.daily
  const maxActualDataDay = curve.maxAnchorDay

  const paybackDays = calculatePaybackDays(dailyRevenues, inputs.totalCost)
  const cumulativeRoiD30 = cumulativeRoiAtDay(dailyRevenues, 30, inputs.totalCost)
  const cumulativeRoiD90 = cumulativeRoiAtDay(dailyRevenues, HORIZON, inputs.totalCost)

  const milestoneRois = getMilestoneDays(inputs).map((day) => {
    const cumulativeRevenue = curve.cumulative[day] ?? cumulativeRevenueAtDay(dailyRevenues, day)
    return {
      day,
      cumulativeRevenue,
      cumulativeRoi: cumulativeRoiPct(cumulativeRevenue, inputs.totalCost),
    }
  })

  const chartData: ChartDataPoint[] = Array.from({ length: HORIZON + 1 }, (_, day) => {
    const cumulativeRevenue = curve.cumulative[day] ?? 0
    const cumulativeRoi = cumulativeRoiPct(cumulativeRevenue, inputs.totalCost)
    const roi = Number(cumulativeRoi.toFixed(4))
    return {
      day,
      cumulativeRevenue: Number(cumulativeRevenue.toFixed(2)),
      cumulativeRoi: roi,
      cumulativeRoiActual: day <= maxActualDataDay ? roi : null,
      cumulativeRoiForecast: day >= maxActualDataDay ? roi : null,
    }
  })

  const { tailParams } = curve

  return {
    cpi,
    d0Revenue,
    d0CumulativeRoi,
    paybackDays,
    cumulativeRoiD30,
    cumulativeRoiD90,
    maxActualDataDay,
    category: inputs.category,
    categoryLabel: CATEGORY_PRIORS[inputs.category].label,
    milestoneRois,
    dailyRevenues,
    chartData,
    revenueFit: {
      a: tailParams.a,
      b: tailParams.b,
      c: tailParams.c,
      bEmpirical: tailParams.bEmpirical,
      bCategory: tailParams.bCategory,
    },
    fitPointCount: fitPoints.length,
  }
}

/** @deprecated Use `cpi` — kept for API compatibility */
export function getCacFromResults(results: RoiResults): number {
  return results.cpi
}

export function formatCurrency(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatPaybackDays(paybackDays: number): string {
  if (paybackDays === -1) return "90天内无法回收"
  return `${paybackDays}天`
}

export function buildAiDiagnosisContext(inputs: RoiInputs, results: RoiResults): string {
  const paybackLabel =
    results.paybackDays === -1 ? "90天内无法回收" : `${results.paybackDays}天`

  const anchorSummary = collectRevenuePoints(inputs)
    .map((p) => (p.x === 0 ? `D0 累计 $${p.y.toFixed(0)}` : `D${p.x} 单日 $${p.y.toFixed(0)}`))
    .join(", ")

  const milestoneSummary = results.milestoneRois
    .map((m) => `D${m.day} ${m.cumulativeRoi.toFixed(1)}%`)
    .join(", ")

  return `【诊断数据上下文】
- 品类模型: ${results.categoryLabel}
- 当日下载用户: ${inputs.users}, 总成本: ${inputs.totalCost} (CPI: ${results.cpi.toFixed(2)})
- Day 0 累计 ROI: ${results.d0CumulativeRoi.toFixed(1)}% (Day 0 收入 $${results.d0Revenue.toFixed(0)})
- 拟合锚点: ${anchorSummary}
- 节点累计 ROI: ${milestoneSummary}
- 预测回本天数: ${paybackLabel}
- 拟合数据点: ${results.fitPointCount} 个

【分析策略诊断要求】
作为冷酷、精准的商业化专家，请基于幂函数长尾拟合曲线与累计 ROI 走势，输出 3 条一针见血、具有极高可操作性的 IAA 商业化调优建议（买量成本、Early-Day 变现密度、长尾回收节奏）。`
}

export type AiDiagnosis = {
  recommendations: string[]
  source: "ai" | "fallback"
}

export function generateFallbackDiagnosis(_inputs: RoiInputs, results: RoiResults): AiDiagnosis {
  const recommendations: string[] = []

  if (results.paybackDays === -1) {
    recommendations.push(
      `当前模型预测 90 天内累计 ROI 无法达到 100%（D90 累计 ROI 约 ${results.cumulativeRoiD90.toFixed(1)}%）：优先压低 CPI（当前 ${formatCurrency(results.cpi)}）或提升 D0-D7 单日收入密度。`,
    )
  } else if (results.paybackDays > 30) {
    const d7 = results.milestoneRois.find((m) => m.day === 7)
    recommendations.push(
      `预测回本 ${results.paybackDays} 天，现金回收偏慢：强化 D1-D7 激励视频与高 eCPM 插屏埋点，目标将 D7 累计 ROI 从 ${d7?.cumulativeRoi.toFixed(1) ?? "—"}% 再抬升 15-20 个百分点。`,
    )
  }

  const d1 = results.milestoneRois.find((m) => m.day === 1)
  const d7 = results.milestoneRois.find((m) => m.day === 7)
  if (d1 && d7 && d7.cumulativeRoi - d1.cumulativeRoi < 15) {
    recommendations.push(
      "D1 到 D7 累计 ROI 增幅偏缓：检查 D2-D5 的广告场景覆盖与频控策略，避免核心玩法期变现真空。",
    )
  }

  if (results.fitPointCount <= 4) {
    recommendations.push(
      `长尾预测已采用 PCHIP 保真历史段 + 品类微调幂律尾；建议补充 D14/D20/D30 实测分日流水以进一步校准。`,
    )
  }

  if (recommendations.length < 3) {
    const summary = results.milestoneRois.map((m) => `D${m.day} ${m.cumulativeRoi.toFixed(1)}%`).join(" / ")
    recommendations.push(
      `节点累计 ROI（${summary}）：建立分 cohort 的 DAU×ARPU 双轴监控，每周对比实际曲线是否偏离预测。`,
    )
  }

  return {
    recommendations: recommendations.slice(0, 3),
    source: "fallback",
  }
}
