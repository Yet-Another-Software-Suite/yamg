"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const formSchema = z.object({
  subsystemName: z.string().min(1, "Subsystem name is required"),
  outputType: z.enum(["vendor", "yams"]),
  commandsVersion: z.enum(["v2", "v3"]),
  mechanismType: z.enum(["Elevator", "Arm", "Pivot", "Flywheel"]),
  motorControllerType: z.enum([
    "ThriftyNova",
    "SparkMAX",
    "SparkFlex",
    "TalonFX",
    "TalonFXS",
  ]),
  motorType: z.enum(["NEO", "NEO550", "Minion", "Vortex", "Krakenx44", "Krakenx60"]),
  canId: z.number().int().min(0).max(62),
  pidValues: z.object({
    kP: z.number().min(0.0),
    kI: z.number().min(0.0),
    kD: z.number().min(0.0),
  }),
  maxAcceleration: z.number().optional(),
  maxVelocity: z.number().optional(),
  feedforward: z
    .object({
      kS: z.number().optional(),
      kV: z.number().optional(),
      kA: z.number().optional(),
      kG: z.number().optional(),
    })
    .optional(),
  gearRatio: z.number().min(0.0),
  softLimits: z
    .object({
      forward: z.number().optional(),
      reverse: z.number().optional(),
    })
    .optional(),
  brakeMode: z.boolean(),
  currentLimits: z
    .object({
      stator: z.number().optional(),
      supply: z.number().optional(),
    })
    .optional(),
  rampRates: z
    .object({
      openLoop: z.number().min(0).optional(),
      closedLoop: z.number().min(0).optional(),
    })
    .optional(),
  telemetry: z.object({
    logger: z.enum(["telemetry", "epilogue"]),
    ntKey: z.string(),
    position: z.boolean(),
    velocity: z.boolean(),
    voltage: z.boolean(),
    temperature: z.boolean(),
    current: z.boolean(),
    positionUnit: z.enum(["Rotations", "Radians", "Degrees"]),
  }),
  armParams: z
    .object({
      length: z.number().optional(),
      hardLimitMax: z.number().optional(),
      hardLimitMin: z.number().optional(),
      startingPosition: z.number().optional(),
      mass: z.number().optional(),
      massUnit: z.enum(["kg", "lbs"]).optional(),
      centerOfMass: z.number().optional(),
    })
    .optional(),
  elevatorParams: z
    .object({
      startingHeight: z.number().optional(),
      hardLimitMax: z.number().optional(),
      hardLimitMin: z.number().optional(),
      mass: z.number().optional(),
      massUnit: z.enum(["kg", "lbs"]).optional(),
      drumRadius: z.number().optional(),
      driveType: z.enum(["drum", "chain", "belt"]).optional(),
      chainPitch: z.enum(["25", "35"]).optional(),
      beltPitchMm: z.number().positive().optional(),
      sprocketTeeth: z.number().int().positive().optional(),
      cascade: z.boolean().optional(),
      cascadeStages: z.number().int().min(2).max(5).optional(),
    })
    .optional(),
  flywheelParams: z
    .object({
      momentOfInertia: z.number().optional(),
      diameter: z.number().optional(),
    })
    .optional(),
});

export type FormSchema = z.infer<typeof formSchema>;

export function useCodeGeneratorForm() {
  return useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subsystemName: "ElevatorSubsystem",
      outputType: "vendor",
      commandsVersion: "v2",
      mechanismType: "Elevator",
      motorControllerType: "SparkMAX",
      motorType: "NEO",
      canId: 1,
      pidValues: { kP: 1.0, kI: 0.0, kD: 0.0 },
      maxAcceleration: 1.0,
      maxVelocity: 1.0,
      feedforward: { kS: 0.0, kV: 0.0, kA: 0.0, kG: 0.0 },
      gearRatio: 15.0,
      softLimits: {},
      brakeMode: true,
      currentLimits: { stator: 40 },
      rampRates: { openLoop: 0.0, closedLoop: 0.0 },
      telemetry: {
        logger: "telemetry",
        ntKey: "ElevatorSubsystem",
        position: true,
        velocity: true,
        voltage: true,
        temperature: false,
        current: false,
        positionUnit: "Rotations",
      },
      armParams: {
        length: 1.0,
        hardLimitMax: 90,
        hardLimitMin: 0,
        startingPosition: 0,
        mass: 5,
        massUnit: "kg",
      },
      elevatorParams: {
        startingHeight: 0.0,
        hardLimitMax: 1.0,
        hardLimitMin: 0.0,
        mass: 5,
        massUnit: "kg",
        drumRadius: 0.0254,
        driveType: "drum",
        chainPitch: "25",
        beltPitchMm: 5,
        sprocketTeeth: 22,
        cascade: false,
        cascadeStages: 2,
      },
      flywheelParams: {
        momentOfInertia: 0.0025,
        diameter: 0.1016,
      },
    },
  });
}
