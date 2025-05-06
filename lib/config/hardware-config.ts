/**
 * Hardware Configuration System
 *
 * This file centralizes all motor and motor controller definitions,
 * making it easier to add support for new hardware.
 */

// Motor interface defining properties of a motor
export interface MotorDefinition {
  name: string
  displayName: string
  // Motor constants
  kv: number // RPM/V
  kt: number // N-m/A
  resistance: number // Ohms per motor
  mass: number // kg per motor
  // Compatibility
  compatibleControllers: string[]
  // Optional properties
  description?: string
}

// Motor controller interface defining properties and capabilities
export interface MotorControllerDefinition {
  name: string
  displayName: string
  // Capabilities
  supportsCurrentLimit: boolean
  supportsSupplyCurrentLimit: boolean
  supportsBrakeMode: boolean
  supportsRampRate: boolean
  supportsSoftLimits: boolean
  // Java import path
  importPath: string
  // Optional properties
  description?: string
  // Limitations
  maxCurrentLimit?: number
  maxVoltage?: number
}

// Define all supported motors
export const MOTORS: Record<string, MotorDefinition> = {
  NEO: {
    name: "NEO",
    displayName: "NEO",
    kv: 473,
    kt: 0.025,
    resistance: 0.116,
    mass: 0.425,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"],
    description: "REV Robotics NEO Brushless Motor",
  },
  NEO550: {
    name: "NEO550",
    displayName: "NEO 550",
    kv: 774,
    kt: 0.015,
    resistance: 0.08,
    mass: 0.235,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"],
    description: "REV Robotics NEO 550 Brushless Motor",
  },
  Minion: {
    name: "Minion",
    displayName: "Minion",
    kv: 774,
    kt: 0.015,
    resistance: 0.08,
    mass: 0.235,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"],
    description: "REV Robotics Minion Brushless Motor",
  },
  Krakenx44: {
    name: "Krakenx44",
    displayName: "Kraken X40",
    kv: 590,
    kt: 0.014,
    resistance: 0.15,
    mass: 0.26,
    compatibleControllers: ["TalonFX"],
    description: "CTRE Kraken X44 Brushless Motor",
  },
  Krakenx60: {
    name: "Krakenx60",
    displayName: "Kraken X60",
    kv: 590,
    kt: 0.021,
    resistance: 0.1,
    mass: 0.39,
    compatibleControllers: ["TalonFX"],
    description: "CTRE Kraken X60 Brushless Motor",
  },
}

// Define all supported motor controllers
export const MOTOR_CONTROLLERS: Record<string, MotorControllerDefinition> = {
  SparkMAX: {
    name: "SparkMAX",
    displayName: "SparkMAX",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: false,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.revrobotics.CANSparkMax",
    description: "REV Robotics SparkMAX Motor Controller",
    maxCurrentLimit: 80,
    maxVoltage: 12,
  },
  SparkFlex: {
    name: "SparkFlex",
    displayName: "SparkFlex",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: false,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.revrobotics.CANSparkFlex",
    description: "REV Robotics SparkFlex Motor Controller",
    maxCurrentLimit: 80,
    maxVoltage: 12,
  },
  TalonFX: {
    name: "TalonFX",
    displayName: "TalonFX (Phoenix 6)",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: true,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.ctre.phoenix6.hardware.TalonFX",
    description: "CTRE TalonFX Motor Controller (Phoenix 6)",
    maxCurrentLimit: 100,
    maxVoltage: 12,
  },
  TalonFXS: {
    name: "TalonFXS",
    displayName: "TalonFX (Phoenix 5)",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: true,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.ctre.phoenix.motorcontrol.can.TalonFXS",
    description: "CTRE TalonFX Motor Controller (Phoenix 5)",
    maxCurrentLimit: 100,
    maxVoltage: 12,
  },
  ThriftyNova: {
    name: "ThriftyNova",
    displayName: "ThriftyNova",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: false,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.thriftyrobotics.nova.hardware.ThriftyNova",
    description: "Thrifty Robotics Nova Motor Controller",
    maxCurrentLimit: 60,
    maxVoltage: 12,
  },
}

