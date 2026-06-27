"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, type RoiResults } from "@/lib/roi"

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  const cumulativeRoi = point?.cumulativeRoi ?? 0
  const cumulativeRevenue = point?.cumulativeRevenue ?? 0
  const isForecast = point?.day > point?.maxActualDataDay
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">
        Day {label}
        {isForecast && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">（长尾预测）</span>
        )}
      </p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">累计收入</span>
          <span className="font-medium tabular-nums text-popover-foreground">
            {formatCurrency(cumulativeRevenue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">累计 ROI</span>
          <span
            className={`font-medium tabular-nums ${cumulativeRoi >= 100 ? "text-positive" : "text-popover-foreground"}`}
          >
            {cumulativeRoi.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}

export function LtvChart({ results }: { results: RoiResults }) {
  const chartData = results.chartData.map((d) => ({
    ...d,
    maxActualDataDay: results.maxActualDataDay,
  }))

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-1 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">累计 ROI 预测曲线（D0 – D90）</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: "var(--color-chart-1)" }} />
              实际表现 D0–D{results.maxActualDataDay}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-5 rounded-full border-t-2 border-dashed"
                style={{ borderColor: "var(--color-chart-2)" }}
              />
              长尾预测趋势
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-destructive" />
              回本线 100%
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Day 0 起累计 ROI；实线为已录入锚点覆盖区间，D{results.maxActualDataDay + 1}–D90
          为品类先验约束下的长尾预测
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                ticks={[0, 15, 30, 45, 60, 75, 90]}
                tickFormatter={(v) => `D${v}`}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
              <ReferenceLine
                y={100}
                stroke="var(--color-destructive)"
                strokeWidth={2}
                label={{
                  value: "100%",
                  position: "insideTopRight",
                  fill: "var(--color-destructive)",
                  fontSize: 10,
                }}
              />
              {results.paybackDays !== -1 && results.paybackDays <= 90 && (
                <ReferenceLine
                  x={Math.round(results.paybackDays)}
                  stroke="var(--color-positive)"
                  strokeDasharray="4 4"
                  label={{
                    value: "回收点",
                    position: "insideTopLeft",
                    fill: "var(--color-positive)",
                    fontSize: 10,
                  }}
                />
              )}
              <ReferenceLine
                x={results.maxActualDataDay}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="2 4"
                strokeOpacity={0.5}
              />
              <Line
                type="natural"
                dataKey="cumulativeRoiActual"
                name="实际表现"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="natural"
                dataKey="cumulativeRoiForecast"
                name="长尾预测趋势"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
