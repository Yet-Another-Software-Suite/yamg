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
    kv: 493.5,
    kt: 0.0181,
    resistance: 0.066,
    mass: 0.53977492,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova", "ReduxNitrate"],
    description: "REV Robotics NEO Brushless Motor",
  },
  NEO550: {
    name: "NEO550",
    displayName: "NEO 550",
    kv: 985.6,
    kt: 0.0097,
    resistance: 0.108,
    mass: 0.2540117,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova", "ReduxNitrate"],
    description: "REV Robotics NEO 550 Brushless Motor",
  },
  Minion: {
    name: "Minion",
    displayName: "Minion",
    kv: 627.6,
    kt: 0.0155,
    resistance: 0.060,
    mass: 0.4399846,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova", "ReduxNitrate"],
    description: "REV Robotics Minion Brushless Motor",
  },
  Vortex: {
    name: "Vortex",
    displayName: "NEO Vortex",
    kv: 575.1, // Same as NEO for now - will need actual specs
    kt: 0.0171, // Same as NEO for now - will need actual specs
    resistance: 0.057, // Same as NEO for now - will need actual specs
    mass: 0.5805982, // Same as NEO for now - will need actual specs
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ReduxNitrate"],
    description: "REV Robotics NEO Vortex Brushless Motor",
  },
  Cu60: {
    name: "Cu60",
    displayName: "Redux Cu60",
    kv: 567.6, // Placeholder - will need actual specs
    kt: 0.0166, // Placeholder - will need actual specs
    resistance: 0.027, // Placeholder - will need actual specs
    mass: 0.635029, // Placeholder - will need actual specs
    compatibleControllers: ["ReduxNitrate"],
    description: "Redux Robotics Cu60 Brushless Motor",
  },
  Krakenx44: {
    name: "Krakenx44",
    displayName: "Kraken X44",
    kv: 630.7,
    kt: 0.0147,
    resistance: 0.044,
    mass: 0.3401943,
    compatibleControllers: ["TalonFX"],
    description: "CTRE Kraken X44 Brushless Motor",
  },
  Krakenx60: {
    name: "Krakenx60",
    displayName: "Kraken X60",
    kv: 484.8,
    kt: 0.0194,
    resistance: 0.025,
    mass: 0.544311,
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
    displayName: "TalonFX",
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
    displayName: "TalonFXS",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: true,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.ctre.phoenix.motorcontrol.can.TalonFXS",
    description: "CTRE TalonFXS Motor Controller (Phoenix 6)",
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
  ReduxNitrate: {
    name: "ReduxNitrate",
    displayName: "Redux Nitrate",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: true,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.reduxrobotics.nitrate.hardware.ReduxNitrate",
    description: "Redux Robotics Nitrate Motor Controller",
    maxCurrentLimit: 80, // Placeholder - will need actual specs
    maxVoltage: 12,
  },
}

// Define mechanism types
export interface MechanismDefinition {
  name: string
  displayName: string
  description: string
  templateName: string
  simTemplateName: string
  simClassName: string
  requiresGravityCompensation: boolean
}

export const MECHANISMS: Record<string, MechanismDefinition> = {
  Elevator: {
    name: "Elevator",
    displayName: "Elevator",
    description: "Linear vertical mechanism",
    templateName: "elevator-subsystem",
    simTemplateName: "elevator-sim",
    simClassName: "ElevatorSim",
    requiresGravityCompensation: true,
  },
  Arm: {
    name: "Arm",
    displayName: "Arm",
    description: "Rotational mechanism with gravity effects",
    templateName: "arm-subsystem",
    simTemplateName: "arm-sim",
    simClassName: "ArmSim",
    requiresGravityCompensation: true,
  },
  Pivot: {
    name: "Pivot",
    displayName: "Pivot (Turret/Wrist)",
    description: "Rotational mechanism without significant gravity effects",
    templateName: "pivot-subsystem",
    simTemplateName: "pivot-sim",
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
  try {
    const motor = getMotor(motorName)
    return motor.compatibleControllers.includes(controllerName)
  } catch (error) {
    return true
  }
}

/**
 * Get all motors compatible with a specific controller
 */
export function getCompatibleMotors(controllerName: string): MotorDefinition[] {
  return Object.values(MOTORS).filter((motor) => motor.compatibleControllers.includes(controllerName))
}

/**
 * Get the WPILib DCMotor type string for a given motor
 */
export function getWPILibMotorType(motorName: string): string {
  switch (motorName) {
    case "NEO":
      return "DCMotor.getNEO(1)"
    case "NEO550":
      return "DCMotor.getNeo550(1)"
    case "Krakenx60":
      return "DCMotor.getKrakenX60(1)"
    case "Minion":
      // From https://store.ctr-electronics.com/products/minion-brushless-motor
      return customDCMotor(3.1, 200.46, 1.43, 7200)
    case "Krakenx44":
      // From https://wcproducts.com/blogs/wcp-blog/kraken-x44
      return customDCMotor(4.05, 275, 1.4, 7530)
    case "Vortex":
      return "DCMotor.getNEOVortex(1)"
    case "Cu60":
      // Placeholder - will need actual DCMotor specs for Cu60
      return customDCMotor(4.05, 275, 1.4, 7530)
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
    case "Vortex":
      return "NEOVortex"
    case "Cu60":
      return "Cu60"
    default:
      return "NEO"
  }
}

/**
 * Helper function to create a custom DCMotor
 */
function customDCMotor(
  stallTorqueNewtonMeters: number,
  stallCurrentAmps: number,
  freeCurrentAmps: number,
  freeSpeedRPM: number,
): string {
  return `new DCMotor(12, ${stallTorqueNewtonMeters}, ${stallCurrentAmps}, ${freeCurrentAmps}, Units.rotationsPerMinuteToRadiansPerSecond(${freeSpeedRPM}), 1)`
}
