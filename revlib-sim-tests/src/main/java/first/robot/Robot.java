package first.robot;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.Kilograms;
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.RPM;
import static org.wpilib.units.Units.Radians;
import static org.wpilib.units.Units.RadiansPerSecond;
import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;
import static org.wpilib.units.Units.RotationsPerSecondPerSecond;
import static org.wpilib.units.Units.Seconds;
import static org.wpilib.units.Units.Volts;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.sim.SparkMaxSim;
import com.revrobotics.spark.ClosedLoopSlot;
import com.revrobotics.spark.SparkClosedLoopController.ArbFFUnits;
import com.revrobotics.spark.SparkLowLevel.ControlType;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkMaxConfig;
import org.wpilib.driverstation.Gamepad;
import org.wpilib.framework.TimedRobot;
import org.wpilib.hardware.bus.CANPort;
import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.math.trajectory.TrapezoidProfile;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.simulation.SingleJointedArmSim;
import org.wpilib.smartdashboard.Mechanism2d;
import org.wpilib.smartdashboard.MechanismLigament2d;
import org.wpilib.system.RobotController;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.units.measure.Angle;
import org.wpilib.units.measure.AngularAcceleration;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.Distance;
import org.wpilib.units.measure.Mass;
import org.wpilib.units.measure.Time;
import org.wpilib.units.measure.Voltage;

/**
 * Two simulated SPARK MAXs to try REVLib's closed loop in simulation by hand: a free spinning NEO
 * (the slide) for MAXMotion, and a NEO driving an arm through 50:1 for kCos. Each can be run the way
 * REV intends, or with the workaround, from a gamepad on port 0. Everything worth watching is
 * published with Telemetry, under Slide/ and Arm/. See the README for the controls.
 */
public class Robot extends TimedRobot {
  private static final Time LOOP = Seconds.of(0.02);
  private static final DCMotor NEO = DCMotor.getNEO(1);
  /** A NEO's kV: 473 RPM per volt. */
  private static final double NEO_KV_VOLTS_PER_RPM = 1.0 / 473;

  // The slide: a NEO with a light load and no gearing.
  private static final AngularVelocity SLIDE_CRUISE = RPM.of(3000);
  private static final AngularAcceleration SLIDE_ACCELERATION = RPM.per(Seconds).of(6000);
  private static final Angle SLIDE_GOAL = Rotations.of(100);
  /**
   * Slot 0, for MAXMotion and velocity control: kP 0.0002 (duty cycle per rotation, or per RPM) and
   * kV. It has to be slot 0, since the simulated SPARK only applies kV in slot 0.
   */
  private static final ClosedLoopSlot SLIDE_SLOT = ClosedLoopSlot.kSlot0;
  private static final double SLIDE_KP = 0.0002;
  /** Slot 1, for the workaround: position control with kP 0.05 duty cycle per rotation, and no kV. */
  private static final ClosedLoopSlot SLIDE_WORKAROUND_SLOT = ClosedLoopSlot.kSlot1;
  private static final double SLIDE_WORKAROUND_KP = 0.05;

  // The arm: 2 kg, 0.5 m, through 50:1, 0 degrees is level.
  private static final double ARM_GEARING = 50;
  private static final Distance ARM_LENGTH = Meters.of(0.5);
  private static final Mass ARM_MASS = Kilograms.of(2);
  private static final Angle ARM_GOAL = Degrees.of(45);
  private static final Angle ARM_START = Degrees.of(-90);
  /** kP in duty cycle per motor rotation of error. */
  private static final double ARM_KP = 0.02;
  /**
   * The voltage that holds the arm level: the gravity torque at the motor, through the NEO. The
   * centre of mass is halfway along the arm, as in SingleJointedArmSim.
   */
  private static final Voltage ARM_KG = Volts.of(NEO.getVoltage(
      ARM_MASS.in(Kilograms) * 9.81 * ARM_LENGTH.in(Meters) / 2 / ARM_GEARING, 0));

  /** Slot 0 has kCos = kG for REV's way; slot 1 has kCos = 0 for the workaround. */
  private static final ClosedLoopSlot KCOS_SLOT = ClosedLoopSlot.kSlot0;
  private static final ClosedLoopSlot WORKAROUND_SLOT = ClosedLoopSlot.kSlot1;

  private enum SlideMode { STOPPED, MAXMOTION, WORKAROUND, VELOCITY }

  private enum ArmMode { STOPPED, KCOS, WORKAROUND }

  private final Gamepad gamepad = new Gamepad(0);

