"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type NumericInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: number
  onValueChange: (value: number) => void
  allowEmpty?: boolean
}

function normalizeNumericText(raw: string): string {
  if (raw === "" || raw === ".") return raw
  const parsed = parseFloat(raw)
  if (Number.isNaN(parsed)) return ""
  return String(parsed)
}

function parseNumericText(raw: string): number {
  if (raw === "" || raw === "." || raw === "-") return 0
  const parsed = parseFloat(raw)
  return Number.isNaN(parsed) ? 0 : parsed
}

/** Text-mode numeric input — avoids leading-zero artifacts from type="number". */
export function NumericInput({
  value,
  onValueChange,
  allowEmpty = true,
  className,
  onFocus,
  onBlur,
  ...props
}: NumericInputProps) {
  const [text, setText] = React.useState("")
  const [focused, setFocused] = React.useState(false)

  React.useEffect(() => {
    if (!focused) {
      if (value === 0 && allowEmpty) {
        setText("")
      } else {
        setText(String(value))
      }
    }
  }, [value, focused, allowEmpty])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!/^\d*\.?\d*$/.test(raw)) return
    setText(raw)
    onValueChange(parseNumericText(raw))
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false)
    const normalized = normalizeNumericText(text)
    if (normalized === "" || normalized === ".") {
      setText("")
      onValueChange(0)
    } else {
      const num = parseFloat(normalized)
      setText(String(num))
      onValueChange(num)
    }
    onBlur?.(e)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={handleBlur}
      className={cn("tabular-nums", className)}
    />
  )
}
