export const getImports = () => `
import com.ctre.phoenix6.hardware.TalonFXS;
import com.ctre.phoenix6.BaseStatusSignal;
import com.ctre.phoenix6.StatusSignal;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.signals.MotorArrangementValue;
import com.ctre.phoenix6.signals.NeutralModeValue;
import com.ctre.phoenix6.configs.TalonFXSConfiguration;
import com.ctre.phoenix6.configs.Slot0Configs;
import com.ctre.phoenix6.configs.CurrentLimitsConfigs;
import com.ctre.phoenix6.configs.SoftwareLimitSwitchConfigs;
import com.ctre.phoenix6.configs.OpenLoopRampsConfigs;
import com.ctre.phoenix6.configs.ClosedLoopRampsConfigs;
import edu.wpi.first.units.measure.*;
`

export const getDeclaration = () => `private final TalonFXS motor;
private final PositionVoltage positionRequest;
private final VelocityVoltage velocityRequest;
private final StatusSignal<Angle> positionSignal;
private final StatusSignal<AngularVelocity> velocitySignal;
private final StatusSignal<Voltage> voltageSignal;
private final StatusSignal<Current> statorCurrentSignal;
private final StatusSignal<Temperature> temperatureSignal;
`

export const getInitialization = () => `motor = new TalonFXS(canID);

// Create control requests
positionRequest = new PositionVoltage(0).withSlot(0);
velocityRequest = new VelocityVoltage(0).withSlot(0);

// get status signals
positionSignal = motor.getPosition();
velocitySignal = motor.getVelocity();
voltageSignal = motor.getMotorVoltage();
statorCurrentSignal = motor.getStatorCurrent();
temperatureSignal = motor.getDeviceTemp();

TalonFXSConfiguration config = new TalonFXSConfiguration();
config.Commutation.MotorArrangement = MotorArrangementValue.{{motorType}}_JST;

// Configure PID for slot 0
Slot0Configs slot0 = config.Slot0;
slot0.kP = kP;
slot0.kI = kI;
slot0.kD = kD;
{{#if (eq mechanismType 'Elevator')}}
slot0.GravityType = GravityTypeValue.Elevator_Static;
{{/if}}
{{#if (eq mechanismType 'Arm')}}
slot0.GravityType = GravityTypeValue.Arm_Cosine;
{{/if}}
slot0.kS = kS;
slot0.kV = kV;
slot0.kA = kA;
{{#if (or (eq mechanismType 'Elevator') (eq mechanismType 'Arm'))}}
slot0.kG = kG;
{{/if}}

{{#if enableOpenLoopRamp}}
// Set ramp rates
  OpenLoopRampsConfigs openLoopRamps = config.OpenLoopRamps;
  openLoopRamps.DutyCycleOpenLoopRampPeriod = openLoopRampRate;
{{/if}}

{{#if enableClosedLoopRamp}}
  ClosedLoopRampsConfigs closedLoopRamps = config.ClosedLoopRamps;
  closedLoopRamps.VoltageClosedLoopRampPeriod = closedLoopRampRate;
{{/if}}

// Set current limits
CurrentLimitsConfigs currentLimits = config.CurrentLimits;
currentLimits.StatorCurrentLimit = statorCurrentLimit;
currentLimits.StatorCurrentLimitEnable = enableStatorLimit;
currentLimits.SupplyCurrentLimit = supplyCurrentLimit;
currentLimits.SupplyCurrentLimitEnable = enableSupplyLimit;

{{#if enableSoftLimits}}
// Set soft limits
SoftwareLimitSwitchConfigs softLimits = config.SoftwareLimitSwitch;
  softLimits.ForwardSoftLimitThreshold = forwardSoftLimit;
  softLimits.ForwardSoftLimitEnable = true;
  softLimits.ReverseSoftLimitThreshold = reverseSoftLimit;
  softLimits.ReverseSoftLimitEnable = true;
{{/if}}

// Set brake mode
config.MotorOutput.NeutralMode = brakeMode ? NeutralModeValue.Brake : NeutralModeValue.Coast;

// Apply gear ratio
config.Feedback.SensorToMechanismRatio = gearRatio;

// Apply configuration
motor.getConfigurator().apply(config);

// Reset encoder position
motor.setPosition(0);`

export const getPeriodic = () => `BaseStatusSignal.refreshAll(positionSignal, velocitySignal, voltageSignal, statorCurrentSignal, temperatureSignal);`

export const getSimulationPeriodic = () => `
  motor.getSimState().setRawRotorPosition(motorPosition);
  motor.getSimState().setRotorVelocity(motorVelocity);
`

export const getMethods = () => ({
  getPositionMethod: `return positionSignal.getValueAsDouble();`,

  getVelocityMethod: `return velocitySignal.getValueAsDouble();`,

  setPositionMethod: `
double ffVolts = feedforward.calculate(getVelocity(), acceleration);
motor.setControl(positionRequest.withPosition(positionRotations).withFeedForward(ffVolts));`,

  setVelocityMethod: `
double ffVolts = feedforward.calculate(getVelocity(), acceleration);
motor.setControl(velocityRequest.withVelocity(velocityRotations).withFeedForward(ffVolts));`,

  setVoltageMethod: `motor.setVoltage(voltage);`,

  getVoltageMethod: `return voltageSignal.getValueAsDouble();`,

  getCurrentMethod: `return statorCurrentSignal.getValueAsDouble();`,

  getTemperatureMethod: `return temperatureSignal.getValueAsDouble();`,
})