  private final SparkMax slide = new SparkMax(CANPort.CAN_S0, 1, MotorType.kBrushless);
  private final SparkMax arm = new SparkMax(CANPort.CAN_S0, 2, MotorType.kBrushless);
  private final SparkMaxSim slideSim = new SparkMaxSim(slide, NEO);
  private final SparkMaxSim armSim = new SparkMaxSim(arm, NEO);
  private final DCMotorSim slidePhysics =
      new DCMotorSim(Models.singleJointedArmFromPhysicalConstants(NEO, 0.0005, 1), NEO);
  private final SingleJointedArmSim armPhysics = new SingleJointedArmSim(
      NEO, ARM_GEARING, ARM_MASS.in(Kilograms) * Math.pow(ARM_LENGTH.in(Meters), 2) / 3,
      ARM_LENGTH.in(Meters), Degrees.of(-90).in(Radians), Degrees.of(180).in(Radians), true,
      ARM_START.in(Radians));

  /** The same profile MAXMotion should follow, in rotations, run on the SystemCore. */
  private final TrapezoidProfile slideProfile = new TrapezoidProfile(new TrapezoidProfile.Constraints(
      SLIDE_CRUISE.in(RotationsPerSecond), SLIDE_ACCELERATION.in(RotationsPerSecondPerSecond)));
  private TrapezoidProfile.State slideReference = new TrapezoidProfile.State();
  private Angle slideGoal = Rotations.of(0);

  private SlideMode slideMode = SlideMode.STOPPED;
  private ArmMode armMode = ArmMode.STOPPED;

  private final Mechanism2d mechanism = new Mechanism2d(2, 2);
  private final MechanismLigament2d armLigament = mechanism.getRoot("Pivot", 1, 1)
      .append(new MechanismLigament2d("Arm", ARM_LENGTH.in(Meters) * 1.5, ARM_START.in(Degrees)));

  public Robot() {
    SparkMaxConfig slideConfig = new SparkMaxConfig();
    slideConfig.closedLoop.pid(SLIDE_KP, 0, 0, SLIDE_SLOT).pid(SLIDE_WORKAROUND_KP, 0, 0, SLIDE_WORKAROUND_SLOT);
    slideConfig.closedLoop.feedForward.kV(NEO_KV_VOLTS_PER_RPM, SLIDE_SLOT);
    slideConfig.closedLoop.maxMotion
        .cruiseVelocity(SLIDE_CRUISE.in(RPM))
        .maxAcceleration(SLIDE_ACCELERATION.in(RPM.per(Seconds)));
    slide.configure(slideConfig, ResetMode.kResetSafeParameters, PersistMode.kNoPersistParameters);

    SparkMaxConfig armConfig = new SparkMaxConfig();
    armConfig.closedLoop.pid(ARM_KP, 0, 0, KCOS_SLOT).pid(ARM_KP, 0, 0, WORKAROUND_SLOT);
    // kCosRatio turns motor rotations into arm rotations, so 0 is level.
    armConfig.closedLoop.feedForward
        .kCos(ARM_KG.in(Volts), KCOS_SLOT).kCosRatio(1.0 / ARM_GEARING, KCOS_SLOT)
        .kCos(0, WORKAROUND_SLOT);
    arm.configure(armConfig, ResetMode.kResetSafeParameters, PersistMode.kNoPersistParameters);
    armSim.setPosition(ARM_START.in(Rotations) * ARM_GEARING);
  }

  @Override
  public void teleopPeriodic() {
    // The slide.
    if (gamepad.getFaceDownButtonPressed()) {
      startSlide(SlideMode.MAXMOTION, SLIDE_GOAL);
    } else if (gamepad.getFaceRightButtonPressed()) {
      startSlide(SlideMode.MAXMOTION, Rotations.of(0));
    } else if (gamepad.getFaceLeftButtonPressed()) {
      startSlide(SlideMode.WORKAROUND, SLIDE_GOAL);
    } else if (gamepad.getFaceUpButtonPressed()) {
      startSlide(SlideMode.WORKAROUND, Rotations.of(0));
    } else if (gamepad.getStartButtonPressed()) {
      startSlide(SlideMode.VELOCITY, slideGoal);
    }
    // The arm.
    if (gamepad.getRightBumperButtonPressed()) {
      armMode = ArmMode.KCOS;
    } else if (gamepad.getLeftBumperButtonPressed()) {
      armMode = ArmMode.WORKAROUND;
    }
    if (gamepad.getBackButtonPressed()) {
      slideMode = SlideMode.STOPPED;
      armMode = ArmMode.STOPPED;
    }

    runSlide();
    runArm();
  }

  @Override
  public void disabledInit() {
    slideMode = SlideMode.STOPPED;
    armMode = ArmMode.STOPPED;
    slide.stopMotor();
    arm.stopMotor();
  }

  /** Start moving the slide toward a goal, with the reference profile starting where it is now. */
  private void startSlide(SlideMode mode, Angle goal) {
    slideMode = mode;
    slideGoal = goal;
    slideReference = new TrapezoidProfile.State(
        slideSim.getPosition(), RPM.of(slideSim.getVelocity()).in(RotationsPerSecond));
  }

