"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import type { FormValues } from "@/lib/types";
import type { ControlsBaseSim } from "@/lib/simulation/controls-base-sim";
import { ArmSim } from "@/lib/simulation/arm-sim";
import { ElevatorSim } from "@/lib/simulation/elevator-sim";
import {
  createSimulationOptions,
  getSliderRangeConfig,
  convertTargetValue,
} from "@/lib/simulation/simulation-config";

// Add this function right after the imports but before the component definition
function suppressResizeObserverErrors() {
  // This suppresses the specific ResizeObserver error
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      args[0]?.includes?.("ResizeObserver loop") ||
      (typeof args[0] === "string" && args[0].includes("ResizeObserver loop"))
    ) {
      // Ignore ResizeObserver loop errors
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

interface SimulationComponentProps {
  formValues: FormValues;
  simType: string;
  motorCount: number;
}

export default function SimulationComponent({
  formValues,
  simType,
  motorCount,
}: SimulationComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [simInstance, setSimInstance] = useState<ControlsBaseSim | null>(null);
  const animationRef = useRef<number | null>(null);
  const [targetValue, setTargetValue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Store the latest form values and motor count for reset functionality
  const latestFormValuesRef = useRef(formValues);
  const latestMotorCountRef = useRef(motorCount);

  // Update refs when props change
  useEffect(() => {
    latestFormValuesRef.current = formValues;
    latestMotorCountRef.current = motorCount;
  }, [formValues, motorCount]);

  // Add this hook inside the SimulationComponent function, near the top after the state declarations
  useLayoutEffect(() => {
    suppressResizeObserverErrors();

    // Clean up
    return () => {
      console.error = console.error;
    };
  }, []);

  // Function to create/recreate simulation instance
  const createSimulationInstance = (useLatestValues = false) => {
    if (!canvasRef.current) return null;

    try {
      const canvas = canvasRef.current;
      const currentFormValues = useLatestValues
        ? latestFormValuesRef.current
        : formValues;
      const currentMotorCount = useLatestValues
        ? latestMotorCountRef.current
        : motorCount;

      const { simType: simClassName, options } = createSimulationOptions(
        currentFormValues,
        canvas,
        currentMotorCount,
      );

      let sim: ControlsBaseSim | null = null;

      // Create the appropriate simulation instance
      if (simClassName === "ArmSim") {
        sim = new ArmSim(canvas, options);
      } else if (simClassName === "ElevatorSim") {
        sim = new ElevatorSim(canvas, options);
      }

      if (sim) {
        sim.setControlMode(simType);
        sim.draw(); // Initial draw
        setError(null);

        // Set initial target value
        const sliderConfig = getSliderRangeConfig(currentFormValues, simType);
        setTargetValue(sliderConfig.initialValue);

        console.log(
          "Created simulation instance with motor count:",
          currentMotorCount,
        );
        return sim;
      }
    } catch (error) {
      console.error("Error creating simulation:", error);
      setError(
        `Failed to create simulation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return null;
  };

  // Initialize simulation
  useEffect(() => {
    const sim = createSimulationInstance();
    if (sim) {
      setSimInstance(sim);
    }
  }, [formValues, simType, motorCount]);

  // Fix the animation loop to ensure consistent updates
  // Replace the entire animation loop useEffect with this improved version
  // Handle animation loop
  useEffect(() => {
    if (!simInstance) return;

    // Animation function that gets called repeatedly
    const animate = () => {
      // Update simulation with fixed time step for consistent physics
      simInstance.update(0.02); // 20ms fixed time step

      // Draw the updated state
      simInstance.draw();

      // Continue the animation loop
      if (isRunning) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Start or stop the animation loop based on isRunning state
    if (isRunning) {
      console.log("Starting animation loop");
      // Start the animation loop
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      console.log("Stopping animation loop");
      // Stop the animation loop
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Clean up when component unmounts or dependencies change
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isRunning, simInstance]);

  // Update control mode when simType changes
  useEffect(() => {
    if (simInstance) {
      simInstance.setControlMode(simType);
    }
  }, [simType, simInstance]);

  const toggleSimulation = () => {
    // When starting the simulation, ensure we have a valid target
    if (!isRunning && simInstance) {
      // Set the target based on the current slider value
      if (simType === "position") {
        simInstance.setTarget(
          convertTargetValue(targetValue, formValues, simType),
        );
      } else {
        simInstance.setTargetVelocity(
          convertTargetValue(targetValue, formValues, simType),
        );
      }

      // Force an initial update to get things moving
      simInstance.update(0.02);
      simInstance.draw();

      console.log("Starting simulation with target:", targetValue);
    }

    setIsRunning((prev) => !prev);
  };

  const resetSimulation = () => {
    // Stop the simulation if it's running
    setIsRunning(false);

    // Create a new simulation instance with the latest form values
    const newSim = createSimulationInstance(true);
    if (newSim) {
      setSimInstance(newSim);

      // Reset target value to initial position based on latest form values
      const sliderConfig = getSliderRangeConfig(
        latestFormValuesRef.current,
        simType,
      );
      setTargetValue(sliderConfig.initialValue);

      console.log(
        "Reset simulation with latest form values and motor count:",
        latestMotorCountRef.current,
      );
    }
  };

  const handleTargetChange = (value: number[]) => {
    if (!simInstance) return;

    const newTarget = value[0];
    setTargetValue(newTarget);

    try {
      if (simType === "position") {
        simInstance.setTarget(
          convertTargetValue(newTarget, formValues, simType),
        );
      } else {
        simInstance.setTargetVelocity(
          convertTargetValue(newTarget, formValues, simType),
        );
      }

      // Redraw if not running
      if (!isRunning) {
        simInstance.draw();
      }
    } catch (error) {
      console.error("Error setting target:", error);
    }
  };

  // Get min/max values for slider based on mechanism type
  const sliderRange = getSliderRangeConfig(formValues, simType);

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded-md">
        <p className="font-semibold">Error:</p>
        <p>{error}</p>
      </div>
    );
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
          onClick={() =>
            handleTargetChange([
              Math.max(sliderRange.min, targetValue - sliderRange.step),
            ])
          }
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
          onClick={() =>
            handleTargetChange([
              Math.min(sliderRange.max, targetValue + sliderRange.step),
            ])
          }
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
          {isRunning ? (
            <Pause className="mr-2 h-4 w-4" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isRunning ? "Pause" : "Run"}
        </Button>
        <Button onClick={resetSimulation} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mt-4">
        <p>
          This simulation uses the WPILib controls simulation library to
          visualize mechanism behavior.
        </p>
        <p>
          The simulation parameters are derived from your form inputs and motor
          count ({motorCount} motor
          {motorCount !== 1 ? "s" : ""}).
        </p>
        <p>
          Use the slider to adjust the target{" "}
          {simType === "position" ? "position" : "velocity"}.
        </p>
        <p>
          <strong>Reset button</strong> applies all latest changes from the main
          form.
        </p>
      </div>
    </div>
  );
}
