export interface FormValues {
  subsystemName: string
  mechanismType: "Elevator" | "Arm" | "Pivot"
  motorControllerType: "ThriftyNova" | "SparkMAX" | "SparkFlex" | "TalonFX" | "TalonFXS"
  motorType: "NEO" | "NEO550" | "Minion" | "Krakenx44" | "Krakenx60"
  canId: number
  pidValues: {
    kP: number
    kI: number
    kD: number
  }
  maxAcceleration?: number
  maxVelocity?: number
  feedforward?: {
    kS?: number
    kV?: number
    kA?: number
    kG?: number
  }
  gearRatio: number
  softLimits?: {
    forward?: number
    reverse?: number
  }
  brakeMode: boolean
  currentLimits?: {
    stator?: number
    supply?: number
  }
  rampRates?: {
    openLoop?: number
    closedLoop?: number
  }
  telemetry: {
    ntKey: string
    position: boolean
    velocity: boolean
    voltage: boolean
    temperature: boolean
    current: boolean
    positionUnit: "Rotations" | "Radians" | "Degrees"
  }
  armParams?: {
    length?: number
    hardLimitMax?: number
    hardLimitMin?: number
    startingPosition?: number
    mass?: number
    massUnit?: "kg" | "lbs"
  }
  elevatorParams?: {
    startingHeight?: number
    hardLimitMax?: number
    hardLimitMin?: number
    mass?: number
    massUnit?: "kg" | "lbs"
    drumRadius?: number
  }
}

export interface FileOutput {
  filename: string
  content: string
}
