package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.revrobotics.spark.SparkLowLevel.ControlType;
import com.revrobotics.spark.config.SparkMaxConfig;
import org.junit.jupiter.api.Test;

/**
 * kI and kD on their own. A real SPARK runs its loop every millisecond and applies them per loop;
 * the simulated SPARK applies them per second. These pass, and show the difference, so code that
 * scales kI and kD by 1 ms for the real SPARK should not scale them in simulation.
 */
class IntegralDerivativeTest {
  @Test
  void integralIsPerSecond() {
    SparkMaxConfig config = new SparkMaxConfig();
    config.closedLoop.pid(0, 1e-6, 0).iZone(0).iMaxAccum(1);
    SimSpark spark = new SimSpark(21, config);
    // A fixed 100 RPM error: setpoint 100 RPM, motor held still.
    spark.spark.getClosedLoopController().setSetpoint(100, ControlType.kVelocity);
    double dutyCycle = spark.heldVolts(0, 50) / SimSpark.VBUS;
    // 1 s of a 100 RPM error. Per second: 1e-6 * 100 * 1 s = 1e-4. Per 1 ms loop it would be 0.1.
    assertEquals(1e-4, dutyCycle, 1e-6, "kI accumulated per second");
  }

  @Test
  void derivativeIsPerSecond() {
    SparkMaxConfig config = new SparkMaxConfig();
    config.closedLoop.pid(0, 0, 0.01);
    SimSpark spark = new SimSpark(22, config);
    spark.spark.getClosedLoopController().setSetpoint(0, ControlType.kPosition);
    // 60 RPM moves the position 1 rotation per second, so the error falls 1 rotation per second.
    double dutyCycle = spark.heldVolts(60, 50) / SimSpark.VBUS;
    // Per second: 0.01 * -1 = -0.01. Per 1 ms loop it would be -1e-5.
    assertEquals(-0.01, dutyCycle, 1e-6, "kD on the error's rate of change per second");
  }
}
