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
   - **Minion**: REV Robotics Minion motor
   - **Krakenx44**: CTRE Kraken X40 motor (only with TalonFX)
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
   - **Supply Current Limit**: Current limit from the power supply (TalonFX/TalonFXS only)

## Step 3: Control Configuration

Configure the control system parameters:

1. **PID Values**: Set the PID controller gains
   - **kP**: Proportional gain (start with a small value like 0.1)
   - **kI**: Integral gain (typically start with 0)
   - **kD**: Derivative gain (typically start with 0)

2. **Max Velocity/Acceleration**: (Optional) Set maximum velocity and acceleration
   - For position control profiles
   - Units are rotations per second (or meters per second for elevators)

3. **Feedforward**: (Optional) Configure feedforward constants
   - **kS**: Static friction compensation (volts)
   - **kV**: Velocity feedforward (volts per rotation per second)
   - **kA**: Acceleration feedforward (volts per rotation per second squared)
   - **kG**: Gravity compensation (volts, for arms and elevators)

4. **Soft Limits**: (Optional) Set position limits in software
   - **Forward Limit**: Maximum position (rotations or meters)
   - **Reverse Limit**: Minimum position (rotations or meters)

## Step 4: Telemetry Configuration

Configure what data to log:

1. **NetworkTables Key**: Base path for telemetry values
   - Example: `Subsystem` or `Elevator`

2. **Position Unit**: Select the unit for position data
   - **Rotations**: Position in rotations
   - **Radians**: Position in radians
   - **Degrees**: Position in degrees

3. **Telemetry Values**: Select which values to log
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
4. **Drum Radius**: Radius of the drum/sprocket in meters

### For Arms:

1. **Arm Length**: Length of the arm in meters
2. **Starting Position**: Initial angle in degrees
3. **Hard Limits**: Minimum and maximum angles in degrees
4. **Mass**: Mass of the arm in kg or lbs

## Step 6: Generate and Use Code

The code is automatically generated as you configure the mechanism:

1. **View Generated Code**: Switch to the "Generated Code" tab to see the Java code
2. **Switch Between Files**: Use the buttons above the code display to switch between files
   - The main subsystem file (e.g., `ElevatorSubsystem.java`)
   - The simulation visualization file (e.g., `ElevatorSubsystemSim.java`)

3. **Download Code**: Use the buttons to download the code
   - **Copy**: Copy the current file to clipboard
   - **Save File**: Download the current file
   - **Download All**: Download all files as a ZIP archive

4. **Use in Your Project**: Add the downloaded files to your robot project
   - Place them in the `src/main/java/frc/robot/subsystems` directory
   - Import the subsystem in your `RobotContainer.java` file
   - Create commands that use the subsystem

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
- **Current Limits**: Always set appropriate current limits to protect your motors
- **Command Creation**: Use the generated command factory methods for common operations

## Troubleshooting

- **Oscillation in Simulation**: Reduce kP or increase kD
- **Slow Response**: Increase kP or add feedforward
- **Position Errors**: Check your gear ratio and feedforward values
- **Code Generation Errors**: Check for invalid input values
