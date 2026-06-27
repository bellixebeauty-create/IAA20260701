"use client"

import { BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ModelGuideCard() {
  return (
    <Card className="border-border/70 bg-muted/20">
      <CardHeader className="gap-0.5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BookOpen className="size-3.5" />
          </span>
          <CardTitle className="text-sm font-semibold">模型解释与操作说明</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 pt-0 text-xs leading-relaxed text-muted-foreground sm:grid-cols-3">
        <div>
          <p className="mb-1 font-medium text-foreground">模型原理</p>
          <p>本工具采用移动应用海外发行标准的幂函数长尾产出拟合算法。</p>
        </div>
        <div>
          <p className="mb-1 font-medium text-foreground">数据定义说明</p>
          <p>
            Day 0 指购买当日；Day 1、Day 3、Day 7 等均指除去当日后的第 N 日单日（非累计）变现回收流水。请严格按照分日大盘流水录入。
          </p>
        </div>
        <div>
          <p className="mb-1 font-medium text-foreground">操作说明</p>
          <p>
            请填写买量成本与首日变现表现，并尽可能多地补充后续断点日期的当日分日流水。提供的数据点越多，D30/D90
            的长尾回收预测越精准。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
