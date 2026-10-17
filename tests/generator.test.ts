import fs from "fs";
import path from "path";
import { crtBasis, generateFiles, setTemplateLoader, templatePaths } from "@/lib/code-generator";
import { getCompatibleMotors } from "@/lib/config/hardware-config";
import { absoluteEncoderIssues, crtUniqueRange } from "@/lib/absolute-encoder";
import { elevatorDrive } from "@/lib/elevator-drive";
import type { FormValues } from "@/lib/types";

// Prettier's Java plugin is an ES module, which Jest cannot load. The Gradle check compiles the output.
jest.mock("@/lib/format-java", () => ({ formatJava: async (java: string) => java }));

// Read the templates from disk instead of fetching them.
setTemplateLoader(async (p) => fs.readFileSync(path.join(__dirname, "..", "public", "templates", p), "utf-8"));

const MECHANISMS: FormValues["mechanismType"][] = ["Arm", "Elevator", "Pivot", "Turret", "Flywheel"];
const CONTROLLERS: FormValues["motorControllerType"][] = ["SparkMAX", "SparkFlex", "TalonFX", "TalonFXS", "ThriftyNova"];
const OUTPUTS: NonNullable<FormValues["outputType"]>[] = ["vendor", "yams"];
const COMMANDS: NonNullable<FormValues["commandsVersion"]>[] = ["v2", "v3"];

/**
 * The absolute encoder for a combination, so that every encoder, port and controller is rendered:
 * with every option on, each controller gets a different encoder; with Epilogue, a CANcoder.
 */
function absoluteEncoder(
  motorControllerType: FormValues["motorControllerType"],
  everything: boolean,
  logger: "telemetry" | "epilogue",
): FormValues["absoluteEncoder"] {
  if (logger === "epilogue") {
    // A duty cycle encoder on the SystemCore for a Talon FX, and a CANcoder for the rest.
    return motorControllerType === "TalonFX"
      ? { type: "DutyCycle", port: "smartIo", channel: 2, offset: 90, ratio: 2 }
      : { type: "CANcoder", canId: 20, canBus: 2, offset: 33.25, inverted: true, ratio: 1 };
  }
  if (!everything) return { type: "none" };
  const byController: Record<FormValues["motorControllerType"], FormValues["absoluteEncoder"]> = {
    SparkMAX: { type: "Thrifty10Pin", offset: 12.5, ratio: 1 },
    SparkFlex: { type: "ThroughBore", port: "dataPort", offset: 200, inverted: true, ratio: 1 },
    TalonFX: { type: "CANcoder", canId: 20, canBus: 1, offset: -45, ratio: 1 },
    TalonFXS: { type: "ThroughBore", port: "candi", canId: 23, canBus: 1, offset: 90, inverted: true, ratio: 1 },
    ThriftyNova: { type: "ThroughBore", port: "dataPort", offset: 10, ratio: 1 },
  };
  return byController[motorControllerType];
}

