export interface FormValues {
  subsystemName: string
  /** Plain vendor code, or code that uses YAMS. */
  outputType?: "vendor" | "yams"
  /** WPILib Commands v2 (subsystems) or Commands v3 (mechanisms). */
  commandsVersion?: "v2" | "v3"
  mechanismType: "Elevator" | "Arm" | "Pivot" | "Turret" | "Flywheel"
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
  /** An absolute encoder that tells an arm, pivot or turret where it is when the robot turns on. */
  absoluteEncoder?: AbsoluteEncoderParams
  turretParams?: {
    /** Find the turret's angle from two absolute encoders on pinions with different tooth counts. */
    crt?: boolean
    /** Teeth on the gear both encoder pinions mesh with. */
    sharedGearTeeth?: number
    /** Rotations of that shared gear per turret rotation: 1 when the pinions mesh with the turret gear. */
    sharedGearRatio?: number
    encoderA?: CrtEncoderParams
    encoderB?: CrtEncoderParams
  }
}

/** The absolute encoders YAMG supports. */
export type AbsoluteEncoderType = "CANcoder" | "ThroughBore" | "Thrifty10Pin" | "DutyCycle"

export interface AbsoluteEncoderParams {
  type?: "none" | AbsoluteEncoderType
  /**
   * Where a REV Through Bore or a duty cycle encoder is plugged in: a SPARK's or a Nova's data port, a
   * CANdi a Talon reads, or a SystemCore Smart IO port.
   */
  port?: "dataPort" | "candi" | "smartIo"
  /** The CANcoder's or the CANdi's CAN ID. */
  canId?: number
  /** The SystemCore Smart IO channel of a duty cycle encoder. */
  channel?: number
  /** What the encoder reads, in degrees, with the mechanism at zero. */
  offset?: number
  /** True when the encoder counts down as the mechanism moves in its positive direction. */
  inverted?: boolean
  /** Encoder rotations per mechanism rotation: 1 when it is on the mechanism's shaft. */
  ratio?: number
}

/** One of the two encoders a turret's CRT reads. The SystemCore reads both. */
export interface CrtEncoderParams {
  type?: "CANcoder" | "ThroughBore" | "DutyCycle"
  canId?: number
  channel?: number
  /** Teeth on the pinion the encoder is on. */
  pinionTeeth?: number
  /** What the encoder reads, in degrees, with the turret at zero. */
  offset?: number
  inverted?: boolean
}

export interface FileOutput {
  filename: string
  content: string
}
