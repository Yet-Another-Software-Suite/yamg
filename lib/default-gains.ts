import type { FormValues } from "./types";

type PidValues = FormValues["pidValues"];

/**
 * The PID gains each mechanism starts with. They are firm on purpose, so a kP of 50 reads as normal:
 * an elevator's are in volts per meter, an arm's, pivot's and turret's in volts per rotation, and a
 * flywheel's in volts per rotation per second. In YAMG's sim, each settles the default mechanism
 * quickly without overshoot.
 */
export const DEFAULT_PID: Record<FormValues["mechanismType"], PidValues> = {
  Elevator: { kP: 50, kI: 0, kD: 0 },
  Arm: { kP: 150, kI: 0, kD: 30 },
  Pivot: { kP: 50, kI: 0, kD: 20 },
  Turret: { kP: 50, kI: 0, kD: 20 },
  Flywheel: { kP: 5, kI: 0, kD: 0 },
};

/**
 * The gear ratio each mechanism starts with: enough reduction for one motor to lift the default arm,
 * and none for a flywheel, so it can spin past 3000 RPM.
 */
export const DEFAULT_GEAR_RATIO: Record<FormValues["mechanismType"], number> = {
  Elevator: 15,
  Arm: 60,
  Pivot: 15,
  Turret: 15,
  Flywheel: 1,
};

/**
 * The gear ratio to use after the mechanism type changes from `from` to `to`: that mechanism's
 * default while the ratio is still the old mechanism's, or the ratio as it is once edited.
 */
export function gearRatioForMechanism(gearRatio: number, from: FormValues["mechanismType"], to: FormValues["mechanismType"]): number {
  return gearRatio === DEFAULT_GEAR_RATIO[from] ? DEFAULT_GEAR_RATIO[to] : gearRatio;
}

/**
 * The gains to use after the mechanism type changes from `from` to `to`: that mechanism's defaults
 * while the gains are still the old mechanism's defaults, or the gains as they are once edited.
 */
export function pidForMechanism(pid: PidValues, from: FormValues["mechanismType"], to: FormValues["mechanismType"]): PidValues {
  const old = DEFAULT_PID[from];
  const untouched = old !== undefined && pid.kP === old.kP && pid.kI === old.kI && pid.kD === old.kD;
  return untouched ? { ...DEFAULT_PID[to] } : pid;
}
