export const getImports = () => `import com.revrobotics.CANSparkFlex;
import com.revrobotics.CANSparkBase.IdleMode;
import com.revrobotics.CANSparkLowLevel.MotorType;
import com.revrobotics.RelativeEncoder;
import com.revrobotics.SparkPIDController;`

export const getDeclaration = () => `private final CANSparkFlex motor;
private final RelativeEncoder encoder;
private final SparkPIDController pidController;`

export const getInitialization = () => `motor = new CANSparkFlex(canID, MotorType.kBrushless);
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
if (enableOpenLoopRamp) {
  motor.setOpenLoopRampRate(openLoopRampRate);
}
if (enableClosedLoopRamp) {
  motor.setClosedLoopRampRate(closedLoopRampRate);
}

// Set current limits
if (enableStatorLimit) {
  motor.setSmartCurrentLimit((int)statorCurrentLimit);
}

// Set soft limits
if (enableSoftLimits && forwardSoftLimit != null) {
  motor.setSoftLimit(CANSparkFlex.SoftLimitDirection.kForward, forwardSoftLimit.floatValue());
  motor.enableSoftLimit(CANSparkFlex.SoftLimitDirection.kForward, true);
}
  
if (enableSoftLimits && reverseSoftLimit != null) {
  motor.setSoftLimit(CANSparkFlex.SoftLimitDirection.kReverse, reverseSoftLimit.floatValue());
  motor.enableSoftLimit(CANSparkFlex.SoftLimitDirection.kReverse, true);
}

// Save configuration
motor.burnFlash();`

export const getMethods = () => ({
  getPositionMethod: `return encoder.getPosition() / gearRatio;`,

  getVelocityMethod: `return encoder.getVelocity() / gearRatio / 60.0; // Convert from RPM to RPS`,

  setPositionMethod: `double adjustedPosition = position * gearRatio;
pidController.setReference(adjustedPosition, CANSparkBase.ControlType.kPosition, 0, 
    feedforward.calculate(getVelocity(), acceleration));`,

  setVelocityMethod: `// This code is not used for SparkFlex as they use the control loop instead
// Placeholder to satisfy the compiler
double adjustedVelocity = velocity * gearRatio * 60.0;
double ffVolts = feedforward.calculate(velocity, acceleration);`,

  setVoltageMethod: `motor.setVoltage(voltage);`,

  getVoltageMethod: `return motor.getAppliedOutput() * motor.getBusVoltage();`,

  getCurrentMethod: `return motor.getOutputCurrent();`,

  getTemperatureMethod: `return motor.getMotorTemperature();`,
})
