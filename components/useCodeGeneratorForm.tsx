"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_GEAR_RATIO, DEFAULT_PID } from "@/lib/default-gains";
import { useForm } from "react-hook-form";
import * as z from "zod";

/** One of a turret's two CRT encoders. */
const crtEncoderSchema = z.object({
  type: z.enum(["CANcoder", "ThroughBore", "DutyCycle"]).optional(),
  canId: z.number().int().min(0).max(62).optional(),
  canBus: z.number().int().min(0).max(4).optional(),
  channel: z.number().int().min(0).optional(),
  pinionTeeth: z.number().optional(),
  offset: z.number().optional(),
  inverted: z.boolean().optional(),
});

/** A homing switch at one end of the travel. */
const homingSwitchSchema = z.object({
  enabled: z.boolean().optional(),
  channel: z.number().int().min(0).optional(),
  pressedReads: z.enum(["low", "high"]).optional(),
});

export const formSchema = z.object({
  subsystemName: z.string().min(1, "Subsystem name is required"),
  outputType: z.enum(["vendor", "yams"]),
  commandsVersion: z.enum(["v2", "v3"]),
  mechanismType: z.enum(["Elevator", "Arm", "Pivot", "Turret", "Flywheel"]),
  motorControllerType: z.enum([
    "ThriftyNova",
    "SparkMAX",
    "SparkFlex",
    "TalonFX",
    "TalonFXS",
  ]),
  motorType: z.enum(["NEO", "NEO550", "Minion", "Pulsar", "Vortex", "Krakenx44", "Krakenx60"]),
  canId: z.number().int().min(0).max(62),
  canBus: z.number().int().min(0).max(4).optional(),
  pidValues: z.object({
    kP: z.number().min(0.0),
    kI: z.number().min(0.0),
    kD: z.number().min(0.0),
  }),
  useMotionProfile: z.boolean().optional(),
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
      rackAndPinion: z.boolean().optional(),
      pinionPitchDiameter: z.number().positive().optional(),
      level: z.boolean().optional(),
    })
    .optional(),
  flywheelParams: z
    .object({
      momentOfInertia: z.number().optional(),
      diameter: z.number().optional(),
    })
    .optional(),
  absoluteEncoder: z
    .object({
      type: z.enum(["none", "CANcoder", "ThroughBore", "Thrifty10Pin", "DutyCycle"]).optional(),
      port: z.enum(["dataPort", "candi", "smartIo"]).optional(),
      canId: z.number().int().min(0).max(62).optional(),
      canBus: z.number().int().min(0).max(4).optional(),
      channel: z.number().int().min(0).optional(),
      offset: z.number().optional(),
      inverted: z.boolean().optional(),
      ratio: z.number().optional(),
    })
    .optional(),
  homing: z
    .object({
      enabled: z.boolean().optional(),
      lower: homingSwitchSchema.optional(),
      upper: homingSwitchSchema.optional(),
    })
    .optional(),
  turretParams: z
    .object({
      crt: z.boolean().optional(),
      sharedGearTeeth: z.number().optional(),
      sharedGearRatio: z.number().optional(),
      encoderA: crtEncoderSchema.optional(),
      encoderB: crtEncoderSchema.optional(),
    })
    .optional(),
});

export type FormSchema = z.infer<typeof formSchema>;

/** The form's starting values. Share links only hold what differs from these. */
export const DEFAULT_VALUES: FormSchema = {
  subsystemName: "ElevatorSubsystem",
  outputType: "vendor",
  commandsVersion: "v2",
  mechanismType: "Elevator",
  motorControllerType: "SparkMAX",
  motorType: "NEO",
  canId: 1,
  canBus: 0,
  pidValues: { ...DEFAULT_PID.Elevator },
  useMotionProfile: false,
  maxAcceleration: 1.0,
  maxVelocity: 1.0,
  feedforward: { kS: 0.0, kV: 0.0, kA: 0.0, kG: 0.0 },
  gearRatio: DEFAULT_GEAR_RATIO.Elevator,
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
  },
  armParams: {
    length: 1.0,
    hardLimitMax: 90,
    hardLimitMin: 0,
    startingPosition: 0,
    mass: 3,
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
    rackAndPinion: false,
    pinionPitchDiameter: 1.5,
    level: true,
  },
  flywheelParams: {
    momentOfInertia: 0.0025,
    diameter: 0.1016,
  },
  absoluteEncoder: {
    type: "none",
    port: "dataPort",
    canId: 20,
    canBus: 0,
    channel: 0,
    offset: 0,
    inverted: false,
    ratio: 1,
  },
  homing: {
    enabled: false,
    lower: { enabled: true, channel: 4, pressedReads: "high" },
    upper: { enabled: false, channel: 5, pressedReads: "high" },
  },
  turretParams: {
    crt: false,
    sharedGearTeeth: 100,
    sharedGearRatio: 1,
    encoderA: { type: "CANcoder", canId: 21, canBus: 0, channel: 0, pinionTeeth: 19, offset: 0, inverted: true },
    encoderB: { type: "CANcoder", canId: 22, canBus: 0, channel: 1, pinionTeeth: 21, offset: 0, inverted: true },
  },
};

export function useCodeGeneratorForm() {
  return useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });
}
