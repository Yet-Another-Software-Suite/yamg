"use client"

import { useEffect, useRef, useState, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RefreshCw, ChevronUp, ChevronDown } from "lucide-react"
import type { FormValues } from "@/lib/types"
import type { ControlsBaseSim } from "@/lib/simulation/controls-base-sim"
import { ArmSim } from "@/lib/simulation/arm-sim"
import { ElevatorSim } from "@/lib/simulation/elevator-sim"

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
      let sim: ControlsBaseSim | null = null
      const canvas = canvasRef.current

      switch (formValues.mechanismType) {
        case "Arm":
          sim = new ArmSim(canvas, {
            length: formValues.armParams?.length || 1.0,
            mass: formValues.armParams?.mass || 5.0,
            motorCount: 1,
            gearing: formValues.gearRatio,
            motorType: getMotorType(formValues.motorType),
            minAngle:
              formValues.armParams?.hardLimitMin !== undefined
                ? (Math.PI * formValues.armParams.hardLimitMin) / 180
                : -Math.PI / 2,
            maxAngle:
              formValues.armParams?.hardLimitMax !== undefined
                ? (Math.PI * formValues.armParams.hardLimitMax) / 180
                : Math.PI / 2,
            startingAngle:
              formValues.armParams?.startingPosition !== undefined
                ? (Math.PI * formValues.armParams.startingPosition) / 180
                : 0,
            kP: formValues.pidValues.kP,
            kI: formValues.pidValues.kI,
            kD: formValues.pidValues.kD,
            kS: formValues.feedforward?.kS || 0,
            kV: formValues.feedforward?.kV || 0,
            kA: formValues.feedforward?.kA || 0,
            kG: formValues.feedforward?.kG || 0,
          })

          // Set initial target value for slider
          setTargetValue(formValues.armParams?.startingPosition || 0)
          break

        case "Elevator":
          sim = new ElevatorSim(canvas, {
            mass: formValues.elevatorParams?.mass || 5.0,
            drumRadius: formValues.elevatorParams?.drumRadius || 0.0254,
            motorCount: 1,
            gearing: formValues.gearRatio,
            motorType: getMotorType(formValues.motorType),
            minHeight: formValues.elevatorParams?.hardLimitMin || 0,
            maxHeight: formValues.elevatorParams?.hardLimitMax || 1.0,
            startingHeight: formValues.elevatorParams?.startingHeight || 0,
            kP: formValues.pidValues.kP,
            kI: formValues.pidValues.kI,
            kD: formValues.pidValues.kD,
            kS: formValues.feedforward?.kS || 0,
            kV: formValues.feedforward?.kV || 0,
            kA: formValues.feedforward?.kA || 0,
            kG: formValues.feedforward?.kG || 0,
          })

          // Set initial target value for slider
          setTargetValue(formValues.elevatorParams?.startingHeight || 0)
          break

        case "Pivot":
          // For pivot, we'll use the arm simulation with different parameters
          sim = new ArmSim(canvas, {
            length: 0.3, // Short arm for pivot visualization
            mass: 2.0,
            motorCount: 1,
            gearing: formValues.gearRatio,
            motorType: getMotorType(formValues.motorType),
            minAngle: -Math.PI / 2,
            maxAngle: Math.PI / 2,
            startingAngle: 0,
            kP: formValues.pidValues.kP,
            kI: formValues.pidValues.kI,
            kD: formValues.pidValues.kD,
            kS: formValues.feedforward?.kS || 0,
            kV: formValues.feedforward?.kV || 0,
            kA: formValues.feedforward?.kA || 0,
            kG: 0, // No gravity compensation for pivot
          })

          // Set initial target value for slider
          setTargetValue(0)
          break
      }

      if (sim) {
        sim.setControlMode(simType)
        sim.draw() // Initial draw
        setSimInstance(sim)
        setError(null)
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

  // Helper function to map motor types to WPILib motor types
  const getMotorType = (motorType: string) => {
    switch (motorType) {
      case "NEO":
        return "NEO"
      case "NEO550":
        return "NEO550"
      case "Krakenx60":
        return "KrakenX60"
      case "Krakenx40":
        return "KrakenX40"
      case "Minion":
        return "Falcon500" // Closest approximation
      default:
        return "NEO"
    }
  }

  const toggleSimulation = () => {
    // When starting the simulation, ensure we have a valid target
    if (!isRunning && simInstance) {
      // Set the target based on the current slider value
      if (simType === "position") {
        if (formValues.mechanismType === "Arm" || formValues.mechanismType === "Pivot") {
          simInstance.setTarget((targetValue * Math.PI) / 180)
        } else {
          simInstance.setTarget(targetValue)
        }
      } else {
        if (formValues.mechanismType === "Arm" || formValues.mechanismType === "Pivot") {
          simInstance.setTargetVelocity((targetValue * Math.PI) / 180)
        } else {
          simInstance.setTargetVelocity(targetValue)
        }
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
      if (formValues.mechanismType === "Arm") {
        setTargetValue(formValues.armParams?.startingPosition || 0)
      } else if (formValues.mechanismType === "Elevator") {
        setTargetValue(formValues.elevatorParams?.startingHeight || 0)
      } else {
        setTargetValue(0)
      }
    }
  }

  const handleTargetChange = (value: number[]) => {
    if (!simInstance) return

    const newTarget = value[0]
    setTargetValue(newTarget)

    try {
      if (simType === "position") {
        // Set position target based on mechanism type
        if (formValues.mechanismType === "Arm" || formValues.mechanismType === "Pivot") {
          // Convert degrees to radians for arm/pivot
          simInstance.setTarget((newTarget * Math.PI) / 180)
        } else {
          // Use meters directly for elevator
          simInstance.setTarget(newTarget)
        }
      } else {
        // Set velocity target based on mechanism type
        if (formValues.mechanismType === "Arm" || formValues.mechanismType === "Pivot") {
          // Convert degrees/s to radians/s for arm/pivot
          simInstance.setTargetVelocity((newTarget * Math.PI) / 180)
        } else {
          // Use m/s directly for elevator
          simInstance.setTargetVelocity(newTarget)
        }
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
  const getSliderRange = () => {
    if (simType === "position") {
      switch (formValues.mechanismType) {
        case "Arm":
          return {
            min: formValues.armParams?.hardLimitMin !== undefined ? formValues.armParams.hardLimitMin : -90,
            max: formValues.armParams?.hardLimitMax !== undefined ? formValues.armParams.hardLimitMax : 90,
            step: 1,
            unit: "°",
          }
        case "Elevator":
          return {
            min: formValues.elevatorParams?.hardLimitMin !== undefined ? formValues.elevatorParams.hardLimitMin : 0,
            max: formValues.elevatorParams?.hardLimitMax !== undefined ? formValues.elevatorParams.hardLimitMax : 1.0,
            step: 0.01,
            unit: "m",
          }
        case "Pivot":
          return {
            min: -90,
            max: 90,
            step: 1,
            unit: "°",
          }
        default:
          return { min: -1, max: 1, step: 0.1, unit: "" }
      }
    } else {
      // Velocity control
      switch (formValues.mechanismType) {
        case "Arm":
        case "Pivot":
          return {
            min: -90,
            max: 90,
            step: 1,
            unit: "°/s",
          }
        case "Elevator":
          return {
            min: -1,
            max: 1,
            step: 0.01,
            unit: "m/s",
          }
        default:
          return { min: -1, max: 1, step: 0.1, unit: "" }
      }
    }
  }

  const sliderRange = getSliderRange()

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
