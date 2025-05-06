"use client"

import { useEffect, useRef, useState, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RefreshCw, ChevronUp, ChevronDown } from "lucide-react"
import type { FormValues } from "@/lib/types"
import type { ControlsBaseSim } from "@/lib/simulation/controls-base-sim"
import { ArmSim } from "@/lib/simulation/arm-sim"
import { ElevatorSim } from "@/lib/simulation/elevator-sim"
import { createSimulationOptions, getSliderRangeConfig, convertTargetValue } from "@/lib/simulation/simulation-config"

// Add this function right after the imports but before the component definition
function suppressResizeObserverErrors() {
  // This suppresses the specific ResizeObserver error
  const originalConsoleError = console.error
  console.error = (...args) => {
    if (
      args[0]?.includes?.("ResizeObserver loop") ||
      (typeof args[0] === "string" && args[0].includes("ResizeObserver loop"))
    ) {
      // Ignore ResizeObserver loop errors
      return
    }
    originalConsoleError.apply(console, args)
  }
}

// Then update the type reference in the props interface
interface SimulationComponentProps {
  formValues: FormValues
  simType: string
}

export default function SimulationComponent({ formValues, simType }: SimulationComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [simInstance, setSimInstance] = useState<ControlsBaseSim | null>(null)
  const animationRef = useRef<number | null>(null)
  const [targetValue, setTargetValue] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Add this hook inside the SimulationComponent function, near the top after the state declarations
  useLayoutEffect(() => {
    suppressResizeObserverErrors()

    // Clean up
    return () => {
      console.error = console.error
    }
  }, [])

  // Initialize simulation
  useEffect(() => {
    if (!canvasRef.current) return

    try {
      // Create simulation instance based on mechanism type
      const canvas = canvasRef.current
      const { simType: simClassName, options } = createSimulationOptions(formValues, canvas)

      let sim: ControlsBaseSim | null = null

      // Create the appropriate simulation instance
      if (simClassName === "ArmSim") {
        sim = new ArmSim(canvas, options)
      } else if (simClassName === "ElevatorSim") {
        sim = new ElevatorSim(canvas, options)
      }

      if (sim) {
        sim.setControlMode(simType)
        sim.draw() // Initial draw
        setSimInstance(sim)
        setError(null)

        // Set initial target value
        const sliderConfig = getSliderRangeConfig(formValues, simType)
        setTargetValue(sliderConfig.initialValue)
      }
    } catch (error) {
      console.error("Error initializing simulation:", error)
      setError(`Failed to initialize simulation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [formValues, simType])

  // Fix the animation loop to ensure consistent updates
  // Replace the entire animation loop useEffect with this improved version
  // Handle animation loop
  useEffect(() => {
    if (!simInstance) return

    // Animation function that gets called repeatedly
    const animate = () => {
      // Update simulation with fixed time step for consistent physics
      simInstance.update(0.02) // 20ms fixed time step

      // Draw the updated state
      simInstance.draw()

      // Continue the animation loop
      if (isRunning) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    // Start or stop the animation loop based on isRunning state
    if (isRunning) {
      console.log("Starting animation loop")
      // Start the animation loop
      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      console.log("Stopping animation loop")
      // Stop the animation loop
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    // Clean up when component unmounts or dependencies change
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isRunning, simInstance])

  // Update control mode when simType changes
  useEffect(() => {
    if (simInstance) {
      simInstance.setControlMode(simType)
    }
  }, [simType, simInstance])

  const toggleSimulation = () => {
    // When starting the simulation, ensure we have a valid target
    if (!isRunning && simInstance) {
      // Set the target based on the current slider value
      if (simType === "position") {
        simInstance.setTarget(convertTargetValue(targetValue, formValues, simType))
      } else {
        simInstance.setTargetVelocity(convertTargetValue(targetValue, formValues, simType))
      }

      // Force an initial update to get things moving
      simInstance.update(0.02)
      simInstance.draw()

      console.log("Starting simulation with target:", targetValue)
    }

    setIsRunning((prev) => !prev)
  }

  const resetSimulation = () => {
    if (simInstance) {
      simInstance.reset()
      simInstance.draw()

      // Reset target value to initial position
      const sliderConfig = getSliderRangeConfig(formValues, simType)
      setTargetValue(sliderConfig.initialValue)
    }
  }

  const handleTargetChange = (value: number[]) => {
    if (!simInstance) return

    const newTarget = value[0]
    setTargetValue(newTarget)

    try {
      if (simType === "position") {
        simInstance.setTarget(convertTargetValue(newTarget, formValues, simType))
      } else {
        simInstance.setTargetVelocity(convertTargetValue(newTarget, formValues, simType))
      }

      // Redraw if not running
      if (!isRunning) {
        simInstance.draw()
      }
    } catch (error) {
      console.error("Error setting target:", error)
    }
  }

  // Get min/max values for slider based on mechanism type
  const sliderRange = getSliderRangeConfig(formValues, simType)

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded-md">
        <p className="font-semibold">Error:</p>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="border border-gray-300 rounded-md bg-slate-800 w-full max-w-[600px] h-auto"
        ></canvas>
      </div>

      <div className="flex items-center space-x-4 py-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleTargetChange([Math.max(sliderRange.min, targetValue - sliderRange.step)])}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <Slider
            value={[targetValue]}
            min={sliderRange.min}
            max={sliderRange.max}
            step={sliderRange.step}
            onValueChange={handleTargetChange}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => handleTargetChange([Math.min(sliderRange.max, targetValue + sliderRange.step)])}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>

        <div className="w-20 text-center">
          {targetValue.toFixed(2)}
          {sliderRange.unit}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <Button onClick={toggleSimulation}>
          {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isRunning ? "Pause" : "Run"}
        </Button>
        <Button onClick={resetSimulation} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mt-4">
        <p>This simulation uses the WPILib controls simulation library to visualize mechanism behavior.</p>
        <p>The simulation parameters are derived from your form inputs.</p>
        <p>Use the slider to adjust the target {simType === "position" ? "position" : "velocity"}.</p>
      </div>
    </div>
  )
}
