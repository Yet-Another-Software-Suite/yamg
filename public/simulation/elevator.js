// Elevator Simulation
class ElevatorSim extends ControlsBaseSim {
  constructor(canvas, options = {}) {
    super(canvas, options);

    // Elevator specific parameters
    this.mass = options.mass || 5.0; // kg
    this.drumRadius = options.drumRadius || 0.0254; // meters (1 inch)
    this.minHeight = options.minHeight !== undefined ? options.minHeight : 0;
    this.maxHeight = options.maxHeight !== undefined ? options.maxHeight : 1.0;
    this.startingHeight =
      options.startingHeight !== undefined
        ? options.startingHeight
        : this.minHeight;

    // Initialize position
    this.position = this.startingHeight;

    // Override kG with calculated gravity compensation
    this.kG =
      options.kG !== undefined
        ? options.kG
        : (this.mass * 9.81 * this.drumRadius) / (this.motor.kt / this.motor.R);
  }

  updatePhysics() {
    // Convert linear position/velocity to rotational
    const rotPosition = this.position / this.drumRadius;
    const rotVelocity = this.velocity / this.drumRadius;

    // Calculate torque from voltage
    const backEmf = rotVelocity * (1 / this.motor.kv) * ((2 * Math.PI) / 60); // V
    this.current = (this.voltage - backEmf) / this.motor.R; // A
    const motorTorque = this.current * this.motor.kt; // N-m

    // Calculate gravity torque
    const gravityTorque = this.mass * 9.81 * this.drumRadius; // N-m

    // Calculate net torque
    const netTorque = motorTorque - gravityTorque; // N-m

    // Calculate rotational inertia (J = m*r²)
    const rotInertia = this.mass * this.drumRadius * this.drumRadius;

    // Calculate rotational acceleration
    const rotAcceleration = netTorque / rotInertia; // rad/s²

    // Convert back to linear acceleration
    this.acceleration = rotAcceleration * this.drumRadius; // m/s²

    // Update velocity and position using semi-implicit Euler
    this.velocity += this.acceleration * this.dt; // m/s
    this.position += this.velocity * this.dt; // m

    // Apply limits
    if (this.position < this.minHeight) {
      this.position = this.minHeight;
      this.velocity = Math.max(0, this.velocity);
    }
    if (this.position > this.maxHeight) {
      this.position = this.maxHeight;
      this.velocity = Math.min(0, this.velocity);
    }
  }

  draw() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate dimensions
    const elevatorWidth = width * 0.2;
    const maxElevatorHeight = height * 0.7;
    const baseHeight = height * 0.1;
    const leftMargin = width * 0.3;

    // Calculate elevator position
    const elevatorHeight = 80;
    const elevatorTravel = this.maxHeight - this.minHeight;
    const normalizedPosition =
      (this.position - this.minHeight) / elevatorTravel;
    const elevatorY =
      height -
      baseHeight -
      elevatorHeight -
      normalizedPosition * maxElevatorHeight;

    // Draw elevator shaft
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.rect(
      leftMargin,
      height - baseHeight - maxElevatorHeight - elevatorHeight,
      elevatorWidth,
      maxElevatorHeight + elevatorHeight,
    );
    ctx.fill();

    // Draw elevator carriage
    ctx.fillStyle = "#0066cc";
    ctx.beginPath();
    ctx.rect(leftMargin - 10, elevatorY, elevatorWidth + 20, elevatorHeight);
    ctx.fill();

    // Draw base
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.rect(
      leftMargin - 20,
      height - baseHeight,
      elevatorWidth + 40,
      baseHeight,
    );
    ctx.fill();

    // Draw height markers
    this.drawHeightMarkers(
      ctx,
      leftMargin,
      height - baseHeight,
      maxElevatorHeight,
    );

