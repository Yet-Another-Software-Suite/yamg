export const getImports = () => `import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.controls.DutyCycleOut;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.signals.NeutralModeValue;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.configs.Slot0Configs;
import com.ctre.phoenix6.configs.CurrentLimitsConfigs;
import com.ctre.phoenix6.configs.SoftwareLimitSwitchConfigs;
import com.ctre.phoenix6.configs.OpenLoopRampsConfigs;
import com.ctre.phoenix6.configs.ClosedLoopRampsConfigs;`

export const getDeclaration = () => `private final TalonFX motor;
private final PositionVoltage positionRequest;
private final VelocityVoltage velocityRequest;
private final DutyCycleOut dutyCycleRequest;`

export const getInitialization = () => `motor = new TalonFX(canID);

// Create control requests
positionRequest = new PositionVoltage(0).withSlot(0);
velocityRequest = new VelocityVoltage(0).withSlot(0);
dutyCycleRequest = new DutyCycleOut(0);

TalonFXConfiguration config = new TalonFXConfiguration();

// Configure PID for slot 0
Slot0Configs slot0 = config.Slot0;
slot0.kP = kP;
slot0.kI = kI;
slot0.kD = kD;

// Set ramp rates
if (enableOpenLoopRamp) {
  OpenLoopRampsConfigs openLoopRamps = config.OpenLoopRamps;
  openLoopRamps.DutyCycleOpenLoopRampPeriod = openLoopRampRate;
}
if (enableClosedLoopRamp) {
  ClosedLoopRampsConfigs closedLoopRamps = config.ClosedLoopRamps;
  closedLoopRamps.VoltageClosedLoopRampPeriod = closedLoopRampRate;
}

// Set current limits
CurrentLimitsConfigs currentLimits = config.CurrentLimits;
currentLimits.StatorCurrentLimit = statorCurrentLimit;
currentLimits.StatorCurrentLimitEnable = enableStatorLimit;
currentLimits.SupplyCurrentLimit = supplyCurrentLimit;
currentLimits.SupplyCurrentLimitEnable = enableSupplyLimit;

// Set soft limits
SoftwareLimitSwitchConfigs softLimits = config.SoftwareLimitSwitch;
if (enableSoftLimits && forwardSoftLimit != null) {
  softLimits.ForwardSoftLimitThreshold = forwardSoftLimit;
  softLimits.ForwardSoftLimitEnable = true;
}
  
if (enableSoftLimits && reverseSoftLimit != null) {
  softLimits.ReverseSoftLimitThreshold = reverseSoftLimit;
  softLimits.ReverseSoftLimitEnable = true;
}

// Apply configuration
motor.getConfigurator().apply(config);

// Set brake mode
motor.setNeutralMode(brakeMode ? NeutralModeValue.Brake : NeutralModeValue.Coast);

// Reset encoder position
motor.setPosition(0);`

export const getMethods = () => ({
  getPositionMethod: `return motor.getPosition().getValue() / gearRatio;`,

  getVelocityMethod: `return motor.getVelocity().getValue() / gearRatio;`,

  setPositionMethod: `double adjustedPosition = position * gearRatio;
double ffVolts = feedforward.calculate(getVelocity(), acceleration);
motor.setControl(positionRequest.withPosition(adjustedPosition).withFeedForward(ffVolts));`,

  setVelocityMethod: `double adjustedVelocity = velocity * gearRatio;
double ffVolts = feedforward.calculate(velocity, acceleration);
motor.setControl(velocityRequest.withVelocity(adjustedVelocity).withFeedForward(ffVolts));`,

  setVoltageMethod: `motor.setVoltage(voltage);`,

  getVoltageMethod: `return motor.getMotorVoltage().getValue();`,

  getCurrentMethod: `return motor.getStatorCurrent().getValue();`,

  getTemperatureMethod: `return motor.getDeviceTemp().getValue();`,
})
