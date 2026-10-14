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
    kv: 500,           // RPM/V
    kt: 0.020,         // N-m/A
    resistance: 0.100, // Ohms per motor
    mass: 0.350,       // kg per motor
    compatibleControllers: ["SparkMAX", "TalonFX"], // List compatible controllers
    description: "Description of the new motor"
  },
}
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
    maxVoltage: 12
  },
}
```

3. Write the controller's partials. Each output has its own file, which defines Handlebars inline partials that the mechanism templates use:

```
public/templates/vendor/controllers/NewController.hbs
public/templates/yams/controllers/NewController.hbs
```

The vendor file defines `imports`, `fields`, `configure`, `getMechanismPosition`, `getMechanismVelocity`, `getVoltage`, `getCurrent`, `getTemperature`, `setMechanismPosition`, `setMechanismVelocity`, `setMotorVoltage`, `simFields`, `simInit`, `simPrepare`, `simAppliedVoltage` and `simUpdate`. Use WPILib units (`Angle`, `AngularVelocity`, `Voltage` and the rest) rather than `double`, and work in turns of the mechanism. A controller that takes the gearing in its config, like a Talon's `SensorToMechanismRatio`, should use it; one that cannot, like a SPARK, multiplies by `GEAR_RATIO` itself. `simUpdate` is given the simulated `mechanismPosition`, `mechanismVelocity` and `mechanismAcceleration`.

A controller that can run the trapezoidal profile and the feedforward itself, like a Talon (Motion Magic) or a SPARK (MAXMotion), also defines `setMechanismGoal` and `setMechanismGoalVelocity`, and is listed in `onboardControl` in `lib/code-generator.ts`. One whose simulation cannot run them, like a SPARK, is also listed in `systemCoreProfile`, so that WPILib's profile and feedforward run in simulation instead:

```handlebars
{{#*inline "imports"}}
import com.example.NewController;
{{/inline}}
{{#*inline "fields"}}
  private final NewController motor = new NewController(CAN_ID);
{{/inline}}
{{#*inline "getMechanismPosition"}}
    return Rotations.of(motor.getRotorPosition()).div(GEAR_RATIO);
{{/inline}}
```

The YAMS file defines `imports` and `fields`. `fields` creates the vendor object and the YAMS `SmartMotorController` named `motor`:

```handlebars
{{#*inline "imports"}}
import com.example.NewController;
import yams.core.motorcontrollers.local.NewControllerWrapper;
{{/inline}}
{{#*inline "fields"}}
  private final NewController controller = new NewController({{canId}});
  private final SmartMotorController motor = new NewControllerWrapper(controller, {{dcMotor}}, smcConfig);
{{/inline}}
```

4. Add the controller to `CONTROLLERS` in `tests/generator.test.ts`, and run the tests. To compile what they render, set `YAMG_RENDER_DIR` and copy the files into a WPILib 2027 project.

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
    simClassName: "NewMechanismSim",
    requiresGravityCompensation: true
  },
}
```

3. Create one template for each output and command framework:

```
public/templates/vendor/v2/new-mechanism.java.hbs
public/templates/vendor/v3/new-mechanism.java.hbs
public/templates/yams/v2/new-mechanism.java.hbs
public/templates/yams/v3/new-mechanism.java.hbs
```

Add the mechanism to `MECHANISM_FILES` in `lib/code-generator.ts`.

4. Add the mechanism to `MECHANISMS` in `tests/generator.test.ts`, and run the tests.

5. Update the `lib/simulation/simulation-config.ts` file to include your new mechanism:

```typescript
export function createSimulationOptions(
  formValues: FormValues,
  canvas: HTMLCanvasElement
): { simType: string; options: ControlsBaseSimOptions } {
  // Existing code...
  
  switch (formValues.mechanismType) {
    // Existing cases...
    
    case "NewMechanism": {
      const newMechanismOptions = {
        ...commonOptions,
        // Add mechanism-specific options
      }
      return { simType: "NewMechanismSim", options: newMechanismOptions }
    }
    
    default:
      throw new Error(`Unknown mechanism type: ${formValues.mechanismType}`)
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
