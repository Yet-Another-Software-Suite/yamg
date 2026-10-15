package first.robot;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.sim.SparkMaxSim;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkMaxConfig;
import org.wpilib.hardware.bus.CANPort;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.math.system.DCMotor;

/** A simulated SPARK MAX with a NEO, configured and enabled, for the tests. */
final class SimSpark {
  static final double VBUS = 12;
  static final double DT = 0.02;
  static final DCMotor NEO = DCMotor.getNEO(1);

  final SparkMax spark;
  final SparkMaxSim sim;

  SimSpark(int canId, SparkMaxConfig config) {
    HAL.initialize();
    spark = new SparkMax(CANPort.CAN_S0, canId, MotorType.kBrushless);
    spark.configure(config, ResetMode.kResetSafeParameters, PersistMode.kNoPersistParameters);
    sim = new SparkMaxSim(spark, NEO);
    // The simulated SPARK outputs nothing while it is disabled.
    sim.enable();
  }

  /** A config with P, I and D at 0, so only the gain under test makes an output. */
  static SparkMaxConfig noPid() {
    SparkMaxConfig config = new SparkMaxConfig();
    config.closedLoop.pid(0, 0, 0);
    return config;
  }

  /**
   * Step the simulation with the motor held at a speed, and return the applied voltage. The
   * simulated output ramps in over about 20 steps, so run at least 50 before reading it.
   */
  double heldVolts(double rpm, int steps) {
    for (int i = 0; i < steps; i++) {
      sim.iterate(rpm, VBUS, DT);
    }
    return sim.getAppliedOutput() * VBUS;
  }
}