    // Draw telemetry
    this.drawTelemetry(ctx);
  }

  drawHeightMarkers(ctx, x, baseY, maxHeight) {
    const markerWidth = 5;
    const markerSpacing = maxHeight / 10;

    // Draw height scale
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const y = baseY - i * markerSpacing;
      ctx.beginPath();
      ctx.moveTo(x - markerWidth * 2, y);
      ctx.lineTo(x - markerWidth, y);
      ctx.stroke();

      // Add height label
      if (i % 2 === 0) {
        const heightValue =
          this.minHeight + (i / 10) * (this.maxHeight - this.minHeight);
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`${heightValue.toFixed(2)}m`, x - markerWidth * 3, y + 4);
      }
    }

    // Draw current position marker
    const normalizedPosition =
      (this.position - this.minHeight) / (this.maxHeight - this.minHeight);
    const currentY = baseY - normalizedPosition * maxHeight;

    ctx.strokeStyle = "#00cc00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - markerWidth * 3, currentY);
    ctx.lineTo(x - markerWidth, currentY);
    ctx.stroke();

    // Draw target position marker
    const normalizedTarget =
      (this.target - this.minHeight) / (this.maxHeight - this.minHeight);
    const targetY = baseY - normalizedTarget * maxHeight;

    ctx.strokeStyle = "#ff6600";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - markerWidth * 3, targetY);
    ctx.lineTo(x - markerWidth, targetY);
    ctx.stroke();
  }

  drawTelemetry(ctx) {
    ctx.font = "14px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";

    const textX = 10;
    let textY = 20;
    const lineHeight = 20;

    // Draw telemetry data
    ctx.fillText(`Height: ${this.position.toFixed(3)}m`, textX, textY);
    textY += lineHeight;
    ctx.fillText(`Target: ${this.target.toFixed(3)}m`, textX, textY);
    textY += lineHeight;
    ctx.fillText(`Velocity: ${this.velocity.toFixed(3)}m/s`, textX, textY);
    textY += lineHeight;
    ctx.fillText(`Voltage: ${this.voltage.toFixed(2)}V`, textX, textY);
    textY += lineHeight;
    ctx.fillText(`Current: ${this.current.toFixed(2)}A`, textX, textY);
  }
}

// Make the class available globally
window.ElevatorSim = ElevatorSim;

// Log that the script has loaded
console.log("ElevatorSim loaded and assigned to window");

//Declare ControlsBaseSim
class ControlsBaseSim {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.dt = options.dt || 0.02; // Seconds
    this.motor = options.motor || {
      // Default motor parameters
      kt: 0.018, // Torque constant, N-m/A
      kv: 5200, // Speed constant, RPM/V
      R: 1.4, // Resistance, Ohms
    };

    this.kG = options.kG || 0; // Gravity compensation, N-m/V
    this.kP = options.kP || 0; // Proportional gain
    this.kI = options.kI || 0; // Integral gain
    this.kD = options.kD || 0; // Derivative gain

    this.voltage = 0; // Volts
    this.position = 0; // Meters
    this.velocity = 0; // Meters/second
    this.acceleration = 0; // Meters/second^2
    this.target = 0; // Target position, meters
    this.errorSum = 0; // Integral error sum

    this.loop = this.loop.bind(this);
    this.lastTime = performance.now();
    this.running = false;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000; // Delta time in seconds
    this.dt = dt;
    this.lastTime = now;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.updatePhysics(dt);
    this.updateControl(dt);
  }

  updatePhysics(dt) {
    // Basic physics update - override in subclass
    this.acceleration = 0;
    this.velocity += this.acceleration * dt;
    this.position += this.velocity * dt;
  }

  updateControl(dt) {
    // Simple PID control
    const error = this.target - this.position;
    this.errorSum += error * dt;
    const errorRate = (error - this.lastError) / dt;

    this.voltage =
      this.kG + this.kP * error + this.kI * this.errorSum + this.kD * errorRate;
    this.voltage = Math.max(-12, Math.min(12, this.voltage)); // Clamp voltage

    this.lastError = error;
  }

  draw() {
    // Drawing logic - override in subclass
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = "#eee";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
