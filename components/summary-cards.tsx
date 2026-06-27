"use client"

import { CalendarClock, Coins, Percent, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatPaybackDays, type RoiResults } from "@/lib/roi"

function MilestoneCell({ label, value }: { label: string; value: number }) {
  const recovered = value >= 100
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-2.5 py-2">
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
      <span
        className={`text-lg font-bold tabular-nums leading-none ${recovered ? "text-positive" : "text-foreground"}`}
      >
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

export function SummaryCards({ results }: { results: RoiResults }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="relative overflow-hidden border-border/70">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <CardContent className="flex flex-col gap-1 px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">CPI：单次下载成本</span>
            <Coins className="size-4 text-primary" />
          </div>
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatCurrency(results.cpi)}
          </span>
          <p className="text-xs text-muted-foreground">
            Day 0 累计 {formatCurrency(results.d0Revenue)} · ROI {results.d0CumulativeRoi.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-border/70">
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-1 ${results.paybackDays === -1 ? "bg-destructive" : "bg-positive"}`}
        />
        <CardContent className="flex flex-col gap-1 px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">预测回收天数</span>
            <CalendarClock
              className={`size-4 ${results.paybackDays === -1 ? "text-destructive" : "text-positive"}`}
            />
          </div>
          <span
            className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${
              results.paybackDays === -1 ? "text-destructive" : "text-foreground"
            }`}
          >
            {formatPaybackDays(results.paybackDays)}
          </span>
          <p className="text-xs text-muted-foreground">累计 ROI 首次 ≥ 100% · 含 D0 基石</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-border/70 sm:col-span-2 lg:col-span-1">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-chart-1" />
        <CardContent className="flex flex-col gap-2 px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">节点累计 ROI</span>
            <Percent className="size-4 text-chart-1" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.milestoneRois.map((m) => (
              <MilestoneCell key={m.day} label={`D${m.day}`} value={m.cumulativeRoi} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 sm:col-span-2">
        <CardContent className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <TrendingUp className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold tabular-nums text-foreground">
                D30 {results.cumulativeRoiD30.toFixed(1)}% · D90 {results.cumulativeRoiD90.toFixed(1)}%
              </span>
              <span className="text-[11px] text-muted-foreground">
                {results.categoryLabel} · {results.fitPointCount} 个锚点 · 实线至 D
                {results.maxActualDataDay}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
