"use client"

import { Lightbulb, Loader2, Sparkles } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type AiDiagnosis, type RoiInputs, type RoiResults } from "@/lib/roi"

export function AiInsights({ inputs, results }: { inputs: RoiInputs; results: RoiResults }) {
  const [loading, setLoading] = useState(false)
  const [diagnosis, setDiagnosis] = useState<AiDiagnosis | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setDiagnosis(null)
    setError(null)

    try {
      const response = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, results }),
      })

      if (!response.ok) {
        throw new Error("诊断请求失败")
      }

      const data = (await response.json()) as AiDiagnosis & { error?: string }
      setDiagnosis({ recommendations: data.recommendations, source: data.source })
      if (data.error) {
        setError("大模型不可用，已使用本地规则引擎生成建议")
      }
    } catch {
      setError("生成诊断失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <CardTitle className="text-base">AI 智能诊断意见</CardTitle>
          </div>
          <Button onClick={handleGenerate} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                分析中…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                生成诊断建议
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          基于分日收入锚点与累计 ROI 走势，输出可执行的商业化调优建议。
        </p>
      </CardHeader>
      <CardContent>
        {!diagnosis && !loading && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <Sparkles className="size-6 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              点击「生成诊断建议」，系统将组装买量成本、分日收入与回本预测上下文，发送至大模型进行分析。
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3" aria-hidden>
            <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-16 w-full animate-pulse rounded bg-muted" />
          </div>
        )}

        {diagnosis && !loading && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                {diagnosis.source === "ai" ? "AI 生成" : "规则引擎"}
              </Badge>
              {error && <span className="text-xs text-muted-foreground">{error}</span>}
            </div>

            <div className="flex flex-col gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">商业化调优建议</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {diagnosis.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
