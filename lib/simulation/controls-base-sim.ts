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
  motor: {
    kv: number
    kt: number
    R: number
    m: number
    gearing: number
  }

  constructor(canvas: HTMLCanvasElement, options: any = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.width = canvas.width
    this.height = canvas.height
    this.time = 0
    this.dt = 0.02 // 20ms update rate
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

  configureMotor(options: any) {
    // Default motor is a NEO
    const motorType = options.motorType || "NEO"
    const gearing = options.gearing || 1.0
    const motorCount = options.motorCount || 1

    // Motor constants based on type
    const motorConstants: Record<string, { kv: number; kt: number; R: number; m: number }> = {
      NEO: { kv: 473, kt: 0.025, R: 0.116 / motorCount, m: 0.425 * motorCount },
      NEO550: { kv: 774, kt: 0.015, R: 0.08 / motorCount, m: 0.235 * motorCount },
      Falcon500: { kv: 577, kt: 0.019, R: 0.115 / motorCount, m: 0.31 * motorCount },
      KrakenX60: { kv: 590, kt: 0.021, R: 0.1 / motorCount, m: 0.39 * motorCount },
      KrakenX40: { kv: 590, kt: 0.014, R: 0.15 / motorCount, m: 0.26 * motorCount },
    }

    const constants = motorConstants[motorType] || motorConstants["NEO"]

    this.motor = {
      kv: constants.kv / gearing, // RPM/V
      kt: constants.kt * gearing, // N-m/A
      R: constants.R, // Ohms
      m: constants.m, // kg
      gearing: gearing,
    }
  }

  reset() {
    this.position = 0
    this.velocity = 0
    this.acceleration = 0
    this.voltage = 0
    this.current = 0
    this.integral = 0
    this.prevError = 0
    this.time = 0
  }

  setTarget(target: number) {
    this.target = target
  }

  setTargetVelocity(velocity: number) {
    this.targetVelocity = velocity
  }

  setControlMode(mode: string) {
    this.controlMode = mode
  }

  calculateFeedforward(velocity: number, acceleration: number) {
    // Calculate feedforward voltage
    const gravityComponent = this.kG || 0
    const staticComponent = this.kS * Math.sign(velocity)
    const velocityComponent = this.kV * velocity
    const accelerationComponent = this.kA * acceleration

    return staticComponent + velocityComponent + accelerationComponent + gravityComponent
  }

  calculatePID(error: number) {
    // Calculate PID output
    this.integral += error * this.dt
    const derivative = (error - this.prevError) / this.dt
    this.prevError = error

    return this.kP * error + this.kI * this.integral + this.kD * derivative
  }

  update(dt?: number) {
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

    // Calculate motor physics
    this.updatePhysics()
  }

  updatePhysics() {
    // Override in subclasses
  }

  draw() {
    // Override in subclasses
    this.ctx.clearRect(0, 0, this.width, this.height)
  }
}
