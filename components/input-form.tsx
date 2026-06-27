"use client"

import { Megaphone, Plus, Trash2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { NumericInput } from "@/components/numeric-input"
import {
  CUSTOM_DAY_SENTINEL,
  formatCurrency,
  getD0Revenue,
  isDayDisabledInDropdown,
  isDropdownDisabledDay,
  STANDARD_CUSTOM_DAY_OPTIONS,
  type CustomRevenuePoint,
  type RoiInputs,
} from "@/lib/roi"

type BaseFieldKey = "users" | "totalCost" | "d0Roi" | "d1Revenue" | "d3Revenue" | "d7Revenue"

type InputFormProps = {
  inputs: RoiInputs
  onChange: (key: BaseFieldKey, value: number) => void
  onAddCustom: () => void
  onRemoveCustom: (id: string) => void
  onStandardDayChange: (id: string, day: number) => void
  onCustomDayEntryChange: (id: string, day: number) => void
  onCustomModeChange: (id: string, isCustomDayEntry: boolean) => void
  onCustomRevenueChange: (id: string, revenue: number) => void
}

const baseFields: {
  key: "users" | "totalCost" | "d0Roi"
  label: string
  prefix?: string
  suffix?: string
}[] = [
  { key: "users", label: "当日下载用户" },
  { key: "totalCost", label: "总成本", prefix: "$" },
  { key: "d0Roi", label: "Day 0 ROI（购买当日）", suffix: "%" },
]

const fixedRevenueFields: {
  key: "d1Revenue" | "d3Revenue" | "d7Revenue"
  label: string
  hint: string
}[] = [
  { key: "d1Revenue", label: "Day 1 当日收入", hint: "购买后第 1 日（次日）" },
  { key: "d3Revenue", label: "Day 3 当日收入", hint: "购买后第 3 日" },
  { key: "d7Revenue", label: "Day 7 当日收入", hint: "购买后第 7 日" },
]

function CustomRevenueRow({
  point,
  usedDays,
  onStandardDayChange,
  onCustomDayEntryChange,
  onCustomModeChange,
  onRevenueChange,
  onRemove,
}: {
  point: CustomRevenuePoint
  usedDays: Set<number>
  onStandardDayChange: (day: number) => void
  onCustomDayEntryChange: (day: number) => void
  onCustomModeChange: (isCustomDayEntry: boolean) => void
  onRevenueChange: (revenue: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex min-w-[128px] flex-1 flex-col gap-1">
        <Label className="text-xs font-medium text-muted-foreground">断点天数</Label>
        {point.isCustomDayEntry ? (
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                D
              </span>
              <NumericInput
                value={point.day}
                onValueChange={(v) =>
                  onCustomDayEntryChange(Math.max(1, Math.min(90, Math.floor(v))))
                }
                className="pl-6"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="shrink-0 px-2 text-[11px]"
              onClick={() => onCustomModeChange(false)}
            >
              标准
            </Button>
          </div>
        ) : (
          <select
            value={String(point.day)}
            onChange={(e) => {
              const val = e.target.value
              if (val === CUSTOM_DAY_SENTINEL) {
                onCustomModeChange(true)
              } else {
                onStandardDayChange(Number(val))
              }
            }}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {STANDARD_CUSTOM_DAY_OPTIONS.map((day) => {
              const disabled = isDayDisabledInDropdown(day, usedDays, point.day)
              const suffix = isDropdownDisabledDay(day)
                ? "（固定输入）"
                : disabled && day !== point.day
                  ? "（已占用）"
                  : ""
              return (
                <option key={day} value={day} disabled={disabled}>
                  Day {day}
                  {suffix}
                </option>
              )
            })}
            <option value={CUSTOM_DAY_SENTINEL}>自定义天数...</option>
          </select>
        )}
      </div>
      <div className="flex min-w-[140px] flex-[2] flex-col gap-1">
        <Label className="text-xs font-medium text-muted-foreground">当日收入</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <NumericInput
            value={point.revenue}
            onValueChange={onRevenueChange}
            className="pl-7"
          />
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label="删除">
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    </div>
  )
}

export function InputForm({
  inputs,
  onChange,
  onAddCustom,
  onRemoveCustom,
  onStandardDayChange,
  onCustomDayEntryChange,
  onCustomModeChange,
  onCustomRevenueChange,
}: InputFormProps) {
  const usedDays = new Set(inputs.customRevenues.map((c) => Math.floor(c.day)))
  const d0Revenue = getD0Revenue(inputs)

  return (
    <div className="grid gap-3 md:grid-cols-2 md:items-start">
      <Card className="border-border/70">
        <CardHeader className="gap-0.5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Megaphone className="size-3.5" />
            </span>
            <CardTitle className="text-sm font-semibold">买量基础数据</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">当日下载用户、总成本与 Day 0 ROI</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 px-4 pb-4 pt-0">
          {baseFields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <Label htmlFor={field.key} className="text-xs font-medium text-muted-foreground">
                {field.label}
              </Label>
              <div className="relative">
                {field.prefix && (
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {field.prefix}
                  </span>
                )}
                <NumericInput
                  id={field.key}
                  value={inputs[field.key]}
                  onValueChange={(v) => onChange(field.key, v)}
                  className={field.prefix ? "pl-7" : field.suffix ? "pr-7" : undefined}
                />
                {field.suffix && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {field.suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="mt-1 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">Day 0 当日累计回收（自动计算）</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(d0Revenue)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="gap-0.5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <TrendingUp className="size-3.5" />
            </span>
            <CardTitle className="text-sm font-semibold">分日买量收入</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            除去购买当日后第 N 日单日回收流水（非累计）
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 px-4 pb-4 pt-0">
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {fixedRevenueFields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1">
                <Label htmlFor={field.key} className="text-xs font-medium text-muted-foreground">
                  {field.label}
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <NumericInput
                    id={field.key}
                    value={inputs[field.key]}
                    onValueChange={(v) => onChange(field.key, v)}
                    className="pl-7"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{field.hint}</span>
              </div>
            ))}
          </div>

          {inputs.customRevenues.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border/70 pt-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                扩展断点收入
              </span>
              {inputs.customRevenues.map((point) => (
                <CustomRevenueRow
                  key={point.id}
                  point={point}
                  usedDays={usedDays}
                  onStandardDayChange={(day) => onStandardDayChange(point.id, day)}
                  onCustomDayEntryChange={(day) => onCustomDayEntryChange(point.id, day)}
                  onCustomModeChange={(isCustom) => onCustomModeChange(point.id, isCustom)}
                  onRevenueChange={(revenue) => onCustomRevenueChange(point.id, revenue)}
                  onRemove={() => onRemoveCustom(point.id)}
                />
              ))}
            </div>
          )}

          <Button type="button" variant="outline" size="sm" onClick={onAddCustom} className="h-8 w-full">
            <Plus className="size-3.5" />
            + 添加自定义天数收入
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
