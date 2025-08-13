import { getSimMotorType } from "@/lib/config/hardware-config";
import type { FormValues } from "@/lib/types";
import type { ArmSimOptions } from "./arm-sim";
import type { ElevatorSimOptions } from "./elevator-sim";
import type { ControlsBaseSimOptions } from "./controls-base-sim";

/**
 * Creates simulation options based on form values
 * This centralizes the configuration for all simulation types
 */
export function createSimulationOptions(
  formValues: FormValues,
  canvas: HTMLCanvasElement,
  motorCount = 1,
): { simType: string; options: ControlsBaseSimOptions } {
  // Common options for all simulation types
  const commonOptions: ControlsBaseSimOptions = {
    motorType: getSimMotorType(formValues.motorType),
    gearing: formValues.gearRatio,
    motorCount: motorCount,
    kP: formValues.pidValues.kP,
    kI: formValues.pidValues.kI,
    kD: formValues.pidValues.kD,
    kS: formValues.feedforward?.kS || 0,
    kV: formValues.feedforward?.kV || 0,
    kA: formValues.feedforward?.kA || 0,
    kG: formValues.feedforward?.kG || 0,
  };

  // Mechanism-specific options
  switch (formValues.mechanismType) {
    case "Arm": {
      // Convert mass from lbs to kg if needed
      let mass = formValues.armParams?.mass || 5.0;
      if (formValues.armParams?.massUnit === "lbs") {
        mass = mass * 0.453592; // Convert lbs to kg
      }

      const armOptions: ArmSimOptions = {
        ...commonOptions,
        length: formValues.armParams?.length || 1.0,
        mass: mass,
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
      };
      return { simType: "ArmSim", options: armOptions };
    }

    case "Elevator": {
      // Convert mass from lbs to kg if needed
      let mass = formValues.elevatorParams?.mass || 5.0;
      if (formValues.elevatorParams?.massUnit === "lbs") {
        mass = mass * 0.453592; // Convert lbs to kg
      }

      const elevatorOptions: ElevatorSimOptions = {
        ...commonOptions,
        mass: mass,
        drumRadius: formValues.elevatorParams?.drumRadius || 0.0254,
        minHeight: formValues.elevatorParams?.hardLimitMin || 0,
        maxHeight: formValues.elevatorParams?.hardLimitMax || 1.0,
        startingHeight: formValues.elevatorParams?.startingHeight || 0,
      };
      return { simType: "ElevatorSim", options: elevatorOptions };
    }

    case "Pivot": {
      // For pivot, we'll use the arm simulation with different parameters
      const pivotOptions: ArmSimOptions = {
        ...commonOptions,
        length: 0.3, // Short arm for pivot visualization
        mass: 2.0,
        minAngle: -Math.PI / 2,
        maxAngle: Math.PI / 2,
        startingAngle: 0,
        kG: 0, // No gravity compensation for pivot
      };
      return { simType: "ArmSim", options: pivotOptions };
    }

    default:
      throw new Error(`Unknown mechanism type: ${formValues.mechanismType}`);
  }
}

/**
 * Get slider range configuration for the simulation UI
 */
export function getSliderRangeConfig(formValues: FormValues, simType: string) {
  if (simType === "position") {
    switch (formValues.mechanismType) {
      case "Arm":
        return {
          min:
            formValues.armParams?.hardLimitMin !== undefined
              ? formValues.armParams.hardLimitMin
              : -90,
          max:
            formValues.armParams?.hardLimitMax !== undefined
              ? formValues.armParams.hardLimitMax
              : 90,
          step: 1,
          unit: "°",
          initialValue: formValues.armParams?.startingPosition || 0,
        };
      case "Elevator":
        return {
          min:
            formValues.elevatorParams?.hardLimitMin !== undefined
              ? formValues.elevatorParams.hardLimitMin
              : 0,
          max:
            formValues.elevatorParams?.hardLimitMax !== undefined
              ? formValues.elevatorParams.hardLimitMax
              : 1.0,
          step: 0.01,
          unit: "m",
          initialValue: formValues.elevatorParams?.startingHeight || 0,
        };
      case "Pivot":
        return {
          min: -90,
          max: 90,
          step: 1,
          unit: "°",
          initialValue: 0,
        };
      default:
        return { min: -1, max: 1, step: 0.1, unit: "", initialValue: 0 };
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
          initialValue: 0,
        };
      case "Elevator":
        return {
          min: -1,
          max: 1,
          step: 0.01,
          unit: "m/s",
          initialValue: 0,
        };
      default:
        return { min: -1, max: 1, step: 0.1, unit: "", initialValue: 0 };
    }
  }
}

/**
 * Convert UI target value to simulation target value
 */
export function convertTargetValue(
  value: number,
  formValues: FormValues,
  simType: string,
): number {
  if (simType === "position") {
    if (
      formValues.mechanismType === "Arm" ||
      formValues.mechanismType === "Pivot"
    ) {
      // Convert degrees to radians for arm/pivot
      return (value * Math.PI) / 180;
    } else {
      // Use meters directly for elevator
      return value;
    }
  } else {
    // Velocity control
    if (
      formValues.mechanismType === "Arm" ||
      formValues.mechanismType === "Pivot"
    ) {
      // Convert degrees/s to radians/s for arm/pivot
      return (value * Math.PI) / 180;
    } else {
      // Use m/s directly for elevator
      return value;
    }
  }
}
