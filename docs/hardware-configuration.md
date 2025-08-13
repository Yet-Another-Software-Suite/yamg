# Hardware Configuration Guide

This document explains how to add support for new motors and motor controllers to the FRC Mechanism Code Generator.

## Overview

The hardware configuration system is designed to make it easy to add new motors and motor controllers without having to modify multiple files throughout the codebase. All hardware definitions are centralized in a single configuration file.

## Configuration Files

The main configuration file is located at:

```
lib/config/hardware-config.ts
```

This file contains definitions for:

- Motors
- Motor controllers
- Mechanisms
- Helper functions for working with hardware

## Adding a New Motor

To add a new motor, follow these steps:

1. Open `lib/config/hardware-config.ts`
2. Add a new entry to the `MOTORS` object:

```typescript
MOTORS: Record<string, MotorDefinition> = {
  // Existing motors...

  // Add your new motor here
  NewMotor: {
    name: "NewMotor",
    displayName: "New Motor",
    kv: 500, // RPM/V
    kt: 0.02, // N-m/A
    resistance: 0.1, // Ohms per motor
    mass: 0.35, // kg per motor
    compatibleControllers: ["SparkMAX", "TalonFX"], // List compatible controllers
    description: "Description of the new motor",
  },
};
```

3. Update the `getWPILibMotorType` function to return the appropriate WPILib DCMotor type:

```typescript
export function getWPILibMotorType(motorName: string): string {
  switch (motorName) {
    // Existing cases...

    case "NewMotor":
      return "DCMotor.getNewMotor(1)"; // Or closest approximation

    default:
      return "DCMotor.getNEO(1)";
  }
}
```

4. Update the `getSimMotorType` function to return the appropriate simulation motor type:

```typescript
export function getSimMotorType(motorName: string): string {
  switch (motorName) {
    // Existing cases...

    case "NewMotor":
      return "NewMotor"; // Or closest approximation

    default:
      return "NEO";
  }
}
```

## Adding a New Motor Controller

To add a new motor controller, follow these steps:

1. Open `lib/config/hardware-config.ts`
2. Add a new entry to the `MOTOR_CONTROLLERS` object:

```typescript
MOTOR_CONTROLLERS: Record<string, MotorControllerDefinition> = {
  // Existing controllers...

  // Add your new controller here
  NewController: {
    name: "NewController",
    displayName: "New Controller",
    supportsCurrentLimit: true,
    supportsSupplyCurrentLimit: false,
    supportsBrakeMode: true,
    supportsRampRate: true,
    supportsSoftLimits: true,
    importPath: "com.example.NewController",
    description: "Description of the new controller",
    maxCurrentLimit: 80,
    maxVoltage: 12,
  },
};
```

3. Create a new file in the `lib/motor-controllers` directory:

```
lib/motor-controllers/new-controller.ts
```

4. Implement the required functions in the new file:

```typescript
export const getImports = () => `import com.example.NewController;
import com.example.NewController.Mode;
// Add other necessary imports`;

export const getDeclaration = () => `private final NewController motor;
private final NewEncoder encoder;
// Add other necessary declarations`;

export const getInitialization = () => `motor = new NewController(canID);
motor.setMode(brakeMode ? Mode.Brake : Mode.Coast);
// Add other initialization code`;

export const getMethods = () => ({
  getPositionMethod: `return motor.getPosition() / gearRatio;`,
  getVelocityMethod: `return motor.getVelocity() / gearRatio;`,
  setPositionMethod: `double adjustedPosition = position * gearRatio;
motor.setPosition(adjustedPosition, feedforward.calculate(getVelocity(), acceleration));`,
  setVelocityMethod: `double adjustedVelocity = velocity * gearRatio;
motor.setVelocity(adjustedVelocity, feedforward.calculate(velocity, acceleration));`,
  setVoltageMethod: `motor.setVoltage(voltage);`,
  getVoltageMethod: `return motor.getVoltage();`,
  getCurrentMethod: `return motor.getCurrent();`,
  getTemperatureMethod: `return motor.getTemperature();`,
});
```

5. Update the `lib/motor-controllers/index.ts` file to include your new controller:

```typescript
import * as NewController from "./new-controller";

export const getMotorControllerModule = (type: string) => {
  switch (type) {
    // Existing cases...

    case "NewController":
      return NewController;

    default:
      throw new Error(`Unknown motor controller type: ${type}`);
  }
};
```

## Adding a New Mechanism Type

To add a new mechanism type, follow these steps:

1. Open `lib/config/hardware-config.ts`
2. Add a new entry to the `MECHANISMS` object:

```typescript
MECHANISMS: Record<string, MechanismDefinition> = {
  // Existing mechanisms...

  // Add your new mechanism here
  NewMechanism: {
    name: "NewMechanism",
    displayName: "New Mechanism",
    description: "Description of the new mechanism",
    templateName: "new-mechanism-subsystem",
    simClassName: "NewMechanismSim",
    requiresGravityCompensation: true,
  },
};
```

3. Create a new template file in the `public/templates` directory:

```
public/templates/new-mechanism-subsystem.java.hbs
```

4. Create a new simulation file in the `public/templates` directory:

```
public/templates/new-mechanism-sim.java.hbs
```

5. Update the `lib/simulation/simulation-config.ts` file to include your new mechanism:

```typescript
export function createSimulationOptions(
  formValues: FormValues,
  canvas: HTMLCanvasElement,
): { simType: string; options: ControlsBaseSimOptions } {
  // Existing code...

  switch (formValues.mechanismType) {
    // Existing cases...

    case "NewMechanism": {
      const newMechanismOptions = {
        ...commonOptions,
        // Add mechanism-specific options
      };
      return { simType: "NewMechanismSim", options: newMechanismOptions };
    }

    default:
      throw new Error(`Unknown mechanism type: ${formValues.mechanismType}`);
  }
}
```

6. Create a new simulation class in the `lib/simulation` directory if needed:

```
lib/simulation/new-mechanism-sim.ts
```

## Testing Your Changes

After adding new hardware, test your changes by:

1. Running the application locally
2. Selecting your new motor or motor controller in the form
3. Generating code and verifying it compiles correctly
4. Testing the simulation to ensure it works as expected

## Best Practices

- Keep motor and controller names consistent with manufacturer documentation
- Use accurate motor constants for simulation
- Document any limitations or special considerations for new hardware
- Test thoroughly with different combinations of motors and controllers