/** A form for one combination. With every option on, soft limits, ramps and supply limits are set. */
function form(
  mechanismType: FormValues["mechanismType"],
  motorControllerType: FormValues["motorControllerType"],
  outputType: FormValues["outputType"],
  commandsVersion: FormValues["commandsVersion"],
  everything: boolean,
  logger: "telemetry" | "epilogue" = "telemetry",
): FormValues {
  const motor = getCompatibleMotors(motorControllerType)[0].name as FormValues["motorType"];
  const name = `${mechanismType}${motorControllerType}${logger === "epilogue" ? "Epilogue" : everything ? "All" : "Basic"}`;
  return {
    subsystemName: name,
    outputType,
    commandsVersion,
    mechanismType,
    motorControllerType,
    motorType: motor,
    canId: 3,
    // With every option on, the devices are on other CAN buses.
    canBus: everything ? 1 : 0,
    pidValues: { kP: 2, kI: 0, kD: 0.1 },
    useMotionProfile: true,
    maxVelocity: 2,
    maxAcceleration: 4,
    feedforward: { kS: 0.1, kV: 1.2, kA: 0, kG: 0.3 },
    gearRatio: 25,
    softLimits: everything ? { forward: mechanismType === "Elevator" ? 1.2 : 80, reverse: 0 } : {},
    brakeMode: mechanismType !== "Flywheel",
    currentLimits: everything ? { stator: 40, supply: 30 } : { stator: 40 },
    rampRates: everything ? { openLoop: 0.25, closedLoop: 0.1 } : { openLoop: 0, closedLoop: 0 },
    telemetry: {
      logger,
      ntKey: name,
      position: true,
      velocity: true,
      voltage: everything,
      temperature: everything,
      current: everything,
    },
    armParams: { length: 0.6, hardLimitMin: -10, hardLimitMax: 100, startingPosition: 0, mass: 4, massUnit: "kg" },
    // Each variant lifts the carriage a different way: a chain cascade, a belt, or a drum.
    elevatorParams: {
      startingHeight: 0,
      hardLimitMin: 0,
      hardLimitMax: 1.5,
      mass: 12,
      massUnit: "lbs",
      drumRadius: 0.025,
      ...(logger === "epilogue"
        ? { driveType: "belt" as const, beltPitchMm: 5, sprocketTeeth: 30 }
        : everything
          ? { driveType: "chain" as const, chainPitch: "25" as const, sprocketTeeth: 22, cascade: true, cascadeStages: 3 }
          : { driveType: "drum" as const }),
    },
    flywheelParams: { momentOfInertia: 0.002, diameter: 0.1 },
    absoluteEncoder: absoluteEncoder(motorControllerType, everything, logger),
    // With every option on, homing switches at both ends; with Epilogue, a lower one that reads low when pressed.
    homing:
      logger === "epilogue"
        ? { enabled: true, lower: { enabled: true, channel: 4, pressedReads: "low" }, upper: { enabled: false, channel: 5 } }
        : { enabled: everything, lower: { enabled: true, channel: 4 }, upper: { enabled: true, channel: 5 } },
    // With every option on, a turret finds its angle with CRT, from a CANcoder and a Through Bore.
    turretParams: {
      crt: mechanismType === "Turret" && everything && logger === "telemetry",
      sharedGearTeeth: 100,
      sharedGearRatio: 1,
      encoderA: { type: "CANcoder", canId: 21, canBus: 3, pinionTeeth: 19, offset: 15, inverted: true },
      encoderB: { type: "ThroughBore", channel: 1, pinionTeeth: 21, offset: 300, inverted: true },
    },
  };
}

const CASES = OUTPUTS.flatMap((o) =>
  COMMANDS.flatMap((c) =>
    MECHANISMS.flatMap((m) =>
      CONTROLLERS.flatMap((mc) => [
        form(m, mc, o, c, true),
        form(m, mc, o, c, false),
        form(m, mc, o, c, true, "epilogue"),
        ...(m === "Flywheel" ? [] : [direct(form(m, mc, o, c, false))]),
      ]),
    ),
  ),
);

/** A form with the profile off: a max velocity and acceleration of 0. */
function direct(f: FormValues): FormValues {
  const name = f.subsystemName.replace(/Basic$/, "Direct");
  return { ...f, subsystemName: name, maxVelocity: 0, maxAcceleration: 0, telemetry: { ...f.telemetry, ntKey: name } };
}

