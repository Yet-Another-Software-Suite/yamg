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
  km: number // N-m/sqrt(W)
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
    km: 0.070,
    resistance: 0.066,
    mass: 0.53977492,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"],
    description: "REV Robotics NEO Brushless Motor",
  },
  NEO550: {
    name: "NEO550",
    displayName: "NEO 550",
    kv: 985.6,
    kt: 0.0097,
    km: 0.030,
    resistance: 0.108,
    mass: 0.2540117,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"],
    description: "REV Robotics NEO 550 Brushless Motor",
  },
  Minion: {
    name: "Minion",
    displayName: "Minion",
    kv: 627.6,
    kt: 0.0155,
    km: 0.063,
    resistance: 0.060,
    mass: 0.4399846,
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"],
    description: "CTRE Minion Brushless Motor",
  },
  Pulsar: {
    name: "Pulsar",
    displayName: "Thrifty Pulsar",
    // From Thrifty's specs (12 V, 3.1 N-m and 189 A stalled, 2.7 A and 7500 RPM free), worked out the way WPILib's DCMotor does
    kv: 634.0,
    kt: 0.0164,
    km: 0.065,
    resistance: 0.0635,
    mass: 0.2948, // 0.65 lb
    // A Talon FXS drives it as a NEO (NEO_JST)
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"],
    description: "Thrifty Pulsar 775 Brushless Motor",
  },
  Vortex: {
    name: "Vortex",
    displayName: "NEO Vortex",
    kv: 575.1, 
    kt: 0.0171,
    km: 0.072,
    resistance: 0.057, 
    mass: 0.5805982, 
    compatibleControllers: ["SparkMAX", "SparkFlex", "TalonFXS"],
    description: "REV Robotics NEO Vortex Brushless Motor",
  },
  Krakenx44: {
    name: "Krakenx44",
    displayName: "Kraken X44",
    kv: 630.7,
    kt: 0.0147,
    km: 0.071,
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
    km: 0.107,
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
    supportsSupplyCurrentLimit: true,
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
  simClassName: string
  requiresGravityCompensation: boolean
}

export const MECHANISMS: Record<string, MechanismDefinition> = {
  Elevator: {
    name: "Elevator",
    displayName: "Elevator",
    description: "Linear vertical mechanism",
    simClassName: "ElevatorSim",
    requiresGravityCompensation: true,
  },
  Arm: {
    name: "Arm",
    displayName: "Arm",
    description: "Rotational mechanism with gravity effects",
    simClassName: "ArmSim",
    requiresGravityCompensation: true,
  },
  Pivot: {
    name: "Pivot",
    displayName: "Pivot (Wrist)",
    description: "Rotational mechanism without significant gravity effects",
    simClassName: "ArmSim",
    requiresGravityCompensation: false,
  },
  Turret: {
    name: "Turret",
    displayName: "Turret",
    description: "Flat rotational mechanism, which can find its angle with two encoders (CRT)",
    simClassName: "ArmSim",
    requiresGravityCompensation: false,
  },
  Flywheel: {
    name: "Flywheel",
    displayName: "Flywheel (Shooter)",
    description: "High-speed rotational inertia mechanism for shooters and launchers",
    simClassName: "FlywheelSim",
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
    case "Minion":
      return "DCMotor.getMinion(1)"
    case "Pulsar":
      // WPILib has no Thrifty Pulsar, so it's built from Thrifty's specs: 12 V, stall torque and current, free current and speed
      return "new DCMotor(12.0, 3.1, 189.0, 2.7, 7500 * 2 * Math.PI / 60, 1)"
    case "Vortex":
      return "DCMotor.getNeoVortex(1)"
    case "Krakenx44":
      return "DCMotor.getKrakenX44(1)"
    case "Krakenx60":
      return "DCMotor.getKrakenX60(1)"
    default:
      return "DCMotor.getNEO(1)"
  }
}

/**
 * Get the simulation motor type for a given motor: the key the simulation looks it up by in MOTORS,
 * or the NEO for an unknown motor
 */
export function getSimMotorType(motorName: string): string {
  return MOTORS[motorName] ? motorName : "NEO"
}
