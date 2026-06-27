"use client"

import { cn } from "@/lib/utils"
import { CATEGORY_LIST, type AppCategory } from "@/lib/roi"

type CategorySelectorProps = {
  value: AppCategory
  onChange: (category: AppCategory) => void
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">应用品类模型</p>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
        {CATEGORY_LIST.map((cat) => {
          const active = value === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={cn(
                "flex min-w-0 flex-1 flex-col rounded-md border px-3 py-2 text-left transition-colors sm:min-w-[160px]",
                active
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold leading-snug",
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {cat.label}
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {cat.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
