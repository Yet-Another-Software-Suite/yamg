"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calculator, Loader2 } from "lucide-react";
import {
  getReCalcUrl,
  isReCalcSupported,
  type ReCalcResults,
} from "@/lib/recalc-integration";

interface ReCalcIntegrationProps {
  formValues: any;
  motorCount?: number;
  onValuesCalculated?: (values: ReCalcResults) => void;
}

export default function ReCalcIntegration({
  formValues,
  motorCount = 1,
}: ReCalcIntegrationProps) {
  // Check if ReCalc is supported for this mechanism
  if (!isReCalcSupported(formValues.mechanismType)) {
    return null;
  }

  const handleOpenReCalc = () => {
    const url = getReCalcUrl(formValues, motorCount);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const mechanismName = formValues.mechanismType === "Arm" ? "arm" : "elevator";

  return (
    <div className="col-span-2 space-y-3 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        <span className="text-sm font-medium">ReCalc Integration</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Auto-calculate feedforward values using ReCalc's {mechanismName}{" "}
        calculator
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenReCalc}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open ReCalc
        </Button>
      </div>
    </div>
  );
}
