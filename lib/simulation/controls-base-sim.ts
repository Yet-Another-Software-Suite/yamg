// First, let's create a proper interface for the constructor options
import { getMotor } from "@/lib/config/hardware-config"
import { TrapezoidProfile, type ProfileState } from "@/lib/simulation/trapezoid-profile"

export interface ControlsBaseSimOptions {
  // Motor configuration
  motorType?: string
  gearing?: number
  motorCount?: number

  // PID values
  kP?: number
  kI?: number
  kD?: number

  // Feedforward values
  kS?: number
  kV?: number
  kA?: number
  kG?: number

  // The trapezoidal profile, in radians or meters per second and per second squared. With both 0 the
  // profile is off, and the closed loop goes straight to the goal.
  maxVelocity?: number
  maxAcceleration?: number

  // The sim works in radians, or meters for an elevator. The gains are per the units the form gives:
  // these say how many of those units one radian (or meter) is, such as 1 / 2π for per rotation.
  pidUnitsPerSimUnit?: number
  feedforwardUnitsPerSimUnit?: number

  // Timing
  dt?: number
}

/**
 * Base simulation class for FRC mechanism simulations
 */
export class ControlsBaseSim {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  time: number
  dt: number
  target: number
  targetVelocity: number
  controlMode: string
  kP: number
  kI: number
  kD: number
  kS: number
  kV: number
  kA: number
  kG: number
  position: number
  velocity: number
  acceleration: number
  voltage: number
  current: number
  integral: number
  prevError: number
  maxVelocity: number
  maxAcceleration: number
  pidUnitsPerSimUnit: number
  feedforwardUnitsPerSimUnit: number
  /** The profile, or null when it is off. */
  profile: TrapezoidProfile | null
  /** Where the profile is now: the position and velocity the closed loop follows. */
  setpoint: ProfileState
  motor!: {
    kv: number
    kt: number
    R: number
    m: number
    gearing: number
    count: number
  }
  arm: boolean

  constructor(canvas: HTMLCanvasElement, options: ControlsBaseSimOptions = {}) {
    this.arm = false
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.width = canvas.width
    this.height = canvas.height
    this.time = 0
    this.dt = options.dt || 0.02 // 20ms update rate
    this.target = 0
    this.targetVelocity = 0
    this.controlMode = "position" // 'position' or 'velocity'

    // Default PID values
    this.kP = options.kP ?? 1.0
    this.kI = options.kI ?? 0.0
    this.kD = options.kD ?? 0.0

    // Default feedforward values
    this.kS = options.kS ?? 0.0
    this.kV = options.kV ?? 0.0
    this.kA = options.kA ?? 0.0
    this.kG = options.kG ?? 0.0

    this.pidUnitsPerSimUnit = options.pidUnitsPerSimUnit ?? 1
    this.feedforwardUnitsPerSimUnit = options.feedforwardUnitsPerSimUnit ?? 1

    // A max velocity and acceleration of 0 turn the profile off, as in the generated code.
    this.maxVelocity = options.maxVelocity ?? 0
    this.maxAcceleration = options.maxAcceleration ?? 0
    this.profile =
      this.maxVelocity === 0 && this.maxAcceleration === 0
        ? null
        : new TrapezoidProfile(this.maxVelocity, this.maxAcceleration)

    // State variables
    this.position = 0
    this.velocity = 0
    this.acceleration = 0
    this.voltage = 0
    this.current = 0

    // PID state
    this.integral = 0
    this.prevError = 0
    this.setpoint = { position: 0, velocity: 0 }

    // Motor configuration
    this.configureMotor(options)
  }

  configureMotor(options: ControlsBaseSimOptions): void {
    // Default motor is a NEO
    const motorType = options.motorType || "NEO"
    const gearing = options.gearing || 1.0
    const motorCount = options.motorCount || 1

    // Get motor constants from the centralized configuration
    try {
      const motorDef = getMotor(motorType)

      this.motor = {
        kv: motorDef.kv / gearing, // RPM/V
        // N-m/A at the mechanism. Motors side by side share the current, so kt stays per motor and
        // the resistance is split, as WPILib's DCMotor does.
        kt: motorDef.kt * gearing,
        R: motorDef.resistance / motorCount, // Ohms (parallel resistance decreases)
        m: motorDef.mass * motorCount, // kg (total mass increases)
        gearing: gearing,
        count: motorCount,
      }

      console.log(`Configured ${motorCount} ${motorType} motor(s) with gearing ${gearing}:1`, {
        totalTorque: this.motor.kt,
        totalResistance: this.motor.R,
        totalMass: this.motor.m,
      })
    } catch (error) {
      // Fallback to NEO if motor not found
      console.warn(`Motor type ${motorType} not found in configuration, using NEO as fallback`)
      const neoMotor = getMotor("NEO")

      this.motor = {
        kv: neoMotor.kv / gearing,
        kt: neoMotor.kt * gearing,
        R: neoMotor.resistance / motorCount,
        m: neoMotor.mass * motorCount,
        gearing: gearing,
        count: motorCount,
      }
    }
  }

  reset(): void {
    this.position = 0
    this.velocity = 0
    this.acceleration = 0
    this.voltage = 0
    this.current = 0
    this.integral = 0
    this.prevError = 0
    this.time = 0
    this.restartProfile()
  }

  /** Start the profile from where the mechanism is now, as the generated code does. */
  restartProfile(): void {
    this.setpoint = { position: this.position, velocity: this.velocity }
  }

