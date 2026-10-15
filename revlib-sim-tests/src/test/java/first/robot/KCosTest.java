package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.revrobotics.spark.SparkLowLevel.ControlType;
import com.revrobotics.spark.config.SparkMaxConfig;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * kCos "is multiplied by the cosine of the absolute position of the mechanism". With kCos 1 V and
 * kCosRatio 1 (position in rotations), the output should be cos(position) volts wherever the setpoint
 * is. In REVLib 2027.0.0-alpha-7 the simulated SPARK gives cos(setpoint, read as degrees) instead,
 * and ignores the position, so most of these fail.
 */
class KCosTest {
  /** Each case needs its own CAN ID, since they share a JVM. */
  private static final AtomicInteger canId = new AtomicInteger(41);

  @ParameterizedTest(name = "motor at {0} rot, setpoint {1}")
  @CsvSource({
    "0, 0.25",
    "0, 90",
    "0, 180",
    "0.25, 0.25",
    "0.25, 90",
    "0.5, 0.5",
    "0.5, 180",
  })
  void followsThePosition(double position, double setpoint) {
    SparkMaxConfig config = SimSpark.noPid();
    config.closedLoop.feedForward.kCos(1.0).kCosRatio(1.0);
    SimSpark spark = new SimSpark(canId.getAndIncrement(), config);
    spark.sim.setPosition(position);
    spark.spark.getClosedLoopController().setSetpoint(setpoint, ControlType.kPosition);
    double volts = spark.heldVolts(0, 50);
    double expected = Math.cos(2 * Math.PI * position);
    System.out.printf("at %.2f rot, setpoint %.2f: %.4f V, cos(position) %.4f, cos(setpoint in degrees) %.4f%n",
        position, setpoint, volts, expected, Math.cos(Math.toRadians(setpoint)));
    assertEquals(expected, volts, 0.01, "kCos should follow cos(position)");
  }
}
