"use client"

import type React from "react"

import { useEffect, useLayoutEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FormValues } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TriangleAlert } from "lucide-react"
import { holdingTorqueWarning } from "@/lib/simulation/holding-torque"
import dynamic from "next/dynamic"

// Dynamically import simulation components with no SSR
const SimulationComponent = dynamic(() => import("@/components/simulation-component"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="ml-3">Loading simulation...</p>
    </div>
  ),
})

// Add error handling for the simulation component
function SimulationErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false)

  useLayoutEffect(() => {
    const originalError = console.error
    console.error = (...args) => {
      if (
        args[0]?.includes?.("ResizeObserver loop") ||
        (typeof args[0] === "string" && args[0].includes("ResizeObserver loop"))
      ) {
        return
      }
      setHasError(true)
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  if (hasError) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
        <p className="font-semibold">Warning:</p>
        <p>The simulation encountered a rendering issue. This doesn't affect functionality.</p>
        <button
          className="mt-2 px-4 py-2 bg-yellow-200 hover:bg-yellow-300 rounded-md"
          onClick={() => setHasError(false)}
        >
          Try Again
        </button>
      </div>
    )
  }

  return children
}

interface SimulationTabProps {
  formValues: FormValues
}

export default function SimulationTab({ formValues }: SimulationTabProps) {
  const isVelocityOnly = formValues.mechanismType === "Flywheel"
  const [simType, setSimType] = useState<string>(isVelocityOnly ? "velocity" : "position")
  const [motorCount, setMotorCount] = useState<number>(1)
  // What is typed in the motor count while it has focus, or null to show the motor count.
  const [motorCountText, setMotorCountText] = useState<string | null>(null)

  // Flywheels have no meaningful position mode - force velocity control
  useEffect(() => {
    if (isVelocityOnly && simType !== "velocity") {
      setSimType("velocity")
    }
  }, [isVelocityOnly, simType])

  const holdingWarning = holdingTorqueWarning(formValues, motorCount)

  // Safe number input handler
  const handleMotorCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMotorCountText(value)
    const numValue = Number.parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 4) {
      setMotorCount(numValue)
    }
  }

  const handleMotorCountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) {
      // A phone cannot select a number field's text, so clear it for the new count. Leaving it
      // empty keeps the old one.
      setMotorCountText("")
    } else {
      // Select the whole number, so typing replaces it.
      e.currentTarget.select()
    }
  }


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mechanism Simulation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* A heads up that the motors can't hold the load. The simulation still runs, to show it. */}
          {holdingWarning && (
            <Alert className="border-amber-500/50 bg-amber-500/10 [&>svg]:text-amber-500">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>The motors can&apos;t hold this load</AlertTitle>
              <AlertDescription>{holdingWarning}</AlertDescription>
            </Alert>
          )}
          <Tabs value={simType} onValueChange={setSimType}>
            <TabsList className={`grid w-full ${isVelocityOnly ? "grid-cols-1" : "grid-cols-2"}`}>
              {!isVelocityOnly && <TabsTrigger value="position">Position Control</TabsTrigger>}
              <TabsTrigger value="velocity">Velocity Control</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
            <Label htmlFor="motorCount" className="whitespace-nowrap">
              Motor Count:
            </Label>
            <Input
              id="motorCount"
              type="number"
              min="1"
              max="4"
              inputMode="numeric"
              value={motorCountText ?? motorCount}
              onChange={handleMotorCountChange}
              onFocus={handleMotorCountFocus}
              // The click keeps the selection that the mouse would otherwise drop.
              onClick={(e) => {
                if (!window.matchMedia("(pointer: coarse)").matches) e.currentTarget.select()
              }}
              // Show the motor count again, which an empty or invalid entry left unchanged.
              onBlur={() => {
                if (motorCountText !== null) setMotorCountText(null)
              }}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">Number of motors in the gearbox (1-4)</span>
          </div>

          <SimulationErrorBoundary>
            <SimulationComponent
              formValues={formValues}
              simType={simType}
              motorCount={motorCount}
              key={`${formValues.mechanismType}-${formValues.motorType}-${formValues.gearRatio}-${JSON.stringify(formValues.pidValues)}-${motorCount}-${Date.now()}`}
            />
          </SimulationErrorBoundary>
        </div>
      </CardContent>
    </Card>
  )
}