  setTarget(target: number): void {
    this.target = target
  }

  setTargetVelocity(velocity: number): void {
    this.targetVelocity = velocity
  }

  setControlMode(mode: string): void {
    this.controlMode = mode
    this.integral = 0
    this.prevError = 0
    this.restartProfile()
  }

  /**
   * The feedforward to go from one setpoint velocity to the next over a loop, as WPILib's
   * feedforward.calculate(current, next) in the generated code works it out: the voltage that takes
   * the motor exactly there. The position is the setpoint's angle, for an arm's gravity. Velocities
   * are in radians or meters per second, and kV and kA per the form's units.
   */
  calculateFeedforward(position: number, velocity: number, nextVelocity: number): number {
    // An arm's gravity is strongest straight out, at 0, and gone pointing straight up or down.
    const gravityComponent = this.kG * (this.arm ? Math.cos(position) : 1)
    const staticComponent = this.kS * Math.sign(velocity)
    const kV = this.kV * this.feedforwardUnitsPerSimUnit
    const kA = this.kA * this.feedforwardUnitsPerSimUnit
    let motionComponent: number
    if (kA === 0) {
      motionComponent = kV * nextVelocity
    } else if (kV === 0) {
      motionComponent = (kA * (nextVelocity - velocity)) / this.dt
    } else {
      // The motor's speed decays toward kV's over kA / kV seconds. Solve for the voltage that lands on
      // the next velocity after one loop.
      const decay = Math.exp((-kV / kA) * this.dt)
      motionComponent = (kV * (nextVelocity - decay * velocity)) / (1 - decay)
    }

    return staticComponent + motionComponent + gravityComponent
  }

  /** The PID output for an error in radians or meters, with the gains per the form's units. */
  calculatePID(error: number): number {
    const scaledError = error * this.pidUnitsPerSimUnit
    this.integral += scaledError * this.dt
    const derivative = (scaledError - this.prevError) / this.dt
    this.prevError = scaledError

    return (this.kP * scaledError) + (this.kI * this.integral) + (this.kD * derivative)
  }

  /**
   * Step the profile one loop toward the target. With the profile off, the setpoint is the target.
   */
  stepProfile(): ProfileState {
    const goal = { position: this.target, velocity: 0 }
    let next: ProfileState
    if (this.profile === null) {
      next = goal
    } else if (this.maxVelocity <= 0 || this.maxAcceleration <= 0) {
      // A profile that cannot move holds where it is, as the motor controllers do.
      next = { position: this.setpoint.position, velocity: 0 }
    } else {
      next = this.profile.calculate(this.dt, this.setpoint, goal)
    }
    return next
  }

  update(dt?: number): void {
    this.dt = dt || this.dt
    this.time += this.dt

    // Calculate control output based on mode
    let controlOutput = 0
    let ffOutput = 0

    if (this.controlMode === "position") {
      // Follow the profile: the PID corrects the error from its setpoint, and the feedforward gives
      // the setpoint's velocity and acceleration, as the generated code does.
      const next = this.stepProfile()
      ffOutput = this.calculateFeedforward(this.setpoint.position, this.setpoint.velocity, next.velocity)
      this.setpoint = next
      controlOutput = this.calculatePID(next.position - this.position)
    } else if (this.controlMode === "velocity") {
      // Velocity control has no profile: the feedforward gives the target velocity.
      controlOutput = this.calculatePID(this.targetVelocity - this.velocity)
      ffOutput = this.calculateFeedforward(this.position, this.targetVelocity, this.targetVelocity)
    }

    this.voltage = controlOutput + ffOutput

    // Limit voltage to battery voltage
    this.voltage = Math.max(-12, Math.min(12, this.voltage))

    // Calculate motor physics - this updates position, velocity, etc.
    this.updatePhysics()

    // Log debug info occasionally
    if (Math.round(this.time * 50) % 50 === 0) {
      console.debug("Base sim update:", {
        controlMode: this.controlMode,
        target: this.target,
        targetVelocity: this.targetVelocity,
        position: this.position,
        velocity: this.velocity,
        voltage: this.voltage,
        motorCount: this.motor.count,
        controlOutput,
        ffOutput,
      })
    }
  }

  updatePhysics(): void {
    // Override in subclasses
  }

  /**
   * Step the motor one loop, with a load torque held for the loop, and set the current. Velocities
   * are in radians per second at the mechanism. The speed settles toward where the motor's torque
   * balances the load, as fast as the back-EMF allows: this solves that exactly, where explicit
   * Euler goes unstable for a high gearing on a small inertia.
   */
  stepMotor(velocity: number, inertia: number, loadTorque: number): { velocity: number; distance: number } {
    const voltsPerRadPerSec = 60 / (2 * Math.PI) / this.motor.kv
    // How fast the back-EMF slows the mechanism, per second.
    const rate = (this.motor.kt * voltsPerRadPerSec) / (this.motor.R * inertia)
    const settledVelocity = (this.voltage - (loadTorque * this.motor.R) / this.motor.kt) / voltsPerRadPerSec
    const decay = Math.exp(-rate * this.dt)
    const next = settledVelocity + (velocity - settledVelocity) * decay
    const distance = settledVelocity * this.dt + ((velocity - settledVelocity) * (1 - decay)) / rate
    this.current = (this.voltage - voltsPerRadPerSec * next) / this.motor.R
    return { velocity: next, distance }
  }

  draw(): void {
    // Override in subclasses
    this.ctx.clearRect(0, 0, this.width, this.height)
  }
}