describe("generateFiles", () => {
  it.each(CASES.map((f) => [`${f.outputType}/${f.commandsVersion}/${f.subsystemName}`, f]))("renders %s", async (_, f) => {
    const form = f as FormValues;
    const v3 = form.commandsVersion === "v3";
    const files = await generateFiles(form);
    expect(files.map((file) => file.filename)).toEqual([
      `${v3 ? "mechanisms" : "subsystems"}/${form.subsystemName}.java`,
      "Robot.java",
      v3 ? `${form.subsystemName}Teleop.java` : "RobotContainer.java",
    ]);
    const [mechanism, robot, other] = files;
    expect(mechanism.content).toContain(`package first.robot.${v3 ? "mechanisms" : "subsystems"};`);
    expect(mechanism.content).toContain(v3 ? "implements Mechanism" : "extends SubsystemBase");
    expect(robot.content).toContain(v3 ? "extends OpModeRobot" : "extends TimedRobot");
    // The robot creates the mechanism: Robot itself for Commands v3, RobotContainer for Commands v2.
    expect((v3 ? robot : other).content).toContain(`new ${form.subsystemName}()`);
    if (v3) {
      // A Commands v3 mechanism has no periodic methods of its own, so Robot calls them.
      expect(robot.content).toMatch(/\.periodic\(\);\s+scheduler\.run\(\);/);
      expect(robot.content).toContain(".simulationPeriodic();");
    }
    // WPILib allows op mode names of at most 32 characters.
    const opModeName = other.content.match(/@Teleop\(name = "([^"]*)"/);
    if (v3) expect(opModeName?.[1].length).toBeLessThanOrEqual(32);
    for (const file of files) {
      // Only 2027 packages, no leftover Handlebars, no em dashes.
      expect(file.content).not.toMatch(/edu\.wpi\.first|frc\.robot|\{\{|—/);
      expect(file.content).not.toMatch(/RIO|roboRIO|RoboRio/);
    }

    const out = process.env.YAMG_RENDER_DIR;
    if (out) {
      // The mechanisms share a project. Each combination's robot files get their own folder.
      const project = path.join(out, `${form.outputType}-${form.commandsVersion}`);
      for (const [i, file] of files.entries()) {
        const target = i === 0 ? path.join(project, file.filename) : path.join(project, "robots", form.subsystemName, file.filename);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, file.content);
      }
    }
  });

  it("has no motion profile at all when it is off, or the max velocity and acceleration are both 0", async () => {
    for (const m of MECHANISMS.filter((m) => m !== "Flywheel")) {
      for (const mc of CONTROLLERS) {
        for (const output of OUTPUTS) {
          for (const commands of COMMANDS) {
            const [withProfile] = await generateFiles(form(m, mc, output, commands, false));
            expect(withProfile.content).toMatch(output === "yams" ? /\.withTrapezoidalProfile\(/ : /MAX_VELOCITY/);
            for (const everything of [false, true]) {
              const profiled = form(m, mc, output, commands, everything);
              const files = [
                ...(await generateFiles(direct(profiled))),
                ...(await generateFiles({ ...profiled, useMotionProfile: false })),
              ];
              for (const file of files) {
                expect(file.content).not.toMatch(/profile|MotionMagic|MAXMotion|MAX_VELOCITY|MAX_ACCELERATION|PerSecondPerSecond|LinearAcceleration/i);
              }
            }
          }
        }
        // The profile is off unless it is turned on
        const [off] = await generateFiles({ ...form(m, mc, "vendor", "v2", false), useMotionProfile: undefined });
        expect(off.content).not.toMatch(/MAX_VELOCITY/);
        const [vendor] = await generateFiles(direct(form(m, mc, "vendor", "v2", false)));
        if (mc === "TalonFX" || mc === "TalonFXS") {
          expect(vendor.content).toContain("positionRequest.withPosition(goal)");
        } else if (mc === "ThriftyNova") {
          expect(vendor.content).toContain("// Go straight to the goal, with the feedforward that holds it there.");
        } else {
          expect(vendor.content).toContain("ControlType.kPosition, ClosedLoopSlot.kSlot0);");
        }
      }
    }
  });

  it("takes an arm's kV and kA per rotation, like every other mechanism", async () => {
    const [talon] = await generateFiles(form("Arm", "TalonFX", "vendor", "v2", false));
    expect(talon.content).toContain("config.Slot0.withKS(0.1).withKV(1.2).withKA(0.0);");
    const [spark] = await generateFiles(form("Arm", "SparkMAX", "vendor", "v2", false));
    expect(spark.content).toContain("double rpmPerGainUnit = RotationsPerSecond.of(GEAR_RATIO).in(RPM);");
    const [nova] = await generateFiles(form("Arm", "ThriftyNova", "vendor", "v2", false));
    expect(nova.content).toContain("new ArmFeedforward(0.1, 0.3, 1.2 / (2 * Math.PI), 0.0 / (2 * Math.PI))");
    const [yams] = await generateFiles(form("Arm", "SparkMAX", "yams", "v2", false));
    expect(yams.content).toContain("new ArmFeedforward(0.1, 0.3, 1.2, 0.0)");
  });

  it("gives a Thrifty Nova only the open loop ramp, since it has one ramp rate", async () => {
    for (const output of OUTPUTS) {
      const [file] = await generateFiles(form("Arm", "ThriftyNova", output, "v2", true));
      expect(file.content).not.toMatch(/withClosedLoopRampRate|CLOSED_LOOP_RAMP_SECONDS/);
    }
    const [yams] = await generateFiles(form("Arm", "ThriftyNova", "yams", "v2", true));
    expect(yams.content).toContain("withOpenLoopRampRate");
  });

  it("logs with Epilogue annotations or Telemetry calls, and never both", async () => {
    const [epilogue] = await generateFiles(form("Arm", "SparkMAX", "vendor", "v2", true, "epilogue"));
    expect(epilogue.content).toContain("strategy = Logged.Strategy.OPT_IN");
    expect(epilogue.content).toContain('@Logged(name = "Angle")');
    expect(epilogue.content).not.toContain("Telemetry.log");
    const [telemetry] = await generateFiles(form("Arm", "SparkMAX", "vendor", "v2", true));
    expect(telemetry.content).toContain('Telemetry.log("ArmSparkMAXAll/Angle", getAngle());');
    expect(telemetry.content).not.toContain("@Logged");
  });

  it("leaves telemetry to YAMS when YAMS is used, but for encoders and switches the code reads itself", async () => {
    const [yams] = await generateFiles(form("Arm", "SparkMAX", "yams", "v2", true, "epilogue"));
    expect(yams.content).not.toContain("@Logged");
    expect(yams.content.match(/Telemetry\.log\("[^"]*"/g)).toEqual([
      'Telemetry.log("ArmSparkMAXEpilogue/LowerSwitch"',
      'Telemetry.log("ArmSparkMAXEpilogue/AbsoluteEncoder/Reading"',
      'Telemetry.log("ArmSparkMAXEpilogue/AbsoluteEncoder/Angle"',
    ]);
    expect(yams.content).toContain('.withTelemetry("ArmSparkMAXEpilogue", TelemetryVerbosity.HIGH)');
  });

  it("works out an elevator's travel from its chain, belt or drum, and its cascade", () => {
    const chain = elevatorDrive({ driveType: "chain", chainPitch: "35", sprocketTeeth: 16, cascade: true, cascadeStages: 3 });
    expect(chain.travelPerRotationMeters).toBeCloseTo(0.375 * 0.0254 * 16 * 3);
    expect(elevatorDrive({ driveType: "belt", beltPitchMm: 5, sprocketTeeth: 30 }).travelPerRotationMeters).toBeCloseTo(0.15);
    expect(elevatorDrive({ driveType: "drum", drumRadius: 0.02 }).travelPerRotationMeters).toBeCloseTo(2 * Math.PI * 0.02);
    // Without the cascade switch, the stage count is ignored.
    expect(elevatorDrive({ driveType: "belt", sprocketTeeth: 30, cascadeStages: 3 }).stages).toBe(1);
  });

  it("gives YAMS the chain pitch and teeth, and the cascade after the gearing", async () => {
    const [yams] = await generateFiles(form("Elevator", "SparkMAX", "yams", "v2", true));
    expect(yams.content).toContain(".withDrumRadius(Inches.of(0.25), 22)");
    expect(yams.content).toMatch(/\.withGearing\([^)]*\)\)\s*(\/\/.*\s*)*\.withCascadingElevatorStages\(3\)/);
    const [vendor] = await generateFiles(form("Elevator", "SparkMAX", "vendor", "v2", true));
    expect(vendor.content).toContain("DRIVE_CIRCUMFERENCE = Inches.of(0.25).times(22);");
    expect(vendor.content).toContain("TRAVEL_PER_ROTATION = DRIVE_CIRCUMFERENCE.times(CASCADE_STAGES);");
  });

  it("drives a Thrifty Pulsar, with a DCMotor built from its specs", async () => {
    const PULSAR_CONTROLLERS: FormValues["motorControllerType"][] = ["SparkMAX", "SparkFlex", "TalonFXS", "ThriftyNova"];
    for (const controller of PULSAR_CONTROLLERS) {
      for (const output of OUTPUTS) {
        for (const commands of COMMANDS) {
          const pulsar: FormValues = {
            ...form("Arm", controller, output, commands, true),
            subsystemName: `ArmPulsar${controller}`,
            motorType: "Pulsar",
          };
          const files = await generateFiles(pulsar);
          expect(files[0].content).toContain("new DCMotor(12.0, 3.1, 189.0, 2.7, 7500 * 2 * Math.PI / 60, 1)");
          expect(files[0].content).toContain("WPILib has no model of the Thrifty Pulsar");
          if (controller === "ThriftyNova") expect(files[0].content).toContain("MotorType.PULSAR");
          // A Talon FXS drives a Pulsar as a NEO. YAMS sets the arrangement from the DCMotor.
          if (controller === "TalonFXS" && output === "vendor") expect(files[0].content).toContain("MotorArrangementValue.NEO_JST");

          const out = process.env.YAMG_RENDER_DIR;
          if (out) {
            const project = path.join(out, `${output}-${commands}`);
            for (const [i, file] of files.entries()) {
              const target = i === 0 ? path.join(project, file.filename) : path.join(project, "robots", pulsar.subsystemName, file.filename);
              fs.mkdirSync(path.dirname(target), { recursive: true });
              fs.writeFileSync(target, file.content);
            }
          }
        }
      }
    }
  });

  it("commutates a Minion: advanced hall support on a Talon FXS, and 120 degrees of advance on a SPARK", async () => {
    const minion = async (controller: FormValues["motorControllerType"], motorType: FormValues["motorType"]) => {
      const minionForm: FormValues = { ...form("Arm", controller, "vendor", "v2", true), subsystemName: `Arm${motorType}${controller}`, motorType };
      const files = await generateFiles(minionForm);
      const out = process.env.YAMG_RENDER_DIR;
      if (out) {
        const target = path.join(out, "vendor-v2", files[0].filename);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, files[0].content);
      }
      return files;
    };
    const [fxs] = await minion("TalonFXS", "Minion");
    expect(fxs.content).toContain("MotorArrangementValue.Minion_JST");
    expect(fxs.content).toContain("withAdvancedHallSupport(AdvancedHallSupportValue.Enabled)");
    for (const spark of ["SparkMAX", "SparkFlex"] as const) {
      const [file] = await minion(spark, "Minion");
      expect(file.content).toContain("config.advanceCommutation(120);");
    }
    // Only a Minion
    const [neoFxs] = await minion("TalonFXS", "NEO");
    expect(neoFxs.content).not.toContain("AdvancedHallSupport");
    const [neoSpark] = await minion("SparkMAX", "NEO");
    expect(neoSpark.content).not.toContain("advanceCommutation");
  });

  it("homes on switches wrapped in YAMS Sensors, which the simulation presses at the hard stops", async () => {
    const [arm] = await generateFiles(form("Arm", "TalonFX", "yams", "v3", true));
    expect(arm.content).toContain("private final DigitalInput lowerSwitchInput = new DigitalInput(4);");
    expect(arm.content).toContain('new SensorConfig("ArmTalonFXAllLowerSwitch")');
    expect(arm.content).toContain('.withField("Pressed", () -> lowerSwitchInput.get(), false)');
    // The simulated switch is pressed by where the mechanism really is, not by what the encoder says.
    expect(arm.content).toContain(".map(sim -> sim.getMechanismPosition().lte(Degrees.of(-9.95)))");
    expect(arm.content).toContain(".map(sim -> sim.getMechanismPosition().gte(Degrees.of(99.95)))");
    expect(arm.content).toContain("motor.setEncoderPosition(Degrees.of(-10.0));");
    expect(arm.content).toContain("motor.setEncoderPosition(Degrees.of(100.0));");
    expect(arm.content).not.toContain("DIOSim");

    const [elevator] = await generateFiles(form("Elevator", "SparkMAX", "yams", "v2", true));
    expect(elevator.content).toContain(".map(sim -> smcConfig.convertFromMechanism(sim.getMechanismPosition()).lte(Meters.of(0.0005)))");
    expect(elevator.content).toContain("motor.setEncoderPosition(Meters.of(1.5));");
  });

  it("homes plain vendor code on digital inputs, which the simulation presses at the hard stops", async () => {
    const [pivot] = await generateFiles(form("Pivot", "ThriftyNova", "vendor", "v2", true));
    expect(pivot.content).toContain("private final DigitalInput upperSwitchInput = new DigitalInput(5);");
    expect(pivot.content).toContain("upperSwitchSim = new DIOSim(upperSwitchInput);");
    // A normally open switch to the port's power pin reads high when it is pressed.
    expect(pivot.content).toContain("lowerSwitchSim.setValue(Radians.of(pivotSim.getAngle()).lte(Degrees.of(-9.95)));");
    expect(pivot.content).toContain("setEncoderPosition(MIN_ANGLE);");
    expect(pivot.content).not.toContain("SensorConfig");

    const [elevator] = await generateFiles(form("Elevator", "TalonFX", "vendor", "v3", true, "epilogue"));
    expect(elevator.content).toContain("setEncoderPosition(toMechanismPosition(MIN_HEIGHT));");
    // This one reads low when pressed, and Epilogue logs it.
    expect(elevator.content).toContain("lowerSwitchSim.setValue(!Meters.of(elevatorSim.getPosition()).lte(Meters.of(0.0005)));");
    expect(elevator.content).toContain('@Logged(name = "LowerSwitch")');
    expect(elevator.content).not.toContain("upperSwitch");
  });

  it("has no homing code when homing is off, and none for a flywheel", async () => {
    for (const output of OUTPUTS) {
      const [basic] = await generateFiles(form("Arm", "SparkMAX", output, "v2", false));
      expect(basic.content).not.toContain("DigitalInput");
      expect(basic.content).not.toContain("updateHoming");
      const [flywheel] = await generateFiles(form("Flywheel", "SparkMAX", output, "v2", true));
      expect(flywheel.content).not.toContain("DigitalInput");
    }
  });

  it("gives a Thrifty Nova a supply current limit", async () => {
    const [vendor] = await generateFiles(form("Arm", "ThriftyNova", "vendor", "v2", true));
    expect(vendor.content).toContain("NovaConfig.supplyCurrent(SUPPLY_CURRENT_LIMIT.in(Amps))");
    const [yams] = await generateFiles(form("Arm", "ThriftyNova", "yams", "v2", true));
    expect(yams.content).toContain(".withSupplyCurrentLimit(Amps.of(30.0))");
  });

  it("gives YAMS the encoders a motor controller reads itself, and reads the rest at startup", async () => {
    const [talon] = await generateFiles(form("Pivot", "TalonFX", "yams", "v2", true));
    expect(talon.content).toContain(".withExternalEncoder(cancoder)");
    expect(talon.content).toContain(".withExternalEncoderDiscontinuityPoint(Rotations.of(0.5))");
    expect(talon.content).toContain(".withSimStartingPosition(");
    const [spark] = await generateFiles(form("Arm", "SparkMAX", "yams", "v2", true));
    expect(spark.content).toContain(".withExternalEncoder(spark.getAbsoluteEncoder())");
    const [nova] = await generateFiles(form("Arm", "ThriftyNova", "yams", "v3", true));
    expect(nova.content).toContain(".withVendorConfig(NovaConfig.absoluteEncoderType(AbsoluteEncoderType.REV_ENCODER))");
    expect(nova.content).toContain(".withExternalEncoder(FeedbackSensorType.ABS)");
    const [candi] = await generateFiles(form("Pivot", "TalonFXS", "yams", "v3", true));
    expect(candi.content).toContain(".withExternalEncoder(candi)");
    expect(candi.content).toContain("ExternalFeedbackSensorSourceValue.SyncCANdiPWM1");
    // Encoders from another vendor are read at startup, and given to setEncoderPosition.
    const [dutyCycle] = await generateFiles(form("Pivot", "TalonFX", "yams", "v2", true, "epilogue"));
    expect(dutyCycle.content).toContain("new DutyCycleEncoder(2)");
    expect(dutyCycle.content).toContain("motor.setEncoderPosition(getAbsoluteAngle(Rotations.of(absoluteEncoder.get())));");
    expect(dutyCycle.content).not.toContain("withExternalEncoder");
    const [sparkCancoder] = await generateFiles(form("Arm", "SparkMAX", "yams", "v2", true, "epilogue"));
    expect(sparkCancoder.content).toContain(
      "motor.setEncoderPosition(getAbsoluteAngle(cancoder.getAbsolutePosition().waitForUpdate(0.25).getValue()));",
    );
    // Its reading is logged every loop, without waiting, to find the offset and the inversion.
    expect(sparkCancoder.content).toContain("return cancoder.getAbsolutePosition().refresh().getValue();");
    expect(sparkCancoder.content).toContain('Telemetry.log("ArmSparkMAXEpilogue/AbsoluteEncoder/Reading", getAbsoluteEncoderReading());');
    const [vendor] = await generateFiles(form("Arm", "SparkMAX", "vendor", "v2", true));
    expect(vendor.content).toContain("setEncoderPosition(getAbsoluteAngle(Rotations.of(motor.getAbsoluteEncoder().getPosition().get())));");
    expect(vendor.content).toContain('Telemetry.log("ArmSparkMAXAll/AbsoluteEncoder/Angle", getAbsoluteEncoderAngle());');
    const [epilogue] = await generateFiles(form("Arm", "SparkMAX", "vendor", "v2", true, "epilogue"));
    expect(epilogue.content).toContain('@Logged(name = "AbsoluteEncoder/Reading")');
    expect(vendor.content).toContain("dataPortConfig.absoluteEncoder.setSparkMaxDataPortConfig();");
  });

  it("solves a turret's CRT with EasyCRT when YAMS is used, and the same way without it", async () => {
    const [yams] = await generateFiles(form("Turret", "SparkMAX", "yams", "v2", true));
    expect(yams.content).toContain("new EasyCRT(100, 19, 21)");
    expect(yams.content).toContain("crt.solve(encoderA, encoderB, sharedGearMin, sharedGearMax)");
    expect(yams.content).toContain('Telemetry.log("TurretSparkMAXAll/CRT/EncoderA", getCrtEncoderAReading());');
    const [vendor] = await generateFiles(form("Turret", "TalonFX", "vendor", "v3", true));
    expect(vendor.content).not.toMatch(/new EasyCRT|import yams/);
    expect(vendor.content).toContain("solveCrt(encoderA, encoderB, sharedGearMin, sharedGearMax)");
    expect(vendor.content).toContain("CRT_BASIS_A = 210;");
    expect(vendor.content).toContain("CRT_BASIS_B = 190;");
  });

  it("lets an arm or a pivot find its angle with CRT too", async () => {
    for (const mechanismType of ["Arm", "Pivot"] as const) {
      for (const output of OUTPUTS) {
        for (const commandsVersion of ["v2", "v3"] as const) {
          for (const controller of CONTROLLERS) {
            const base = form(mechanismType, controller, output, commandsVersion, true);
            const crt = { ...base, subsystemName: `${mechanismType}${controller}Crt`, turretParams: { ...base.turretParams, crt: true } };
            const [file] = await generateFiles(crt);
            expect(file.content).toContain("getCrtAngle(");
            expect(file.content).toContain(`The ${mechanismType.toLowerCase()} encoders do not agree on an angle.`);
            expect(file.content).not.toMatch(/the turret|turret's|getCrtTurretAngle/);
            expect(file.content).not.toContain("withExternalEncoder(");
            const out = process.env.YAMG_RENDER_DIR;
            if (out) {
              const target = path.join(out, `${output}-${commandsVersion}`, file.filename);
              fs.mkdirSync(path.dirname(target), { recursive: true });
              fs.writeFileSync(target, file.content);
            }
          }
        }
      }
    }
  });

  it("gives an elevator a rack and pinion, level or lifting", async () => {
    for (const level of [true, false]) {
      for (const output of OUTPUTS) {
        for (const commandsVersion of ["v2", "v3"] as const) {
          for (const controller of CONTROLLERS) {
            const base = form("Elevator", controller, output, commandsVersion, true);
            const rack = {
              ...base,
              subsystemName: `Elevator${controller}${level ? "LevelRack" : "Rack"}`,
              elevatorParams: { ...base.elevatorParams, rackAndPinion: true, pinionPitchDiameter: 1.5, level },
            };
            const [file] = await generateFiles(rack);
            // A rack and pinion is never a cascade, and moves the pitch circumference per turn.
            expect(file.content).not.toMatch(/withCascadingElevatorStages|CASCADE_STAGES/);
            expect(file.content).toContain("Inches.of(1.5).times(Math.PI)");
            if (output === "yams") {
              expect(file.content.includes(".withHorizontalElevator()")).toBe(level);
              expect(file.content).toContain(`new ElevatorFeedforward(0.1, ${level ? "0.0" : "0.3"}, 1.2, 0.0)`);
            } else {
              expect(file.content).toContain(`MAX_HEIGHT.in(Meters), ${level ? "false" : "true"}, STARTING_HEIGHT`);
            }
            const out = process.env.YAMG_RENDER_DIR;
            if (out) {
              const target = path.join(out, `${output}-${commandsVersion}`, file.filename);
              fs.mkdirSync(path.dirname(target), { recursive: true });
              fs.writeFileSync(target, file.content);
            }
          }
        }
      }
    }
  });

  it("works out the CRT basis: 1 more than a multiple of one pinion, and a multiple of the other", () => {
    for (const [a, b] of [[19, 21], [13, 15], [21, 19], [17, 23]]) {
      const basis = crtBasis(a, b);
      expect([basis.a % a, basis.a % b, basis.b % a, basis.b % b]).toEqual([1, 0, 0, 1]);
    }
    expect(crtBasis(19, 21)).toEqual({ a: 210, b: 190 });
  });

  it("checks that the CRT pinions are coprime, and cover the travel", () => {
    const turret = form("Turret", "SparkMAX", "yams", "v2", true);
    expect(absoluteEncoderIssues(turret)).toEqual([]);
    const crt = (a: number, b: number, shared = 100) => ({
      ...turret,
      turretParams: {
        ...turret.turretParams,
        sharedGearTeeth: shared,
        encoderA: { ...turret.turretParams!.encoderA, pinionTeeth: a },
        encoderB: { ...turret.turretParams!.encoderB, pinionTeeth: b },
      },
    });
    expect(absoluteEncoderIssues(crt(20, 30)).map((issue) => issue.message).join()).toContain("not coprime: both divide by 10");
    expect(absoluteEncoderIssues(crt(21, 21)).map((issue) => issue.path.join("."))).toContain("turretParams.encoderB.pinionTeeth");
    // 13 and 15 teeth on an 800 tooth gear cover 0.24 turns (88 degrees), less than the 110 degree travel.
    expect(crtUniqueRange(800, 13, 15)).toBeCloseTo(0.24375);
    expect(absoluteEncoderIssues(crt(13, 15, 800)).map((issue) => issue.path.join("."))).toEqual(["turretParams.sharedGearTeeth"]);
  });

  it("checks that a single absolute encoder cannot wrap, and fits the motor controller", () => {
    const pivot = form("Pivot", "TalonFX", "vendor", "v2", true);
    // The travel is 110 degrees, so a 4:1 encoder turns 440 degrees.
    const geared = { ...pivot, absoluteEncoder: { ...pivot.absoluteEncoder, ratio: 4 } };
    expect(absoluteEncoderIssues(geared).map((issue) => issue.path.join("."))).toEqual(["absoluteEncoder.ratio"]);
    const thrifty = { ...pivot, absoluteEncoder: { type: "Thrifty10Pin" as const, ratio: 1 } };
    expect(absoluteEncoderIssues(thrifty).map((issue) => issue.path.join("."))).toEqual(["absoluteEncoder.type"]);
  });

  it("puts each CAN device on its CAN bus, and a Talon's own encoder on the Talon's bus", async () => {
    const [talon] = await generateFiles(form("Pivot", "TalonFX", "yams", "v2", true));
    expect(talon.content).toContain("new TalonFX(3, new CANBus(CANPort.CAN_S1))");
    expect(talon.content).toContain("new CANcoder(20, new CANBus(CANPort.CAN_S1))");
    const [nova] = await generateFiles(form("Arm", "ThriftyNova", "vendor", "v2", true));
    expect(nova.content).toContain("new Nova(1, CAN_ID,");
    const [turret] = await generateFiles(form("Turret", "SparkMAX", "vendor", "v2", true));
    expect(turret.content).toContain("new CANcoder(21, new CANBus(CANPort.CAN_S3))");

    const pivot = form("Pivot", "TalonFX", "yams", "v2", true);
    const otherBus = { ...pivot, absoluteEncoder: { ...pivot.absoluteEncoder, canBus: 2 } };
    expect(absoluteEncoderIssues(otherBus).map((issue) => issue.path.join("."))).toEqual(["absoluteEncoder.canBus"]);
    // The same CAN ID is fine on another bus, for an encoder the Talon does not read itself.
    const sameId = { ...otherBus, outputType: "vendor" as const, absoluteEncoder: { ...otherBus.absoluteEncoder, canId: 3 } };
    expect(absoluteEncoderIssues(sameId)).toEqual([]);
  });

  it("uses one template per output, Commands version and mechanism", () => {
    const paths = templatePaths(form("Arm", "TalonFX", "yams", "v3", true));
    expect(paths).toEqual({ controller: "yams/controllers/TalonFX.hbs", mechanism: "yams/v3/arm.java.hbs" });
  });
});
