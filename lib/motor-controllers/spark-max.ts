export const getImports = () => `import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;
import com.revrobotics.spark.SparkBase.ResetMode;
import com.revrobotics.spark.SparkBase.PersistMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.RelativeEncoder;
import com.revrobotics.spark.SparkSim;
import com.revrobotics.sim.SparkRelativeEncoderSim;
`


export const getDeclaration = () => `private final SparkMax motor;
private final RelativeEncoder encoder;
private final SparkSim motorSim;`

export const getInitialization = () => `SparkMaxConfig motorConfig = new SparkMaxConfig();
motor = new SparkMax(canID, MotorType.kBrushless);
motorConfig.idleMode(brakeMode ? IdleMode.kBrake : IdleMode.kCoast);

// Configure encoder
encoder = motor.getEncoder();
encoder.setPosition(0);

{{#if enableOpenLoopRamp}}
// Set ramp rates
  motorConfig.openLoopRampRate({{openLoopRampRate}});
{{/if}}
{{#if enableClosedLoopRamp}}
  motorConfig.closedLoopRampRate({{closedLoopRampRate}});
{{/if}}

{{#if enableStatorLimit}}
// Set current limits
 motorConfig.smartCurrentLimit(statorCurrentLimit);
{{/if}}

{{#if enableSoftLimits}}
// Set soft limits
  motorConfig
  .softLimit
  .forwardSoftLimit(forwardSoftLimit)
  .forwardSoftLimitEnabled(true)
  .reverseSoftLimit(reverseSoftLimit)
  .reverseSoftLimitEnabled(true);
{{/if}}

motorConfig.closedLoop
          .feedbackSensor(FeedbackSensor.kPrimaryEncoder)
          .pid(kP,kI,kD,ClosedLoopSlot.kSlot0);
motorConfig.closedLoop.feedForward.kS(kS).kV(kV).kA(kA);
{{#if (eq mechanismType 'Arm') }}
motorConfig.closedLoop.feedForward.kCos(kG);
{{else}}
motorConfig.closedLoop.feedForward.kG(kG);
{{/if}}

// Save configuration
motor.configure(motorConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
motorSim = new SparkSim(motor, dcMotor);`

export const getPeriodic = () => ``
export const getSimulationPeriodic = () => `motorSim.iterate(motorVelocity*60,RoboRioSim.getVInVoltage(),0.02);`

export const getMethods = () => ({
  getPositionMethod: `return encoder.getPosition() / gearRatio;`,

  getVelocityMethod: `return encoder.getVelocity() / gearRatio / 60.0; // Convert from RPM to RPS`,

  setPositionMethod: `double adjustedPosition = position * gearRatio;
profiledPIDController.setReference(adjustedPosition, CANSparkBase.ControlType.kPosition, 0, 
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
