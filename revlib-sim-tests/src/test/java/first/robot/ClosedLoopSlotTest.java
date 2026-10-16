package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.revrobotics.spark.ClosedLoopSlot;
import com.revrobotics.spark.SparkLowLevel.ControlType;
import com.revrobotics.spark.config.SparkMaxConfig;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/**
 * The same gain in each closed loop slot, in velocity control at 1000 RPM with the motor held still,
 * should give the same output. In REVLib 2027.0.0-alpha-7 and alpha-8 the simulated SPARK only applies kV in
 * slot 0 (slots 1 to 3 give 0 V), and kP in slot 1 gives 1.3 V rather than 1.2 V.
 */
class ClosedLoopSlotTest {
  /** Each case needs its own CAN ID, since they share a JVM. */
  private static final AtomicInteger canId = new AtomicInteger(61);

  private static double volts(SparkMaxConfig config, ClosedLoopSlot slot) {
    SimSpark spark = new SimSpark(canId.getAndIncrement(), config);
    spark.spark.getClosedLoopController().setSetpoint(1000, ControlType.kVelocity, slot);
    return spark.heldVolts(0, 50);
  }

  @ParameterizedTest
  @EnumSource(ClosedLoopSlot.class)
  void kV(ClosedLoopSlot slot) {
    SparkMaxConfig config = SimSpark.noPid();
    config.closedLoop.feedForward.kV(0.002, slot);
    assertEquals(2.0, volts(config, slot), 1e-3, "kV 0.002 V/RPM at 1000 RPM in " + slot);
  }

  @ParameterizedTest
  @EnumSource(ClosedLoopSlot.class)
  void kS(ClosedLoopSlot slot) {
    SparkMaxConfig config = SimSpark.noPid();
    config.closedLoop.feedForward.kS(0.5, slot);
    assertEquals(0.5, volts(config, slot), 1e-3, "kS 0.5 V in " + slot);
  }

  @ParameterizedTest
  @EnumSource(ClosedLoopSlot.class)
  void kP(ClosedLoopSlot slot) {
    SparkMaxConfig config = SimSpark.noPid();
    config.closedLoop.pid(0.0001, 0, 0, slot);
    assertEquals(1.2, volts(config, slot), 1e-3, "kP 0.0001 duty cycle/RPM with a 1000 RPM error in " + slot);
  }
}
