// First, let's create a proper interface for the constructor options
import { getMotor } from "@/lib/config/hardware-config"

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
  motor!: {
    kv: number
    kt: number
    R: number
    m: number
    gearing: number
    count: number
  }

  constructor(canvas: HTMLCanvasElement, options: ControlsBaseSimOptions = {}) {
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
    this.kP = options.kP || 1.0
    this.kI = options.kI || 0.0
    this.kD = options.kD || 0.0

    // Default feedforward values
    this.kS = options.kS || 0.0
    this.kV = options.kV || 0.0
    this.kA = options.kA || 0.0
    this.kG = options.kG || 0.0

    // State variables
    this.position = 0
    this.velocity = 0
    this.acceleration = 0
    this.voltage = 0
    this.current = 0

    // PID state
    this.integral = 0
    this.prevError = 0

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
        kt: motorDef.kt * gearing * motorCount, // N-m/A (multiply by motor count for total torque)
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
        kt: neoMotor.kt * gearing * motorCount,
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
  }

  setTarget(target: number): void {
    this.target = target
  }

  setTargetVelocity(velocity: number): void {
    this.targetVelocity = velocity
  }

  setControlMode(mode: string): void {
    this.controlMode = mode
  }

  calculateFeedforward(velocity: number, acceleration: number): number {
    // Calculate feedforward voltage
    const gravityComponent = this.kG || 0
    const staticComponent = this.kS * Math.sign(velocity)
    const velocityComponent = this.kV * velocity
    const accelerationComponent = this.kA * acceleration

    return staticComponent + velocityComponent + accelerationComponent + gravityComponent
  }

  calculatePID(error: number): number {
    // Calculate PID output
    this.integral += error * this.dt
    const derivative = (error - this.prevError) / this.dt
    this.prevError = error

    return this.kP * error + this.kI * this.integral + this.kD * derivative
  }

  update(dt?: number): void {
    this.dt = dt || this.dt
    this.time += this.dt

    // Calculate control output based on mode
    let controlOutput = 0

    if (this.controlMode === "position") {
      const error = this.target - this.position
      controlOutput = this.calculatePID(error)
    } else if (this.controlMode === "velocity") {
      const error = this.targetVelocity - this.velocity
      controlOutput = this.calculatePID(error)
    }

    // Add feedforward
    const ffOutput = this.calculateFeedforward(this.velocity, this.acceleration)
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

  draw(): void {
    // Override in subclasses
    this.ctx.clearRect(0, 0, this.width, this.height)
  }
}
