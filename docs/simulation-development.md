# Simulation Development Guide

This document provides detailed information about how the simulation system works internally and how to modify or extend it.

## Simulation Architecture

The simulation system is built around a class hierarchy:

```
ControlsBaseSim (Base class)
├── ArmSim
└── ElevatorSim
```

### Core Files

- `lib/simulation/controls-base-sim.ts`: Base simulation class with common functionality
- `lib/simulation/arm-sim.ts`: Arm-specific simulation
- `lib/simulation/elevator-sim.ts`: Elevator-specific simulation
- `lib/simulation/index.ts`: Exports for the simulation classes
- `components/simulation-component.tsx`: React component that manages the simulation
- `components/simulation-tab.tsx`: Tab container for the simulation

## How the Simulation Works

### Physics Model

The simulation implements a simplified physics model based on the WPILib simulation classes:

1. **Motor Model**:
   ```typescript
   // Motor constants based on type
   const motorConstants = {
     NEO: { kv: 473, kt: 0.025, R: 0.116 / motorCount, m: 0.425 * motorCount },
     NEO550: { kv: 774, kt: 0.015, R: 0.08 / motorCount, m: 0.235 * motorCount },
     Falcon500: { kv: 577, kt: 0.019, R: 0.115 / motorCount, m: 0.31 * motorCount },
     KrakenX60: { kv: 590, kt: 0.021, R: 0.1 / motorCount, m: 0.39 * motorCount },
     KrakenX44: { kv: 590, kt: 0.014, R: 0.15 / motorCount, m: 0.26 * motorCount },
   }
   ```

2. **Control System**:
   ```typescript
   // PID Control
   calculatePID(error: number): number {
     this.integral += error * this.dt;
     const derivative = (error - this.prevError) / this.dt;
     this.prevError = error;
     return this.kP * error + this.kI * this.integral + this.kD * derivative;
   }

   // Feedforward
   calculateFeedforward(velocity: number, acceleration: number): number {
     const gravityComponent = this.kG || 0;
     const staticComponent = this.kS * Math.sign(velocity);
     const velocityComponent = this.kV * velocity;
     const accelerationComponent = this.kA * acceleration;
     return staticComponent + velocityComponent + accelerationComponent + gravityComponent;
   }
   ```

3. **Mechanism-Specific Physics**:
   - **Arm**: Rotational dynamics with gravity torque
     ```typescript
     // Calculate gravity torque
     const gravityTorque = this.mass * 9.81 * (this.length / 2) * Math.sin(this.position);
     // Calculate net torque
     const netTorque = motorTorque - gravityTorque;
     // Calculate acceleration
     this.acceleration = netTorque / this.moi;
     ```

   - **Elevator**: Linear dynamics with gravity force
     ```typescript
     // Calculate gravity torque
     const gravityTorque = this.mass * 9.81 * this.drumRadius;
     // Calculate net torque
     const netTorque = motorTorque - gravityTorque;
     // Calculate rotational acceleration
     const rotAcceleration = netTorque / rotInertia;
     // Convert to linear acceleration
     this.acceleration = rotAcceleration * this.drumRadius;
     ```

### Animation Loop

The animation loop is managed in `simulation-component.tsx`:

```typescript
// Animation function that gets called repeatedly
const animate = () => {
  // Update simulation with fixed time step for consistent physics
  simInstance.update(0.02); // 20ms fixed time step

  // Draw the updated state
  simInstance.draw();

  // Continue the animation loop
  if (isRunning) {
    animationRef.current = requestAnimationFrame(animate);
  }
};
```

## Extending the Simulation

### Adding a New Mechanism Type

To add a new mechanism type (e.g., a differential drive):

1. Create a new class that extends `ControlsBaseSim`:

```typescript
// lib/simulation/differential-drive-sim.ts
import { ControlsBaseSim, type ControlsBaseSimOptions } from "@/lib/simulation/controls-base-sim";

export interface DifferentialDriveSimOptions extends ControlsBaseSimOptions {
  trackWidth?: number;
  wheelRadius?: number;
}

export class DifferentialDriveSim extends ControlsBaseSim {
  trackWidth: number;
  wheelRadius: number;
  
  constructor(canvas: HTMLCanvasElement, options: DifferentialDriveSimOptions = {}) {
    super(canvas, options);
    
    this.trackWidth = options.trackWidth || 0.5; // meters
    this.wheelRadius = options.wheelRadius || 0.1; // meters
    
    // Initialize other properties
  }
  
  override updatePhysics(): void {
    // Implement differential drive physics
  }
  
  override draw(): void {
    // Implement differential drive visualization
  }
}
```

2. Export the new class in `lib/simulation/index.ts`:

```typescript
export { DifferentialDriveSim, type DifferentialDriveSimOptions } from "@/lib/simulation/differential-drive-sim";
```

3. Update `simulation-component.tsx` to handle the new mechanism type:

```typescript
// In the useEffect that initializes the simulation
switch (formValues.mechanismType) {
  case "Arm":
    // ...
  case "Elevator":
    // ...
  case "DifferentialDrive":
    sim = new DifferentialDriveSim(canvas, {
      trackWidth: formValues.driveParams?.trackWidth || 0.5,
      wheelRadius: formValues.driveParams?.wheelRadius || 0.1,
      // ...other parameters
    });
    break;
}
```

### Modifying Existing Simulations

To modify an existing simulation:

1. **Changing Physics Model**:
   - Update the `updatePhysics` method in the appropriate simulation class
   - For example, to add friction to the arm simulation:

   ```typescript
   // In arm-sim.ts
   override updatePhysics(): void {
     // Existing code...
     
     // Add friction
     const frictionTorque = 0.1 * Math.sign(this.velocity);
     const netTorque = motorTorque - gravityTorque - frictionTorque;
     
     // Rest of the method...
   }
   ```

2. **Changing Visualization**:
   - Update the `draw` method in the appropriate simulation class
   - For example, to change the arm color:

   ```typescript
   // In arm-sim.ts
   override draw(): void {
     // Existing code...
     
     // Change arm color
     ctx.strokeStyle = "#ff0000"; // Red instead of blue
     
     // Rest of the method...
   }
   ```

## Debugging the Simulation

The simulation includes debug logging that can be enabled in the browser console:

1. Open your browser's developer tools (F12 or Ctrl+Shift+I)
2. Go to the Console tab
3. Set the log level to include "Verbose" or "Debug"

Debug logs are output at regular intervals:

```typescript
// Debug log every 50 frames (approximately once per second)
if (Math.round(this.time * 50) % 50 === 0) {
  console.debug("Arm sim update:", {
    position: this.position,
    velocity: this.velocity,
    acceleration: this.acceleration,
    voltage: this.voltage,
    current: this.current,
    target: this.target,
  });
}
```

## Performance Considerations

The simulation is designed to run at 60 FPS with a fixed physics time step of 20ms. If you're adding complex physics calculations, consider:

1. **Optimizing Calculations**: Avoid unnecessary calculations in the update loop
2. **Reducing Draw Calls**: Minimize the number of draw calls in the `draw` method
3. **Using RequestAnimationFrame**: The simulation already uses `requestAnimationFrame` for optimal performance

## Testing Simulation Changes

To test changes to the simulation:

1. Make your changes to the simulation classes
2. Run the development server: `pnpm dev`
3. Open the application and navigate to the Simulation tab
4. Test with different mechanism parameters
5. Check the browser console for any errors or debug output
