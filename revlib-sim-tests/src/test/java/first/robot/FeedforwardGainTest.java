package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.revrobotics.spark.SparkLowLevel.ControlType;
import com.revrobotics.spark.config.SparkMaxConfig;
import org.junit.jupiter.api.Test;

/**
 * Each feedforward gain on its own, in the modes the docs say it applies, with the motor held still.
 * These pass: the simulated SPARK applies the feedforward correctly.
 */
class FeedforwardGainTest {
  private static double volts(int canId, SparkMaxConfig config, ControlType type, double setpoint) {
    SimSpark spark = new SimSpark(canId, config);
    spark.spark.getClosedLoopController().setSetpoint(setpoint, type);
    double volts = spark.heldVolts(0, 50);
    System.out.printf("%s, setpoint %.0f: %.4f V%n", type, setpoint, volts);
    return volts;
  }

  @Test
  void velocityAppliesKv() {
    SparkMaxConfig config = SimSpark.noPid();
    config.closedLoop.feedForward.kV(0.002);
    assertEquals(2.0, volts(11, config, ControlType.kVelocity, 1000), 1e-3, "kV 0.002 V/RPM at 1000 RPM");
  }

  @Test
  void velocityAppliesKs() {
    SparkMaxConfig config = SimSpark.noPid();
    config.closedLoop.feedForward.kS(0.5);
    assertEquals(0.5, volts(12, config, ControlType.kVelocity, 1000), 1e-3, "kS 0.5 V");
  }

  @Test
  void positionAppliesKsBySignOfError() {
    SparkMaxConfig up = SimSpark.noPid();
    up.closedLoop.feedForward.kS(0.5);
    assertEquals(0.5, volts(13, up, ControlType.kPosition, 10), 1e-3, "kS 0.5 V, setpoint above");
    SparkMaxConfig down = SimSpark.noPid();
    down.closedLoop.feedForward.kS(0.5);
    assertEquals(-0.5, volts(14, down, ControlType.kPosition, -10), 1e-3, "kS 0.5 V, setpoint below");
  }

  @Test
  void positionAppliesKg() {
    SparkMaxConfig config = SimSpark.noPid();
    config.closedLoop.feedForward.kG(1.0);
    assertEquals(1.0, volts(15, config, ControlType.kPosition, 10), 1e-3, "kG 1 V");
  }

  @Test
  void maxMotionAppliesKgAndKa() {
    SparkMaxConfig kG = SimSpark.noPid();
    kG.closedLoop.feedForward.kG(1.0);
    kG.closedLoop.maxMotion.cruiseVelocity(1000).maxAcceleration(2000);
    assertEquals(1.0, volts(16, kG, ControlType.kMAXMotionPositionControl, 10), 1e-3, "kG 1 V");

    SparkMaxConfig kA = SimSpark.noPid();
    kA.closedLoop.feedForward.kA(0.001);
    kA.closedLoop.maxMotion.cruiseVelocity(1000).maxAcceleration(2000);
    assertEquals(2.0, volts(17, kA, ControlType.kMAXMotionPositionControl, 10), 1e-3,
        "kA 0.001 V/(RPM/s) while accelerating at 2000 RPM/s");
  }

  @Test
  void noGainsNoOutput() {
    assertEquals(0.0, volts(18, SimSpark.noPid(), ControlType.kVelocity, 1000), 1e-6);
  }
}
