# REVLib SPARK simulation tests

A small WPILib 2027 robot project for trying REVLib's simulated SPARK MAX closed loop, both by hand
in the simulator and with JUnit tests. It goes with
[wpilibsuite/SystemcoreTesting#425](https://github.com/wpilibsuite/SystemcoreTesting/issues/425).

Built with WPILib / GradleRIO `2027.0.0-alpha-7` and REVLib `2027.0.0-alpha-8`.

## What it shows

| | In simulation |
| --- | --- |
| kS, kV, kG in the modes REV documents | applied correctly |
| kA in MAXMotion | applied correctly |
| kI and kD | applied per second, where a real SPARK applies them per 1 ms loop |
| MAXMotion position | accelerates far slower than configured, and doesn't stop at the goal |
| kCos | uses cos(setpoint, read as degrees), not cos(position) |
| kV in closed loop slots 1 to 3 | not applied at all |
| kP in closed loop slot 1 | about 8% too much |

## Driving it in the simulator

```
./gradlew simulateJava
```

Plug in a gamepad (or use the keyboard gamepad in the sim GUI) on port 0 and put the robot in
teleop. There are two simulated SPARK MAXs, each with real physics:

- **Slide**: a NEO with a light load (DCMotorSim), on CAN ID 1.
- **Arm**: a NEO through 50:1 driving a 2 kg, 0.5 m arm (SingleJointedArmSim, with gravity), on
  CAN ID 2. 0 degrees is level, and it starts hanging straight down.

| Button | What it does |
| --- | --- |
| A (face down) | Slide to 100 rotations with **MAXMotion** (REV's way) |
| B (face right) | Slide back to 0 with **MAXMotion** |
| X (face left) | Slide to 100 rotations with the **workaround**: a `TrapezoidProfile` on the SystemCore, each step sent with `kPosition`, and kV x velocity as an arbitrary feedforward |
| Y (face up) | Slide back to 0 with the workaround |
| Start | Slide at 3000 RPM with plain **velocity control**, the control case |
| Right bumper | Arm to 45 degrees with **kCos** (REV's way) |
| Left bumper | Arm to 45 degrees with the **workaround**: kCos 0, and kG x cos(angle) as an arbitrary feedforward |
| Back | Stop both |

Both use the same constraints (3000 RPM cruise, 6000 RPM/s), so A and X should look the same. They
don't: X lands on 100 rotations in about 2.5 s, A crawls up to speed and runs well past the goal.
The right bumper holds the arm a few degrees high, because kCos gives nearly the full kG at every
angle.

Everything is published with Telemetry, so it can be graphed in AdvantageScope or Glass:

- `Slide/Position (rot)`, `Slide/Velocity (RPM)` and `Slide/Applied (V)`, from the simulated SPARK.
- `Slide/Profile position (rot)`, `Slide/Profile velocity (RPM)` and
  `Slide/Profile acceleration (RPM per s)`: what MAXMotion should be doing, for comparison.
- `Slide/Mode` and `Slide/Goal (rot)`.
- `Arm/Angle (deg)`, `Arm/Goal (deg)`, `Arm/Applied (V)` and `Arm/Mode`.
- `Arm/Gravity it needs (V)`: kG x cos(angle). `Arm/Mechanism` draws the arm.

## Tests

```
./gradlew test
```

Each test checks the documented behaviour, so the failures are the bugs:

| Test | Result |
| --- | --- |
| `FeedforwardGainTest` | passes |
| `IntegralDerivativeTest` | passes; shows kI and kD are per second in simulation |
| `MaxMotionProfileTest` | the velocity control case passes; MAXMotion fails |
| `KCosTest` | 4 of 7 fail; the 3 that pass are where cos(position) happens to equal cos(setpoint in degrees) |
| `ClosedLoopSlotTest` | kV fails in slots 1 to 3, kP fails in slot 1 |
| `RobotControlsTest` | passes; drives the robot program from a simulated gamepad and checks the workaround and velocity control |

Every test except `RobotControlsTest` sets P, I and D to 0 (apart from the gain under test), holds
the motor still, and reads the applied output after 50 steps of 20 ms. The simulated output ramps in
over about 20 steps, so reading it sooner gives a smaller number.
