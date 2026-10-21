import { ControlsBaseSim, type ControlsBaseSimOptions } from "@/lib/simulation/controls-base-sim"

/**
 * Options specific to the flywheel simulation
 */
export interface FlywheelSimOptions extends ControlsBaseSimOptions {
  // Flywheel specific parameters
  momentOfInertia?: number
}

/**
 * Flywheel Simulation class for FRC flywheel mechanisms (shooters, launchers)
 */
export class FlywheelSim extends ControlsBaseSim {
  momentOfInertia: number

  constructor(canvas: HTMLCanvasElement, options: FlywheelSimOptions = {}) {
    super(canvas, options)

    // Flywheel specific parameters
    this.momentOfInertia = options.momentOfInertia || 0.0025 // kg*m^2

    // Flywheels are velocity controlled and have no gravity effects
    this.controlMode = "velocity"
    this.kG = 0
  }

  override updatePhysics(): void {
    // No gravity or position limits - pure rotational inertia
    const last = this.velocity
    const step = this.stepMotor(this.velocity, this.momentOfInertia, 0)
    this.velocity = step.velocity // rad/s
    this.position += step.distance // rad (unbounded, used for spin visualization only)
    this.acceleration = (this.velocity - last) / this.dt // rad/s^2

    // Debug log every 50 frames (approximately once per second)
    if (Math.round(this.time * 50) % 50 === 0) {
      console.debug("Flywheel sim update:", {
        velocity: this.velocity,
        acceleration: this.acceleration,
        voltage: this.voltage,
        current: this.current,
        targetVelocity: this.targetVelocity,
      })
    }
  }

  override draw(): void {
    const ctx = this.ctx
    const width = this.width
    const height = this.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.3

    // Draw flywheel disc
    ctx.fillStyle = "#333"
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "#666"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw spokes to visualize spin
    const spokeCount = 4
    ctx.strokeStyle = "#2d6fbf"
    ctx.lineWidth = 6
    for (let i = 0; i < spokeCount; i++) {
      const angle = this.position + (i * Math.PI * 2) / spokeCount
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle))
      ctx.stroke()
    }

    // Draw hub
    ctx.fillStyle = "#cc0000"
    ctx.beginPath()
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
    ctx.fill()

    // Draw telemetry
    this.drawTelemetry(ctx)
  }

  drawTelemetry(ctx: CanvasRenderingContext2D): void {
    ctx.font = "14px Arial"
    ctx.fillStyle = "#fff"
    ctx.textAlign = "left"

    const textX = 10
    let textY = 20
    const lineHeight = 20

    const rpm = (this.velocity * 60) / (2 * Math.PI)
    const targetRpm = (this.targetVelocity * 60) / (2 * Math.PI)

    // Draw telemetry data
    ctx.fillText(`Velocity: ${rpm.toFixed(0)} RPM`, textX, textY)
    textY += lineHeight
    ctx.fillText(`Target: ${targetRpm.toFixed(0)} RPM`, textX, textY)
    textY += lineHeight
    ctx.fillText(`Voltage: ${this.voltage.toFixed(2)} V`, textX, textY)
    textY += lineHeight
    ctx.fillText(`Current: ${this.current.toFixed(2)} A`, textX, textY)
  }
}
