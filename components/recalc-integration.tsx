"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Calculator, Loader2 } from "lucide-react"
import { fetchReCalcResults, getReCalcUrl, isReCalcSupported, type ReCalcResults } from "@/lib/recalc-integration"

interface ReCalcIntegrationProps {
  formValues: any
  motorCount?: number
  onValuesCalculated: (values: ReCalcResults) => void
}

export default function ReCalcIntegration({ formValues, motorCount = 1, onValuesCalculated }: ReCalcIntegrationProps) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculatedValues, setCalculatedValues] = useState<ReCalcResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if ReCalc is supported for this mechanism
  if (!isReCalcSupported(formValues.mechanismType)) {
    return null
  }

  const handleAutoCalculate = async () => {
    setIsCalculating(true)
    setError(null)

    try {
      const url = getReCalcUrl(formValues, motorCount)
      if (!url) {
        throw new Error("Could not generate ReCalc URL")
      }

      const results = await fetchReCalcResults(url)
      if (results && Object.keys(results).length > 0) {
        setCalculatedValues(results)
        onValuesCalculated(results)
      } else {
        throw new Error("No values calculated")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleOpenReCalc = () => {
    const url = getReCalcUrl(formValues, motorCount)
    if (url) {
      window.open(url, "_blank")
    }
  }

  const mechanismName = formValues.mechanismType === "Arm" ? "arm" : "elevator"

  return (
    <div className="col-span-2 space-y-3 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        <span className="text-sm font-medium">ReCalc Integration</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Auto-calculate feedforward values using ReCalc's {mechanismName} calculator
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleAutoCalculate} disabled={isCalculating}>
          {isCalculating ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="h-3 w-3 mr-1" />
              Auto-Calculate
            </>
          )}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={handleOpenReCalc}>
          <ExternalLink className="h-3 w-3 mr-1" />
          Open ReCalc
        </Button>
      </div>

      {error && <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">Error: {error}</div>}

      {calculatedValues && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Calculated Values:</p>
          <div className="flex flex-wrap gap-1">
            {calculatedValues.kG !== undefined && (
              <Badge variant="secondary" className="text-xs">
                kG: {calculatedValues.kG.toFixed(4)}
              </Badge>
            )}
            {calculatedValues.kV !== undefined && (
              <Badge variant="secondary" className="text-xs">
                kV: {calculatedValues.kV.toFixed(4)}
              </Badge>
            )}
            {calculatedValues.kA !== undefined && (
              <Badge variant="secondary" className="text-xs">
                kA: {calculatedValues.kA.toFixed(4)}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
