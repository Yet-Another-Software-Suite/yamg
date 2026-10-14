export interface FormValues {
  subsystemName: string
  /** Plain vendor code, or code that uses YAMS. */
  outputType?: "vendor" | "yams"
  /** WPILib Commands v2 (subsystems) or Commands v3 (mechanisms). */
  commandsVersion?: "v2" | "v3"
  mechanismType: "Elevator" | "Arm" | "Pivot" | "Flywheel"
  motorControllerType: "ThriftyNova" | "SparkMAX" | "SparkFlex" | "TalonFX" | "TalonFXS" 
  motorType: "NEO" | "NEO550" | "Minion" | "Krakenx44" | "Krakenx60" | "Vortex"
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
    /** Log with Telemetry calls in periodic(), or with Epilogue annotations. */
    logger?: "telemetry" | "epilogue"
    ntKey: string
    position: boolean
    velocity: boolean
    voltage: boolean
    temperature: boolean
    current: boolean
  }
  armParams?: {
    length?: number
    hardLimitMax?: number
    hardLimitMin?: number
    startingPosition?: number
    mass?: number
    massUnit?: "kg" | "lbs"
    centerOfMass?: number
  }
  elevatorParams?: {
    startingHeight?: number
    hardLimitMax?: number
    hardLimitMin?: number
    mass?: number
    massUnit?: "kg" | "lbs"
    drumRadius?: number
    /** What the gearbox output turns: a drum (spool), a chain sprocket or a belt pulley. */
    driveType?: "drum" | "chain" | "belt"
    /** #25 or #35 roller chain. */
    chainPitch?: "25" | "35"
    /** The belt's pitch, in millimeters. */
    beltPitchMm?: number
    /** Teeth on the sprocket or pulley the gearbox turns. */
    sprocketTeeth?: number
    /** A cascade elevator, whose carriage moves the stage count times as far as the chain or belt. */
    cascade?: boolean
    /** Moving stages in the cascade, counting the carriage. */
    cascadeStages?: number
  }
  flywheelParams?: {
    momentOfInertia?: number
    diameter?: number
  }
}

export interface FileOutput {
  filename: string
  content: string
}
