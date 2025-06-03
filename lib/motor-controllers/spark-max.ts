export const getImports = () => `import com.revrobotics.CANSparkMax;
import com.revrobotics.CANSparkBase.IdleMode;
import com.revrobotics.CANSparkLowLevel.MotorType;
import com.revrobotics.RelativeEncoder;
import com.revrobotics.SparkPIDController;`

export const getDeclaration = () => `private final CANSparkMax motor;
private final RelativeEncoder encoder;
private final SparkPIDController pidController;`

export const getInitialization = () => `motor = new CANSparkMax(canID, MotorType.kBrushless);
motor.restoreFactoryDefaults();
motor.setIdleMode(brakeMode ? IdleMode.kBrake : IdleMode.kCoast);

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
  motor.setOpenLoopRampRate({{openLoopRampRate}});
{{/if}}
{{#if enableClosedLoopRamp}}
  motor.setClosedLoopRampRate({{closedLoopRampRate}});
{{/if}}

// Set current limits
{{#if enableStatorLimit}}
  motor.setSmartCurrentLimit({{statorCurrentLimit}});
{{/if}}

// Set soft limits
{{#if enableSoftLimits}}
  motor.setSoftLimit(CANSparkMax.SoftLimitDirection.kForward, forwardSoftLimit.floatValue());
  motor.enableSoftLimit(CANSparkMax.SoftLimitDirection.kForward, true);

  motor.setSoftLimit(CANSparkMax.SoftLimitDirection.kReverse, reverseSoftLimit.floatValue());
  motor.enableSoftLimit(CANSparkMax.SoftLimitDirection.kReverse, true);
{{/if}}

// Save configuration
motor.burnFlash();`

export const getPeriodic = () => ``
export const getSimulationPeriodic = () => ``

export const getMethods = () => ({
  getPositionMethod: `return encoder.getPosition() / gearRatio;`,

  getVelocityMethod: `return encoder.getVelocity() / gearRatio / 60.0; // Convert from RPM to RPS`,

  setPositionMethod: `double adjustedPosition = position * gearRatio;
pidController.setReference(adjustedPosition, CANSparkBase.ControlType.kPosition, 0, 
    feedforward.calculate(getVelocity(), acceleration));`,

  setVelocityMethod: `// This code is not used for SparkMAX as they use the control loop instead
// Placeholder to satisfy the compiler
double adjustedVelocity = velocity * gearRatio * 60.0;
double ffVolts = feedforward.calculate(velocity, acceleration);`,

  setVoltageMethod: `motor.setVoltage(voltage);`,

  getVoltageMethod: `return motor.getAppliedOutput() * motor.getBusVoltage();`,

  getCurrentMethod: `return motor.getOutputCurrent();`,

  getTemperatureMethod: `return motor.getMotorTemperature();`,
})
