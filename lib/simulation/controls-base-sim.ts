// First, let's create a proper interface for the constructor options
import { getMotor } from "@/lib/config/hardware-config"
import { TrapezoidProfile, type ProfileState } from "@/lib/simulation/trapezoid-profile"
import { trimSamples, type ChartSample } from "@/lib/simulation/sim-chart"

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

  // Current limits per motor, in amps, as the motor controllers apply them. Unset means none.
  statorCurrentLimit?: number
  supplyCurrentLimit?: number
  // The battery's internal resistance, in ohms: its voltage sags by the supply current times this.
  batteryResistance?: number

  // Homing switches at the lower and upper hard stops, which the mechanism presses at the stop.
  lowerSwitch?: boolean
  upperSwitch?: boolean

  // Timing
  dt?: number
}

/** The battery's voltage with no load. */
const NOMINAL_VOLTAGE = 12

/** How often a motor controller applies its current limits, in seconds. */
const CURRENT_LIMIT_PERIOD = 0.001

/** How long the motors stay stalled at a high current before the sim warns. */
const STALL_WARNING_SECONDS = 2

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
  statorCurrentLimit: number | undefined
  supplyCurrentLimit: number | undefined
  batteryResistance: number
  /** The battery's voltage, sagging with the supply current. */
  batteryVoltage: number
  /** The current all the motors draw from the battery, in amps. */
  supplyCurrent: number
  /** How long the motors have been stalled at a high current, in seconds. */
  stalledTime: number
  /** The last 15 seconds, for the chart. */
  history: ChartSample[]
  motor!: {
    kv: number
    kt: number
    R: number
    m: number
    gearing: number
    count: number
    /** Each motor's free current at 12 V, in amps. */
    freeCurrent: number
    /** Each motor's stall current at 12 V, in amps. */
    stallCurrent: number
  }
  arm: boolean

  /** Whether there are homing switches at the lower and upper hard stops. */
  lowerSwitch: boolean
  upperSwitch: boolean

  /** True while the mechanism presses its lower homing switch. Mechanisms with hard stops say when. */
  lowerSwitchPressed(): boolean {
    return false
  }

  /** True while the mechanism presses its upper homing switch. */
  upperSwitchPressed(): boolean {
    return false
  }

  /** A homing switch at (x, y): lit while it is pressed. */
  drawSwitch(ctx: CanvasRenderingContext2D, x: number, y: number, pressed: boolean): void {
    ctx.fillStyle = pressed ? "#22c55e" : "#444"
    ctx.strokeStyle = pressed ? "#86efac" : "rgba(200, 200, 200, 0.7)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.rect(x - 7, y - 5, 14, 10)
    ctx.fill()
    ctx.stroke()
  }

  /** The telemetry lines for the homing switches there are. */
  switchTelemetry(): string[] {
    const lines: string[] = []
    if (this.lowerSwitch) lines.push(`Lower switch: ${this.lowerSwitchPressed() ? "pressed" : "open"}`)
    if (this.upperSwitch) lines.push(`Upper switch: ${this.upperSwitchPressed() ? "pressed" : "open"}`)
    return lines
  }

  constructor(canvas: HTMLCanvasElement, options: ControlsBaseSimOptions = {}) {
    this.lowerSwitch = options.lowerSwitch ?? false
    this.upperSwitch = options.upperSwitch ?? false
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

    this.statorCurrentLimit = options.statorCurrentLimit
    this.supplyCurrentLimit = options.supplyCurrentLimit
    this.batteryResistance = options.batteryResistance ?? 0
    this.batteryVoltage = NOMINAL_VOLTAGE
    this.supplyCurrent = 0
    this.stalledTime = 0
    this.history = []

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
        freeCurrent: motorDef.freeCurrent,
        stallCurrent: NOMINAL_VOLTAGE / motorDef.resistance,
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
        freeCurrent: neoMotor.freeCurrent,
        stallCurrent: NOMINAL_VOLTAGE / neoMotor.resistance,
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
    this.batteryVoltage = NOMINAL_VOLTAGE
    this.supplyCurrent = 0
    this.stalledTime = 0
    this.history = []
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
    // The chart plots position or velocity, so it starts over.
    this.history = []
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

    // Limit voltage to what the battery has left
    this.voltage = Math.max(-this.batteryVoltage, Math.min(this.batteryVoltage, this.voltage))

    // Calculate motor physics - this updates position, velocity, etc.
    this.updatePhysics()
    this.record()

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

  /** Add this loop to the chart's history: the position (or velocity), its setpoint and the current. */
  record(): void {
    const velocityControl = this.controlMode === "velocity"
    this.history.push({
      time: this.time,
      value: velocityControl ? this.velocity : this.position,
      setpoint: velocityControl ? this.targetVelocity : this.setpoint.position,
      current: this.current / this.motor.count,
    })
    trimSamples(this.history)
  }

  /**
   * The voltage the motor controllers let through, given the back-EMF: they cut it so that each
   * motor draws no more than its stator limit, and no more than its supply limit from the battery.
   */
  limitVoltage(voltage: number, backEmf: number): number {
    const R = this.motor.R
    let limited = voltage
    if (this.statorCurrentLimit !== undefined) {
      const maxCurrent = this.statorCurrentLimit * this.motor.count
      limited = Math.max(backEmf - maxCurrent * R, Math.min(backEmf + maxCurrent * R, limited))
    }
    if (this.supplyCurrentLimit !== undefined && this.batteryVoltage > 0) {
      // Supply current is the stator current scaled by the duty cycle: V (V - E) / (R Vbattery).
      // The most voltage that keeps it to the limit solves V² - E V - limit R Vbattery = 0.
      const direction = Math.sign(limited) || 1
      const maxSupply = this.supplyCurrentLimit * this.motor.count
      const emf = backEmf * direction
      const maxVoltage = (emf + Math.sqrt(emf * emf + 4 * maxSupply * R * this.batteryVoltage)) / 2
      limited = direction * Math.min(limited * direction, maxVoltage)
    }
    return limited
  }

  /**
   * Step the motor one loop, with a load torque held for the loop, and set the currents, the
   * battery's voltage and how long the motor has been stalled. Velocities are in radians per second
   * at the mechanism. The speed settles toward where the motor's torque balances the load, as fast
   * as the back-EMF and the motor's own friction allow: this solves that exactly, where explicit
   * Euler goes unstable for a high gearing on a small inertia.
   */
  stepMotor(velocity: number, inertia: number, loadTorque: number): { velocity: number; distance: number } {
    const kt = this.motor.kt
    const R = this.motor.R
    const voltsPerRadPerSec = 60 / (2 * Math.PI) / this.motor.kv
    // The motor's free current is its friction: it rises with speed to the free current at free
    // speed, as ReCalc models it, and its torque is lost.
    const freeSpeed = NOMINAL_VOLTAGE / voltsPerRadPerSec
    const friction = (kt * this.motor.freeCurrent * this.motor.count) / freeSpeed // N-m per rad/s
    // How hard the back-EMF and the friction slow the mechanism, in N-m per rad/s.
    const damping = (kt * voltsPerRadPerSec) / R + friction
    const rate = damping / inertia

    // The motor controllers apply their current limits every millisecond, as the speed changes.
    const commanded = this.voltage
    const substeps = Math.max(1, Math.round(this.dt / CURRENT_LIMIT_PERIOD))
    const h = this.dt / substeps
    const decay = Math.exp(-rate * h)
    let next = velocity
    let distance = 0
    for (let i = 0; i < substeps; i++) {
      this.voltage = this.limitVoltage(commanded, voltsPerRadPerSec * next)
      const settledVelocity = ((kt * this.voltage) / R - loadTorque) / damping
      distance += settledVelocity * h + ((next - settledVelocity) * (1 - decay)) / rate
      next = settledVelocity + (next - settledVelocity) * decay
      this.current = (this.voltage - voltsPerRadPerSec * next) / R
      this.supplyCurrent = this.batteryVoltage > 0 ? (this.current * this.voltage) / this.batteryVoltage : 0
      // The battery sags with what it supplies.
      this.batteryVoltage = Math.max(0, NOMINAL_VOLTAGE - this.batteryResistance * this.supplyCurrent)
    }

    // Stalled: barely turning while each motor draws close to its stator limit, or a quarter of its
    // stall current with no limit.
    const perMotorCurrent = Math.abs(this.current) / this.motor.count
    const stallThreshold =
      this.statorCurrentLimit !== undefined ? 0.95 * this.statorCurrentLimit : 0.25 * this.motor.stallCurrent
    const stalled = Math.abs(next) < 0.05 * freeSpeed && perMotorCurrent >= stallThreshold
    this.stalledTime = stalled ? this.stalledTime + this.dt : 0

    return { velocity: next, distance }
  }

  /** A warning when the motors have been stalled at a high current for a while, or null. */
  stallWarning(): string | null {
    if (this.stalledTime < STALL_WARNING_SECONDS) return null
    const perMotor = Math.abs(this.current) / this.motor.count
    return `Stalled at ${perMotor.toFixed(0)} A for ${this.stalledTime.toFixed(1)} s: can't move this load, would overheat`
  }

  /** Draw the mechanism, then any warning over it. */
  render(): void {
    this.draw()
    const warning = this.stallWarning()
    if (warning === null || !this.ctx?.fillText) return
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = "rgba(127, 29, 29, 0.85)"
    // Along the bottom, clear of the readout in the top left.
    ctx.fillRect(0, this.height - 32, this.width, 32)
    ctx.fillStyle = "#fecaca"
    ctx.font = "bold 14px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(warning, this.width / 2, this.height - 16)
    ctx.restore()
  }


  draw(): void {
    // Override in subclasses
    this.ctx.clearRect(0, 0, this.width, this.height)
  }
}
