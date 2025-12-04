export const getImports = () => `import com.revrobotics.spark.SparkFlex;
import com.revrobotics.spark.SparkBase.PersistMode;
import com.revrobotics.spark.SparkBase.ResetMode;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.config.SparkFlexConfig;
import com.revrobotics.RelativeEncoder;
import com.revrobotics.spark.SparkSim;
import com.revrobotics.sim.SparkRelativeEncoderSim;
import com.revrobotics.spark.SparkClosedLoopController;
import com.revrobotics.spark.FeedbackSensor;
import com.revrobotics.spark.ClosedLoopSlot;
import com.revrobotics.spark.SparkBase.ControlType;
`

export const getDeclaration = () => `private final SparkFlex motor;
private final RelativeEncoder encoder;
private final SparkSim motorSim;
private final SparkClosedLoopController sparkPidController;`

export const getInitialization = () => `SparkFlexConfig motorConfig = new SparkFlexConfig();
motor = new SparkFlex(canID, MotorType.kBrushless);
motorConfig.idleMode(brakeMode ? IdleMode.kBrake : IdleMode.kCoast);

// Configure encoder
encoder = motor.getEncoder();
encoder.setPosition(0);


// Set ramp rates
{{#if enableOpenLoopRamp}}
  motorConfig.openLoopRampRate(openLoopRampRate);
{{/if}}
{{#if enableClosedLoopRamp}}
  motorConfig.closedLoopRampRate(closedLoopRampRate);
{{/if}}

{{#if enableStatorLimit}}
//Set current limits
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

// Configure Feedback and Feedforward
sparkPidController = motor.getClosedLoopController();
motorConfig.closedLoop
          .feedbackSensor(FeedbackSensor.kPrimaryEncoder)
          .pid(kP,kI,kD,ClosedLoopSlot.kSlot0);
motorConfig.closedLoop.feedForward.kS(kS).kV(kV).kA(kA);
{{#if (eq mechanismType 'Arm') }}
motorConfig.closedLoop.feedForward.kCos(kG);
{{else}}
motorConfig.closedLoop.feedForward.kG(kG);
{{/if}}

// Configure Encoder Gear Ratio
motorConfig.encoder.positionConversionFactor(1/gearRatio)
                             .velocityConversionFactor((1/gearRatio)/60); // Covnert RPM to RPS

// Save configuration
motor.configure(motorConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
motorSim = new SparkSim(motor, dcMotor);`

export const getPeriodic = () => ``
export const getSimulationPeriodic = () => `motorSim.iterate(motorVelocity*60,RoboRioSim.getVInVoltage(),0.02);`

export const getMethods = () => ({
  getPositionMethod: `return encoder.getPosition() / gearRatio;`,

  getVelocityMethod: `return encoder.getVelocity() / gearRatio / 60.0; // Convert from RPM to RPS`,

  setPositionMethod: `sparkPidController.setSetpoint(positionRotations,
                                       ControlType.kMAXMotionPositionControl,
                                       ClosedLoopSlot.kSlot0);`,

  setVelocityMethod: `sparkPidController.setSetpoint(velocityRotations,
                                       ControlType.kVelocity,
                                       ClosedLoopSlot.kSlot0);`,

  setVoltageMethod: `motor.setVoltage(voltage);`,

  getVoltageMethod: `return motor.getAppliedOutput() * motor.getBusVoltage();`,

  getCurrentMethod: `return motor.getOutputCurrent();`,

  getTemperatureMethod: `return motor.getMotorTemperature();`,
})
