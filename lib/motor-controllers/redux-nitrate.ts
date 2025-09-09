export const getImports = () => `import com.reduxrobotics.nitrate.hardware.ReduxNitrate;
import com.reduxrobotics.nitrate.hardware.ReduxNitrate.IdleMode;
import com.reduxrobotics.nitrate.hardware.ReduxNitrate.CurrentLimitConfig;`

export const getDeclaration = () => `private final ReduxNitrate motor;`

export const getInitialization = () => `motor = new ReduxNitrate(canID);

// Configure motor
motor.setNeutralMode(brakeMode ? NeutralMode.BRAKE : NeutralMode.COAST);

// Configure encoder
encoder = motor.getEncoder();
encoder.setPosition(0);

// Configure PID controller
pidController = motor.getPIDController();
pidController.setP(kP);
pidController.setI(kI);
pidController.setD(kD);

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
  getPositionMethod: `return encoder.getPosition() / gearRatio;`,

  getVelocityMethod: `return encoder.getVelocity() / gearRatio;`,

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