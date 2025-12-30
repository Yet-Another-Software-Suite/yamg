export const getImports = () => `import com.thriftybot.devices.ThriftyNova;`

export const getDeclaration = () => `private final ThriftyNova motor;`

export const getInitialization = () => `motor = new ThriftyNova(canID);

// Configure motor
motor.setBrakeMode(brakeMode);

// // Configure PID controller
// pidController = motor.getPIDController();
// pidController.setP(kP);
// pidController.setI(kI);
// pidController.setD(kD);

// Set ramp rates
{{#if enableOpenLoopRamp}}
  motor.setOpenLoopRampRate(openLoopRampRate);
{{/if}}
{{#if enableClosedLoopRamp}}
  motor.setClosedLoopRampRate(closedLoopRampRate);
{{/if}}

// Set current limits
{{#if enableStatorLimit}}
  motor.setCurrentLimit(statorCurrentLimit);
{{/if}}
{{#if enableSoftLimits}}
  motor.configForwardSoftLimit(forwardSoftLimit);
  motor.enableForwardSoftLimit(true);
  motor.configReverseSoftLimit(reverseSoftLimit);
  motor.enableReverseSoftLimit(true);
{{/if}}`

export const getPeriodic = () => ``
export const getSimulationPeriodic = () => ``

export const getMethods = () => ({
  getPositionMethod: `return encoder.getPositionQuad() / gearRatio;`,

  getVelocityMethod: `return encoder.getVelocityQuad() / gearRatio;`,

  setPositionMethod: `double adjustedPosition = position * gearRatio;
double ffVolts = feedforward.calculate(getVelocity(), acceleration);
pidController.setReference(adjustedPosition, ControlMode.POSITION, ffVolts);`,

  setVelocityMethod: `double adjustedVelocity = velocity * gearRatio;
double ffVolts = feedforward.calculate(velocity, acceleration);
pidController.setReference(adjustedVelocity, ControlMode.VELOCITY, ffVolts);`,

  setVoltageMethod: `motor.setVoltage(voltage);`,

  getVoltageMethod: `return motor.getAppliedOutput() * motor.getBusVoltage();`,

  getCurrentMethod: `return motor.getOutputCurrent();`,

  getTemperatureMethod: `return motor.getTemperature();`,
})
