import type { FormValues } from "./types";

type ElevatorParams = NonNullable<FormValues["elevatorParams"]>;

/** The pitch of the roller chains FRC robots use. */
export const CHAIN_PITCH_INCHES = { "25": 0.25, "35": 0.375 } as const;

/** How an elevator's drive turns into carriage travel. */
export interface ElevatorDrive {
  /** What the gearbox output turns: a drum, a chain sprocket or a belt pulley. */
  kind: "drum" | "chain" | "belt";
  /** How far the chain, belt or rope moves for one turn of the output, in meters. */
  circumferenceMeters: number;
  /** How many times as far the carriage moves as the chain, belt or rope: the cascade stages, or 1. */
  stages: number;
  /** How far the carriage moves for one turn of the output, in meters. */
  travelPerRotationMeters: number;
  /** The drum radius that gives the same travel, for simulations that take a radius. */
  effectiveRadiusMeters: number;
  /** Java for the circumference, as a WPILib Distance, and the unit it uses. */
  circumferenceJava: string;
  circumferenceUnit: "Meters" | "Inches" | "Millimeters";
  /** Java for the chain or belt pitch, and the tooth count. Not set for a drum. */
  pitchJava?: string;
  teeth?: number;
  /** Words for the circumference, for a comment in the generated code. */
  description: string;
}

/**
 * Work out an elevator's travel per turn. A chain moves one pitch per sprocket tooth and a belt one
 * pitch per pulley tooth, so their circumference is the pitch times the teeth. In a cascade, each
 * stage moves as far again as the one before it, so the carriage moves the stage count times as far.
 */
export function elevatorDrive(params: ElevatorParams | undefined): ElevatorDrive {
  const p = params ?? {};
  const kind = p.driveType ?? "drum";
  const stages = p.cascade ? Math.max(1, Math.round(p.cascadeStages ?? 2)) : 1;
  const teeth = Math.max(1, Math.round(p.sprocketTeeth ?? 22));

  let circumferenceMeters: number;
  let circumferenceJava: string;
  let circumferenceUnit: ElevatorDrive["circumferenceUnit"];
  let description: string;
  let pitchJava: string | undefined;
  if (kind === "chain") {
    const pitch = p.chainPitch ?? "25";
    const inches = CHAIN_PITCH_INCHES[pitch];
    circumferenceMeters = inches * 0.0254 * teeth;
    pitchJava = `Inches.of(${inches})`;
    circumferenceJava = `${pitchJava}.times(${teeth})`;
    circumferenceUnit = "Inches";
    description = `a ${teeth} tooth sprocket on #${pitch} chain, which moves ${inches} in per tooth`;
  } else if (kind === "belt") {
    const pitchMm = p.beltPitchMm ?? 5;
    circumferenceMeters = (pitchMm / 1000) * teeth;
    pitchJava = `Millimeters.of(${pitchMm})`;
    circumferenceJava = `${pitchJava}.times(${teeth})`;
    circumferenceUnit = "Millimeters";
    description = `a ${teeth} tooth pulley on ${pitchMm} mm pitch belt, which moves ${pitchMm} mm per tooth`;
  } else {
    const radius = p.drumRadius ?? 0.0254;
    circumferenceMeters = 2 * Math.PI * radius;
    circumferenceJava = `Meters.of(${radius}).times(2 * Math.PI)`;
    circumferenceUnit = "Meters";
    description = `a drum with a ${radius} m radius`;
  }

  const travelPerRotationMeters = circumferenceMeters * stages;
  return {
    kind,
    circumferenceMeters,
    stages,
    travelPerRotationMeters,
    effectiveRadiusMeters: travelPerRotationMeters / (2 * Math.PI),
    circumferenceJava,
    circumferenceUnit,
    pitchJava,
    teeth: pitchJava ? teeth : undefined,
    description,
  };
}
