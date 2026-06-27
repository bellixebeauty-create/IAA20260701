"use client"

import { ArrowLeft, Calculator, FileBarChart, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import { CategorySelector } from "@/components/category-selector"
import { InputForm } from "@/components/input-form"
import { LtvChart } from "@/components/ltv-chart"
import { ModelGuideCard } from "@/components/model-guide-card"
import { SummaryCards } from "@/components/summary-cards"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  buildSortedRevenueAnchors,
  calculateRoi,
  defaultInputs,
  getNextAvailableStandardDay,
  type AppCategory,
  type RoiInputs,
} from "@/lib/roi"

type BaseFieldKey = "users" | "totalCost" | "d0Roi" | "d1Revenue" | "d3Revenue" | "d7Revenue"

function createCustomPoint(inputs: RoiInputs) {
  return {
    id: crypto.randomUUID(),
    day: getNextAvailableStandardDay(inputs),
    isCustomDayEntry: false,
    revenue: 0,
  }
}

function findFirstFreeDay(inputs: RoiInputs, excludeId?: string): number {
  const used = new Set([1, 3, 7])
  for (const row of inputs.customRevenues) {
    if (row.id !== excludeId) used.add(Math.floor(row.day))
  }
  for (let d = 2; d <= 90; d++) {
    if (!used.has(d)) return d
  }
  return 12
}

export function Dashboard() {
  const [inputs, setInputs] = useState<RoiInputs>(defaultInputs)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const results = useMemo(() => calculateRoi(inputs), [inputs])

  function handleChange(key: BaseFieldKey, value: number) {
    setInputs((prev) => ({ ...prev, [key]: Number.isNaN(value) ? 0 : value }))
  }

  function handleCategoryChange(category: AppCategory) {
    setInputs((prev) => ({ ...prev, category }))
  }

  function handleAddCustom() {
    setInputs((prev) => ({
      ...prev,
      customRevenues: [...prev.customRevenues, createCustomPoint(prev)],
    }))
  }

  function handleRemoveCustom(id: string) {
    setInputs((prev) => ({
      ...prev,
      customRevenues: prev.customRevenues.filter((c) => c.id !== id),
    }))
  }

  function handleStandardDayChange(id: string, day: number) {
    setInputs((prev) => ({
      ...prev,
      customRevenues: prev.customRevenues.map((c) =>
        c.id === id ? { ...c, day, isCustomDayEntry: false } : c,
      ),
    }))
  }

  function handleCustomDayEntryChange(id: string, day: number) {
    setInputs((prev) => ({
      ...prev,
      customRevenues: prev.customRevenues.map((c) =>
        c.id === id ? { ...c, day, isCustomDayEntry: true } : c,
      ),
    }))
  }

  function handleCustomModeChange(id: string, isCustomDayEntry: boolean) {
    setInputs((prev) => ({
      ...prev,
      customRevenues: prev.customRevenues.map((c) => {
        if (c.id !== id) return c
        if (isCustomDayEntry) {
          return { ...c, isCustomDayEntry: true, day: findFirstFreeDay(prev, id) }
        }
        return {
          ...c,
          isCustomDayEntry: false,
          day: getNextAvailableStandardDay({
            ...prev,
            customRevenues: prev.customRevenues.filter((r) => r.id !== id),
          }),
        }
      }),
    }))
  }

  function handleCustomRevenueChange(id: string, revenue: number) {
    setInputs((prev) => ({
      ...prev,
      customRevenues: prev.customRevenues.map((c) =>
        c.id === id ? { ...c, revenue: Number.isNaN(revenue) ? 0 : revenue } : c,
      ),
    }))
  }

  function handleSubmit() {
    buildSortedRevenueAnchors(inputs)
    console.log("Trigger Interstitial Ad Slot")
    setIsSubmitted(true)
  }

  function handleBack() {
    setIsSubmitted(false)
  }

  function handleReset() {
    setInputs(defaultInputs)
    setIsSubmitted(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calculator className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">IAA ROI 回收计算器</h1>
              <p className="text-sm text-muted-foreground">
                {isSubmitted ? "变现回收报告" : "填写买量数据 · 幂函数长尾拟合"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSubmitted && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="size-4" />
                返回修改数据
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-4" />
              重置
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {!isSubmitted ? (
          <div className="flex flex-col gap-3">
            <CategorySelector value={inputs.category} onChange={handleCategoryChange} />

            <InputForm
              inputs={inputs}
              onChange={handleChange}
              onAddCustom={handleAddCustom}
              onRemoveCustom={handleRemoveCustom}
              onStandardDayChange={handleStandardDayChange}
              onCustomDayEntryChange={handleCustomDayEntryChange}
              onCustomModeChange={handleCustomModeChange}
              onCustomRevenueChange={handleCustomRevenueChange}
            />

            <Button size="lg" className="h-10 w-full text-sm shadow-md" onClick={handleSubmit}>
              <FileBarChart className="size-4" />
              生成变现回收报告
            </Button>

            <ModelGuideCard />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <SummaryCards results={results} />
            <LtvChart results={results} />
          </div>
        )}
      </div>
    </div>
  )
}
