export const getImports = () => `import com.ctre.phoenix.motorcontrol.can.TalonFXS;
import com.ctre.phoenix.motorcontrol.TalonFXControlMode;
import com.ctre.phoenix.motorcontrol.NeutralMode;
import com.ctre.phoenix.motorcontrol.TalonFXFeedbackDevice;
import com.ctre.phoenix.motorcontrol.StatusFrameEnhanced;
import com.ctre.phoenix.motorcontrol.SupplyCurrentLimitConfiguration;
import com.ctre.phoenix.motorcontrol.StatorCurrentLimitConfiguration;`

export const getDeclaration = () => `private final TalonFXS motor;`

export const getInitialization = () => `motor = new TalonFXS(canID);

// Factory reset
motor.configFactoryDefault();

// Configure feedback device
motor.configSelectedFeedbackSensor(TalonFXFeedbackDevice.IntegratedSensor, 0, 30);

// Set PID for slot 0
motor.config_kP(0, kP);
motor.config_kI(0, kI);
motor.config_kD(0, kD);

// Set ramp rates
{{#if enableOpenLoopRamp}}
  motor.configOpenloopRamp(openLoopRampRate);
{{/if}}
{{#if enableClosedLoopRamp}}
  motor.configClosedloopRamp(closedLoopRampRate);
{{/if}}

// Set current limits
{{#if enableStatorLimit}}
  motor.configStatorCurrentLimit(new StatorCurrentLimitConfiguration(
      true, statorCurrentLimit, statorCurrentLimit + 5, 0.5));
{{/if}}

{{#if enableSupplyLimit}}
  motor.configSupplyCurrentLimit(new SupplyCurrentLimitConfiguration(
      true, supplyCurrentLimit, supplyCurrentLimit + 5, 0.5));
{{/if}}
{{#if enableSoftLimits}}
// Set soft limits
  motor.configForwardSoftLimitThreshold(forwardSoftLimit * 2048.0 / (2.0 * Math.PI));
  motor.configForwardSoftLimitEnable(true);
  
  motor.configReverseSoftLimitThreshold(reverseSoftLimit * 2048.0 / (2.0 * Math.PI));
  motor.configReverseSoftLimitEnable(true);
{{/if}}

// Set brake mode
motor.setNeutralMode(brakeMode ? NeutralMode.Brake : NeutralMode.Coast);

// Reset encoder position
motor.setSelectedSensorPosition(0);`

export const getPeriodic = () => ``
export const getSimulationPeriodic = () => ``

export const getMethods = () => ({
  getPositionMethod: `return motor.getSelectedSensorPosition() * (2.0 * Math.PI) / 2048.0 / gearRatio;`,

  getVelocityMethod: `return motor.getSelectedSensorVelocity() * (2.0 * Math.PI) / 2048.0 / gearRatio / 10.0;`,

  setPositionMethod: `double adjustedPosition = position * gearRatio * 2048.0 / (2.0 * Math.PI);
double ffVolts = feedforward.calculate(getVelocity(), acceleration);
motor.set(TalonFXControlMode.Position, adjustedPosition, DemandType.ArbitraryFeedForward, ffVolts / 12.0);`,

  setVelocityMethod: `double adjustedVelocity = velocity * gearRatio * 2048.0 / (2.0 * Math.PI) * 10.0;
double ffVolts = feedforward.calculate(velocity, acceleration);
motor.set(TalonFXControlMode.Velocity, adjustedVelocity, DemandType.ArbitraryFeedForward, ffVolts / 12.0);`,

  setVoltageMethod: `motor.set(TalonFXControlMode.PercentOutput, voltage / 12.0);`,

  getVoltageMethod: `return motor.getMotorOutputVoltage();`,

  getCurrentMethod: `return motor.getStatorCurrent();`,

  getTemperatureMethod: `return motor.getTemperature();`,
})
