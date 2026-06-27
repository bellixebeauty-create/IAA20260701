import { buildAiDiagnosisContext, generateFallbackDiagnosis, type RoiInputs, type RoiResults } from "@/lib/roi"
import { NextResponse } from "next/server"

type DiagnosisRequest = {
  inputs: RoiInputs
  results: RoiResults
}

function parseRecommendations(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\d\-•*.、)\]]+\s*/, "").trim())
    .filter((line) => line.length > 10)

  if (lines.length >= 3) return lines.slice(0, 3)
  return lines
}

export async function POST(request: Request) {
  let body: DiagnosisRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { inputs, results } = body
  if (!inputs || !results) {
    return NextResponse.json({ error: "Missing inputs or results" }, { status: 400 })
  }

  const context = buildAiDiagnosisContext(inputs, results)
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    const fallback = generateFallbackDiagnosis(inputs, results)
    return NextResponse.json({ ...fallback, context })
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "你是一位冷酷、精准的全球移动应用 IAA 商业化专家。请用中文输出，每条建议独立成行，不要编号前缀以外的废话。",
          },
          { role: "user", content: context },
        ],
      }),
    })

    if (!response.ok) {
      const fallback = generateFallbackDiagnosis(inputs, results)
      return NextResponse.json({ ...fallback, context, error: "LLM request failed" })
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content ?? ""
    const recommendations = parseRecommendations(content)

    if (recommendations.length === 0) {
      const fallback = generateFallbackDiagnosis(inputs, results)
      return NextResponse.json({ ...fallback, context })
    }

    return NextResponse.json({
      recommendations,
      source: "ai" as const,
      context,
    })
  } catch {
    const fallback = generateFallbackDiagnosis(inputs, results)
    return NextResponse.json({ ...fallback, context, error: "LLM unavailable" })
  }
}