  private void runSlide() {
    // The profile MAXMotion should be following, for comparison, and for the workaround.
    TrapezoidProfile.State previous = slideReference;
    slideReference = slideProfile.calculate(
        LOOP.in(Seconds), slideReference, new TrapezoidProfile.State(slideGoal.in(Rotations), 0));
    switch (slideMode) {
      case MAXMOTION ->
          // REV's way: the SPARK runs the profile and the feedforward.
          slide.getClosedLoopController().setSetpoint(
              slideGoal.in(Rotations), ControlType.kMAXMotionPositionControl, SLIDE_SLOT);
      case WORKAROUND -> {
        // The workaround: the SystemCore runs the profile and sends each step with position
        // control. Position control does not apply kV, so it goes in the arbitrary feedforward.
        AngularVelocity velocity = RotationsPerSecond.of(slideReference.velocity);
        slide.getClosedLoopController().setSetpoint(
            slideReference.position, ControlType.kPosition, SLIDE_WORKAROUND_SLOT,
            NEO_KV_VOLTS_PER_RPM * velocity.in(RPM), ArbFFUnits.kVoltage);
      }
      case VELOCITY ->
          // The control case: plain velocity control at the cruise velocity, with the same kV.
          slide.getClosedLoopController().setSetpoint(SLIDE_CRUISE.in(RPM), ControlType.kVelocity, SLIDE_SLOT);
      case STOPPED -> slide.stopMotor();
    }
    Telemetry.log("Slide/Mode", slideMode.name());
    Telemetry.log("Slide/Goal (rot)", slideGoal.in(Rotations));
    Telemetry.log("Slide/Position (rot)", slideSim.getPosition());
    Telemetry.log("Slide/Velocity (RPM)", slideSim.getVelocity());
    Telemetry.log("Slide/Profile position (rot)", slideReference.position);
    Telemetry.log("Slide/Profile velocity (RPM)", RotationsPerSecond.of(slideReference.velocity).in(RPM));
    Telemetry.log("Slide/Profile acceleration (RPM per s)",
        RotationsPerSecond.of((slideReference.velocity - previous.velocity) / LOOP.in(Seconds)).in(RPM));
    Telemetry.log("Slide/Applied (V)", slideSim.getAppliedOutput() * RobotController.getBatteryVoltage());
  }

  private void runArm() {
    Angle angle = Radians.of(armPhysics.getAngle());
    Voltage gravity = ARM_KG.times(Math.cos(angle.in(Radians)));
    double motorSetpoint = ARM_GOAL.in(Rotations) * ARM_GEARING;
    switch (armMode) {
      case KCOS ->
          // REV's way: the SPARK adds kG times the cosine of the arm's angle.
          arm.getClosedLoopController().setSetpoint(motorSetpoint, ControlType.kPosition, KCOS_SLOT);
      case WORKAROUND ->
          // The workaround: kCos is 0, and the gravity goes in the arbitrary feedforward.
          arm.getClosedLoopController().setSetpoint(
              motorSetpoint, ControlType.kPosition, WORKAROUND_SLOT, gravity.in(Volts), ArbFFUnits.kVoltage);
      case STOPPED -> arm.stopMotor();
    }
    Telemetry.log("Arm/Mode", armMode.name());
    Telemetry.log("Arm/Goal (deg)", ARM_GOAL.in(Degrees));
    Telemetry.log("Arm/Angle (deg)", angle.in(Degrees));
    Telemetry.log("Arm/Gravity it needs (V)", gravity.in(Volts));
    Telemetry.log("Arm/kCos would give (V)", ARM_KG.in(Volts) * Math.cos(angle.in(Radians)));
    Telemetry.log("Arm/Applied (V)", armSim.getAppliedOutput() * RobotController.getBatteryVoltage());
    armLigament.setAngle(angle.in(Degrees));
    Telemetry.log("Arm/Mechanism", mechanism);
  }

  /** Where the slide is, from the simulated SPARK. */
  Angle getSlidePosition() {
    return Rotations.of(slideSim.getPosition());
  }

  /** How fast the slide is turning, from the simulated SPARK. */
  AngularVelocity getSlideVelocity() {
    return RPM.of(slideSim.getVelocity());
  }

  /** The arm's angle, from its physics simulation. */
  Angle getArmAngle() {
    return Radians.of(armPhysics.getAngle());
  }

  @Override
  public void simulationPeriodic() {
    double battery = RobotController.getBatteryVoltage();

    slidePhysics.setInputVoltage(slideSim.getAppliedOutput() * battery);
    slidePhysics.update(LOOP.in(Seconds));
    slideSim.iterate(RadiansPerSecond.of(slidePhysics.getAngularVelocity()).in(RPM), battery, LOOP.in(Seconds));

    armPhysics.setInputVoltage(armSim.getAppliedOutput() * battery);
    armPhysics.update(LOOP.in(Seconds));
    armSim.iterate(
        RadiansPerSecond.of(armPhysics.getVelocity()).in(RPM) * ARM_GEARING, battery, LOOP.in(Seconds));
  }
}
