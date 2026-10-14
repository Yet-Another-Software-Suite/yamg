# User Guide: FRC Mechanism Code Generator

This guide provides step-by-step instructions for using the FRC Mechanism Code Generator to create Java code for your robot's mechanisms.

## Getting Started

1. Open the FRC Mechanism Code Generator in your web browser
2. You'll see a form on the left side and output areas on the right

## Step 1: Basic Configuration

Start by configuring the basic parameters of your mechanism:

1. **Subsystem Name**: Enter a name for your subsystem class
   - Example: `ElevatorSubsystem` or `ArmSubsystem`
   - This will be the Java class name, so use CamelCase with no spaces

2. **Mechanism Type**: Select the type of mechanism you're creating
   - **Elevator**: For vertical linear motion (e.g., lifts, elevators)
   - **Arm**: For rotational motion with gravity (e.g., arms, pivoting intakes)
   - **Pivot**: For rotational motion without significant gravity effects (e.g., turrets, wrists)
   - **Flywheel**: For high-speed rotational inertia mechanisms with velocity-only control (e.g., shooters, launchers)

3. **Use YAMS**: Choose what the generated code is built on
   - **Off**: Plain code that uses WPILib and your motor controller's vendor library
   - **On**: Code that uses [YAMS](https://yams.yassrobotics.com). YAMS handles the closed loop, the simulation and the telemetry, and lets you tune the mechanism live

4. **Command Framework**: Match the WPILib 2027 template your project was made from
   - **Commands v2**: Generates a subsystem in `subsystems/`
   - **Commands v3**: Generates a mechanism in `mechanisms/`. Call its `periodic()` from `Robot.robotPeriodic()` and its `simulationPeriodic()` from `Robot.simulationPeriodic()`

The code targets WPILib 2027 and the 2027 vendor libraries, and runs on the SystemCore.

## Step 2: Motor Configuration

Configure the motor and motor controller settings:

1. **Motor Controller Type**: Select your motor controller
   - **SparkMAX**: For REV Robotics SparkMAX controllers
   - **SparkFlex**: For REV Robotics SparkFlex controllers
   - **TalonFX**: For CTRE TalonFX controllers (Phoenix 6)
   - **TalonFXS**: For CTRE TalonFX controllers (Phoenix 6)
   - **ThriftyNova**: For ThriftyNova controllers

2. **Motor Type**: Select your motor
   - **NEO**: REV Robotics NEO brushless motor
   - **NEO550**: REV Robotics NEO 550 brushless motor
   - **Minion**: CTRE Minion motor
   - **Vortex**: REV Robotics NEO Vortex motor
   - **Krakenx44**: CTRE Kraken X44 motor (only with TalonFX)
   - **Krakenx60**: CTRE Kraken X60 motor (only with TalonFX)

3. **CAN ID**: Enter the CAN ID for your motor controller (typically 1-62)

4. **Gear Ratio**: Enter the gear ratio as motor rotations per mechanism rotation
   - Example: If your motor turns 10 times for 1 rotation of the mechanism, enter `10`
   - For elevators, this is motor rotations per drum rotation

5. **Brake Mode**: Toggle between brake mode (checked) and coast mode (unchecked)

6. **Ramp Rates**: (Optional) Configure how quickly the motor can accelerate
   - **Open Loop Ramp Rate**: Time in seconds to reach full throttle in open loop control
   - **Closed Loop Ramp Rate**: Time in seconds to reach full velocity in closed loop control

7. **Current Limits**: (Optional) Set current limits to protect your motors
   - **Stator Current Limit**: Current limit for the motor stator (typically 40A for NEO)
   - **Supply Current Limit**: Current limit from the power supply (TalonFX, TalonFXS and ThriftyNova)

## Step 3: Control Configuration

Configure the control system parameters:

1. **PID Values**: Set the PID controller gains, in volts per rotation of error (per meter for an elevator, and per rotation per second for a flywheel). These are the units YAMS uses, and the generated code converts them for your motor controller
   - **kP**: Proportional gain (start with a small value like 0.1)
   - **kI**: Integral gain (typically start with 0)
   - **kD**: Derivative gain (typically start with 0)

2. **Max Velocity/Acceleration**: (Optional) Set maximum velocity and acceleration
   - For position control profiles
   - Units are radians per second (or meters per second for elevators)

3. **Feedforward**: (Optional) Configure feedforward constants
   - **kS**: Static friction compensation (volts)
   - **kV**: Velocity feedforward (volts per radian per second for an arm, per meter per second for an elevator, and per rotation per second for a pivot or flywheel)
   - **kA**: Acceleration feedforward (in the same units, per second squared)
   - **kG**: Gravity compensation (volts, for arms and elevators)

4. **Soft Limits**: (Optional) Set position limits in software
   - **Forward Limit**: Maximum position (degrees, or meters for an elevator)
   - **Reverse Limit**: Minimum position (degrees, or meters for an elevator)
   - Set both to use them

## Step 4: Telemetry Configuration

This section is hidden when **Use YAMS** is on, because YAMS publishes its own telemetry.

Configure what data to log:

1. **Logging**: How the values are logged
   - **Telemetry**: The mechanism logs them with `Telemetry.log` in its `periodic()`. Nothing else is needed
   - **Epilogue**: The getters you pick are marked `@Logged`, and Epilogue logs them. Mark `Robot` (and `RobotContainer` for Commands v2) `@Logged`, and call `Epilogue.bind(this)` in the `Robot` constructor, or `Epilogue.update(this)` in `robotPeriodic()` for Commands v3

   Both publish each value with its unit.

2. **NetworkTables Key**: Base path for telemetry values
   - Example: `Subsystem` or `Elevator`

3. **Position Unit**: Select the unit for an arm or pivot angle
   - **Rotations**: Position in rotations
   - **Radians**: Position in radians
   - **Degrees**: Position in degrees

4. **Telemetry Values**: Select which values to log
   - **Position**: Log mechanism position
   - **Velocity**: Log mechanism velocity
   - **Voltage**: Log applied voltage
   - **Temperature**: Log motor temperature
   - **Current**: Log motor current

## Step 5: Mechanism-Specific Parameters

Depending on the mechanism type, configure additional parameters:

### For Elevators:

1. **Starting Height**: Initial height in meters
2. **Hard Limits**: Minimum and maximum heights in meters
3. **Mass**: Mass of the elevator carriage in kg or lbs
4. **Drive**: What the gearbox output turns to lift the carriage
   - **Drum**: a spool the rope winds onto. Give its **Drum Radius** in meters
   - **Chain**: a sprocket on **#25** (0.25 in pitch) or **#35** (0.375 in pitch) chain. Give the **Sprocket Teeth**
   - **Belt**: a pulley on a timing belt. Give the **Belt Pitch** (5 mm for HTD, 3 mm for GT2) and the **Pulley Teeth**

   A chain or belt moves one pitch per tooth, so the carriage moves the pitch times the teeth for each turn.
5. **Cascade**: Turn this on for a cascade elevator, and give the **Moving Stages**, counting the carriage. Each stage moves as far again as the one below it, so the carriage moves the stage count times as far as the chain or belt. The generated code corrects the gearing for it: YAMS code calls `withCascadingElevatorStages`, and plain code multiplies the travel per turn

### For Arms:

1. **Arm Length**: Length of the arm in meters
2. **Starting Position**: Initial angle in degrees
3. **Hard Limits**: Minimum and maximum angles in degrees
4. **Mass**: Mass of the arm in kg or lbs

### For Flywheels:

1. **Moment of Inertia**: Rotational inertia of the flywheel in kg·m² (from CAD or ReCalc)
2. **Wheel Diameter**: Diameter of the wheel in meters

Flywheels are velocity-only mechanisms. There is no position control mode, soft limits, or gravity compensation, and the simulation only offers a Velocity Control view.

## Step 6: Generate and Use Code

The code is automatically generated as you configure the mechanism:

1. **View Generated Code**: Switch to the "Generated Code" tab to see the Java code
2. **Switch Between Files**: Use the buttons above the code display. The mechanism is one file, with its physics simulation and its dashboard drawing inside it, and YAMG also generates the template files that use it:
   - **Commands v2**: `subsystems/ElevatorSubsystem.java`, `Robot.java` and `RobotContainer.java`. `RobotContainer` creates the subsystem, gives it a default command and binds the face buttons. `Robot.java` is the template's own, and only changes to set up Epilogue
   - **Commands v3**: `mechanisms/ElevatorSubsystem.java`, `Robot.java` and `ElevatorSubsystemTeleop.java`. `Robot` creates the mechanism and gives it a default command, calls its `periodic()` before the scheduler runs and its `simulationPeriodic()` in simulation, and publishes the scheduler. The teleop op mode binds the gamepad's face buttons; pick it on the driver station
   - The robot files start from the WPILib 2027 templates, and keep the template's example code that its other files use

3. **Download Code**: Use the buttons to download the code
   - **Copy**: Copy the current file to clipboard
   - **Save File**: Download the current file
   - **Download All**: Download a ZIP archive laid out like a robot project

4. **Use in Your Project**: Add the downloaded files to a project made from the WPILib 2027 Command v2 or Command v3 Robot template
   - Install the vendor library for your motor controller (REVLib, Phoenix 6 or ThriftyLib), and YAMS if you generated YAMS code
   - Place the mechanism in `src/main/java/first/robot/subsystems` (Commands v2) or `src/main/java/first/robot/mechanisms` (Commands v3)
   - Replace the template's `Robot.java`, and its `RobotContainer.java` for Commands v2, with the generated ones. For Commands v3, add the teleop op mode next to the template's `ExampleTeleop.java`. **Download All** lays the files out this way

## Step 7: Test with Simulation

Use the built-in simulation to test your mechanism:

1. **Switch to Simulation**: Click the "Simulation" tab
2. **Select Control Mode**: Choose between "Position Control" and "Velocity Control"
3. **Set Target**: Use the slider to set a target position or velocity
4. **Run Simulation**: Click the "Run" button to start the simulation
5. **Observe Behavior**: Watch how the mechanism responds to your control inputs
6. **Adjust Parameters**: If needed, go back to the form and adjust parameters
7. **Reset**: Click "Reset" to return the simulation to its initial state

## Tips for Success

- **Start Simple**: Begin with conservative PID values and increase gradually
- **Test in Simulation**: Use the simulation to verify behavior before deploying to a robot
- **Measure Feedforward**: For best control, measure actual feedforward values on your mechanism
- **Check Units**: Pay attention to units (degrees vs. radians, rotations vs. meters)
- **Verify Gear Ratio**: Double-check your gear ratio calculation
- **Current Limits**: Always set appropriate current limits to protect your motors.
- **Command Creation**: Use the generated command factory methods for common operations

## Troubleshooting

- **Oscillation in Simulation**: Reduce kP or increase kD
- **Slow Response**: Increase kP or add feedforward
- **Position Errors**: Check your gear ratio and feedforward values
- **Code Generation Errors**: Check for invalid input values
