// Arm Simulation
class ArmSim extends ControlsBaseSim {
  constructor(canvas, options = {}) {
    super(canvas, options)

    // Arm specific parameters
    this.length = options.length || 1.0 // meters
    this.mass = options.mass || 5.0 // kg
    this.moi = options.moi || (this.mass * this.length * this.length) / 3 // kg*m^2
    this.minAngle = options.minAngle !== undefined ? options.minAngle : -Math.PI / 2
    this.maxAngle = options.maxAngle !== undefined ? options.maxAngle : Math.PI / 2
    this.startingAngle = options.startingAngle !== undefined ? options.startingAngle : 0

    // Initialize position
    this.position = this.startingAngle

    // Override kG with calculated gravity compensation
    this.kG =
      options.kG !== undefined ? options.kG : (this.mass * 9.81 * this.length) / 2 / (this.motor.kt / this.motor.R)
  }

  updatePhysics() {
    // Calculate torque from voltage
    const backEmf = this.velocity * (1 / this.motor.kv) * ((2 * Math.PI) / 60) // V
    this.current = (this.voltage - backEmf) / this.motor.R // A
    const motorTorque = this.current * this.motor.kt // N-m

    // Calculate gravity torque
    const gravityTorque = this.mass * 9.81 * (this.length / 2) * Math.sin(this.position) // N-m

    // Calculate net torque
    const netTorque = motorTorque - gravityTorque // N-m

    // Calculate acceleration
    this.acceleration = netTorque / this.moi // rad/s^2

    // Update velocity and position using semi-implicit Euler
    this.velocity += this.acceleration * this.dt // rad/s
    this.position += this.velocity * this.dt // rad

    // Apply limits
    if (this.position < this.minAngle) {
      this.position = this.minAngle
      this.velocity = Math.max(0, this.velocity)
    }
    if (this.position > this.maxAngle) {
      this.position = this.maxAngle
      this.velocity = Math.min(0, this.velocity)
    }
  }

  draw() {
    const ctx = this.ctx
    const width = this.width
    const height = this.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set origin to center-bottom of canvas
    const originX = width / 2
    const originY = height * 0.8

    // Calculate arm endpoint
    const scale = Math.min(width, height) * 0.4 // Scale arm to fit canvas
    const armLength = this.length * scale
    const endX = originX + armLength * Math.sin(this.position)
    const endY = originY - armLength * Math.cos(this.position)

    // Draw base
    ctx.fillStyle = "#333"
    ctx.beginPath()
    ctx.rect(originX - 20, originY - 10, 40, 20)
    ctx.fill()

    // Draw arm
    ctx.strokeStyle = "#0066cc"
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(originX, originY - 10)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // Draw joint
    ctx.fillStyle = "#666"
    ctx.beginPath()
    ctx.arc(originX, originY - 10, 8, 0, Math.PI * 2)
    ctx.fill()

    // Draw end effector
    ctx.fillStyle = "#cc0000"
    ctx.beginPath()
    ctx.arc(endX, endY, 12, 0, Math.PI * 2)
    ctx.fill()

    // Draw angle markers
    this.drawAngleMarkers(ctx, originX, originY - 10)

    // Draw telemetry
    this.drawTelemetry(ctx)
  }

  drawAngleMarkers(ctx, x, y) {
    const radius = 40

    // Draw angle arc
    ctx.strokeStyle = "rgba(100, 100, 100, 0.5)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, radius, -this.maxAngle, -this.minAngle)
    ctx.stroke()

    // Draw current angle marker
    ctx.strokeStyle = "#00cc00"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + radius * Math.sin(this.position), y - radius * Math.cos(this.position))
    ctx.stroke()

    // Draw target angle marker
    ctx.strokeStyle = "#ff6600"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + radius * Math.sin(this.target), y - radius * Math.cos(this.target))
    ctx.stroke()
  }

  drawTelemetry(ctx) {
    ctx.font = "14px Arial"
    ctx.fillStyle = "#fff"
    ctx.textAlign = "left"

    const textX = 10
    let textY = 20
    const lineHeight = 20

    // Draw telemetry data
    ctx.fillText(`Angle: ${((this.position * 180) / Math.PI).toFixed(1)}°`, textX, textY)
    textY += lineHeight
    ctx.fillText(`Target: ${((this.target * 180) / Math.PI).toFixed(1)}°`, textX, textY)
    textY += lineHeight
    ctx.fillText(`Velocity: ${((this.velocity * 180) / Math.PI).toFixed(1)}°/s`, textX, textY)
    textY += lineHeight
    ctx.fillText(`Voltage: ${this.voltage.toFixed(2)} V`, textX, textY)
    textY += lineHeight
    ctx.fillText(`Current: ${this.current.toFixed(2)} A`, textX, textY)
  }
}

// Make the class available globally
window.ArmSim = ArmSim
