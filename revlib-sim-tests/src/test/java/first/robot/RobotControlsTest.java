package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.RPM;
import static org.wpilib.units.Units.Rotations;

import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.wpilib.driverstation.internal.DriverStationBackend;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.RobotMode;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.GamepadSim;

/**
 * Drives the robot program from a simulated gamepad, as you would in the simulator, to check that the
 * controls do what the README says. Only the workaround and the control case are checked here; the
 * README and the other tests cover what REV's own modes do.
 */
class RobotControlsTest {
  private final Robot robot;
  private final GamepadSim gamepad;

  RobotControlsTest() {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setRobotMode(RobotMode.TELEOPERATED);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();
    // After HAL.initialize(): the simulated gamepad writes to the HAL.
    gamepad = new GamepadSim(0);
    robot = new Robot();
  }

  /** Press a button for one loop, then run the robot for some time. */
  private void press(Consumer<Boolean> button, double seconds) {
    button.accept(true);
    loop();
    button.accept(false);
    for (int i = 1; i < Math.round(seconds / 0.02); i++) {
      loop();
    }
  }

  private void loop() {
    DriverStationSim.notifyNewData();
    DriverStationBackend.refreshData();
    robot.teleopPeriodic();
    robot.simulationPeriodic();
  }

  @Test
  void controls() {
    // Start: velocity control at 3000 RPM, the control case.
    press(gamepad::setStartButton, 1.0);
    System.out.printf("Velocity control: %.0f RPM%n", robot.getSlideVelocity().in(RPM));
    assertEquals(3000, robot.getSlideVelocity().in(RPM), 100, "Start should spin the slide at 3000 RPM");

    // Back stops it, then Y takes it back to 0 with the workaround.
    press(gamepad::setBackButton, 1.0);
    press(gamepad::setFaceUpButton, 4.0);
    // X: the workaround to 100 rotations. The profile takes about 2.5 s.
    press(gamepad::setFaceLeftButton, 4.0);
    System.out.printf("Workaround: %.2f rot, %.0f RPM%n",
        robot.getSlidePosition().in(Rotations), robot.getSlideVelocity().in(RPM));
    assertEquals(100, robot.getSlidePosition().in(Rotations), 1, "X should take the slide to 100 rotations");
    assertEquals(0, robot.getSlideVelocity().in(RPM), 50, "and stop it there");

    // Left bumper: the arm to 45 degrees with the gravity in the arbitrary feedforward.
    press(gamepad::setLeftBumperButton, 3.0);
    System.out.printf("Arm with the workaround: %.1f deg%n", robot.getArmAngle().in(Degrees));
    assertEquals(45, robot.getArmAngle().in(Degrees), 2, "the left bumper should hold the arm at 45 degrees");

    // Right bumper: the same with kCos, REV's way. Printed rather than checked.
    press(gamepad::setRightBumperButton, 3.0);
    System.out.printf("Arm with kCos: %.1f deg%n", robot.getArmAngle().in(Degrees));

    // A: MAXMotion to 100 rotations, REV's way, from 100. Printed rather than checked.
    press(gamepad::setFaceRightButton, 5.0);
    System.out.printf("MAXMotion back to 0: %.2f rot, %.0f RPM%n",
        robot.getSlidePosition().in(Rotations), robot.getSlideVelocity().in(RPM));
  }
}
