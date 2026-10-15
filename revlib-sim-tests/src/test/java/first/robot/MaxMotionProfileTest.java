package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.revrobotics.spark.SparkLowLevel.ControlType;
import com.revrobotics.spark.config.SparkMaxConfig;
import org.junit.jupiter.api.Test;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.DCMotorSim;

/**
 * A NEO with a light load, driven by the simulated SPARK through DCMotorSim. MAXMotion position
 * should reach its cruise velocity in cruise / acceleration seconds and stop at the goal. In
 * REVLib 2027.0.0-alpha-7 it doesn't: maxMotionFollowsItsProfile fails. Plain velocity control with
 * the same kV is the control case, and passes.
 */
class MaxMotionProfileTest {
  private static final double CRUISE_RPM = 3000;
  private static final double ACCELERATION_RPM_PER_S = 6000;
  private static final double GOAL_ROTATIONS = 100;

  /** The motor's physics, kept between runs so the motor carries on from where it was. */
  private final DCMotorSim physics =
      new DCMotorSim(Models.singleJointedArmFromPhysicalConstants(SimSpark.NEO, 0.0005, 1), SimSpark.NEO);

  /** Run the motor for some time, returning {position in rotations, velocity in RPM}. */
  private double[] run(SimSpark spark, double seconds) {
    double rpm = physics.getAngularVelocity() * 60 / (2 * Math.PI);
    for (int i = 0; i < Math.round(seconds / SimSpark.DT); i++) {
      physics.setInputVoltage(spark.sim.getAppliedOutput() * SimSpark.VBUS);
      physics.update(SimSpark.DT);
      rpm = physics.getAngularVelocity() * 60 / (2 * Math.PI);
      spark.sim.iterate(rpm, SimSpark.VBUS, SimSpark.DT);
    }
    return new double[] {spark.sim.getPosition(), rpm};
  }

  /** kP in duty cycle per rotation for position, or per RPM for velocity, as in issue #425. */
  private static final double KP = 0.0002;

  private static SparkMaxConfig config() {
    SparkMaxConfig config = new SparkMaxConfig();
    config.closedLoop.pid(KP, 0, 0);
    // A NEO's kV: 473 RPM per volt.
    config.closedLoop.feedForward.kV(1.0 / 473);
    config.closedLoop.maxMotion.cruiseVelocity(CRUISE_RPM).maxAcceleration(ACCELERATION_RPM_PER_S);
    return config;
  }

  @Test
  void velocityControlReachesItsSetpoint() {
    SimSpark spark = new SimSpark(31, config());
    spark.spark.getClosedLoopController().setSetpoint(CRUISE_RPM, ControlType.kVelocity);
    double[] state = run(spark, 1.0);
    System.out.printf("Velocity control after 1 s: %.0f RPM%n", state[1]);
    assertEquals(CRUISE_RPM, state[1], 100, "plain velocity control with kV should hold 3000 RPM");
  }

  @Test
  void maxMotionFollowsItsProfile() {
    SimSpark spark = new SimSpark(32, config());
    spark.spark.getClosedLoopController().setSetpoint(GOAL_ROTATIONS, ControlType.kMAXMotionPositionControl);
    // 0.5 s to reach 3000 RPM, then cruise; the profile ends at the goal at about 2.5 s.
    double[] cruising = run(spark, 1.0);
    double[] settled = run(spark, 4.0);
    System.out.printf("MAXMotion after 1 s: %.1f rot, %.0f RPM; after 5 s: %.1f rot, %.0f RPM%n",
        cruising[0], cruising[1], settled[0], settled[1]);
    assertTrue(cruising[1] > CRUISE_RPM * 0.9,
        "after 1 s MAXMotion should be cruising near 3000 RPM, but was at " + Math.round(cruising[1]) + " RPM");
    assertEquals(GOAL_ROTATIONS, settled[0], 2, "after 5 s MAXMotion should have stopped at the goal");
    assertEquals(0, settled[1], 100, "after 5 s MAXMotion should have stopped");
  }
}