// Define mechanism types
export interface MechanismDefinition {
  name: string
  displayName: string
  description: string
  templateName: string
  simClassName: string
  requiresGravityCompensation: boolean
}

export const MECHANISMS: Record<string, MechanismDefinition> = {
  Elevator: {
    name: "Elevator",
    displayName: "Elevator",
    description: "Linear vertical mechanism",
    templateName: "elevator-subsystem",
    simClassName: "ElevatorSim",
    requiresGravityCompensation: true,
  },
  Arm: {
    name: "Arm",
    displayName: "Arm",
    description: "Rotational mechanism with gravity effects",
    templateName: "arm-subsystem",
    simClassName: "ArmSim",
    requiresGravityCompensation: true,
  },
  Pivot: {
    name: "Pivot",
    displayName: "Pivot (Turret/Wrist)",
    description: "Rotational mechanism without significant gravity effects",
    templateName: "pivot-subsystem",
    simClassName: "ArmSim",
    requiresGravityCompensation: false,
  },
}

// Helper functions

/**
 * Get a motor definition by name
 */
export function getMotor(motorName: string): MotorDefinition {
  const motor = MOTORS[motorName]
  if (!motor) {
    throw new Error(`Unknown motor type: ${motorName}`)
  }
  return motor
}

/**
 * Get a motor controller definition by name
 */
export function getMotorController(controllerName: string): MotorControllerDefinition {
  const controller = MOTOR_CONTROLLERS[controllerName]
  if (!controller) {
    throw new Error(`Unknown motor controller type: ${controllerName}`)
  }
  return controller
}

/**
 * Get a mechanism definition by name
 */
export function getMechanism(mechanismName: string): MechanismDefinition {
  const mechanism = MECHANISMS[mechanismName]
  if (!mechanism) {
    throw new Error(`Unknown mechanism type: ${mechanismName}`)
  }
  return mechanism
}

/**
 * Check if a motor is compatible with a motor controller
 */
export function isMotorCompatibleWithController(motorName: string, controllerName: string): boolean {
  const motor = getMotor(motorName)
  return motor.compatibleControllers.includes(controllerName)
}

/**
 * Get all motors compatible with a specific controller
 */
export function getCompatibleMotors(controllerName: string): MotorDefinition[] {
  return Object.values(MOTORS).filter((motor) => motor.compatibleControllers.includes(controllerName))
}

/**
 * Get all controllers compatible with a specific motor
 */
export function getCompatibleControllers(motorName: string): MotorControllerDefinition[] {
  const motor = getMotor(motorName)
  return Object.values(MOTOR_CONTROLLERS).filter((controller) => motor.compatibleControllers.includes(controller.name))
}

/**
 * Get the WPILib DCMotor type string for a given motor
 */
export function getWPILibMotorType(motorName: string): string {
  switch (motorName) {
    case "NEO":
      return "DCMotor.getNEO(1)"
    case "NEO550":
      return "DCMotor.getNEO550(1)"
    case "Minion":
      return "DCMotor.getMinion(1)"
    case "Krakenx44":
      return "DCMotor.getKrakenX44(1)"
    case "Krakenx60":
      return "DCMotor.getKrakenX60(1)"
    default:
      return "DCMotor.getNEO(1)"
  }
}

/**
 * Get the simulation motor type string for a given motor
 */
export function getSimMotorType(motorName: string): string {
  switch (motorName) {
    case "NEO":
      return "NEO"
    case "NEO550":
      return "NEO550"
    case "Krakenx60":
      return "KrakenX60"
    case "Krakenx44":
      return "KrakenX44"
    case "Minion":
      return "Falcon500" // Closest approximation
    default:
      return "NEO"
  }
}
