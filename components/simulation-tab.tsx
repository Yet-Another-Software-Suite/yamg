"use client";

import type React from "react";

import { JSX, useLayoutEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormValues } from "@/lib/types";
import dynamic from "next/dynamic";

// Dynamically import simulation components with no SSR
const SimulationComponent = dynamic(
  () => import("@/components/simulation-component"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3">Loading simulation...</p>
      </div>
    ),
  },
);

// Add error handling for the simulation component
function SimulationErrorBoundary({ children }: { children: JSX.Element }) {
  const [hasError, setHasError] = useState(false);

  useLayoutEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (
        args[0]?.includes?.("ResizeObserver loop") ||
        (typeof args[0] === "string" && args[0].includes("ResizeObserver loop"))
      ) {
        return;
      }
      setHasError(true);
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  if (hasError) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
        <p className="font-semibold">Warning:</p>
        <p>
          The simulation encountered a rendering issue. This doesn't affect
          functionality.
        </p>
        <button
          className="mt-2 px-4 py-2 bg-yellow-200 hover:bg-yellow-300 rounded-md"
          onClick={() => setHasError(false)}
        >
          Try Again
        </button>
      </div>
    );
  }

  return children;
}

interface SimulationTabProps {
  formValues: FormValues;
}

export default function SimulationTab({ formValues }: SimulationTabProps) {
  const [simType, setSimType] = useState<string>("position");
  const [motorCount, setMotorCount] = useState<number>(1);

  // Safe number input handler
  const handleMotorCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setMotorCount(1);
    } else {
      const numValue = Number.parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 4) {
        setMotorCount(numValue);
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-zinc-800">
        <CardTitle>Mechanism Simulation</CardTitle>
      </CardHeader>
      <CardContent className="bg-zinc-800">
        <div className="space-y-4">
          <Tabs defaultValue="position" onValueChange={setSimType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="position">Position Control</TabsTrigger>
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
              value={motorCount}
              onChange={handleMotorCountChange}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              Number of motors in the gearbox (1-4)
            </span>
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
  );
}
