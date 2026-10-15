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
      CONTROLLERS.flatMap((mc) => [form(m, mc, o, c, true), form(m, mc, o, c, false), form(m, mc, o, c, true, "epilogue")]),
    ),
  ),
);

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

  it("leaves telemetry to YAMS when YAMS is used, but for encoders the code reads itself", async () => {
    const [yams] = await generateFiles(form("Arm", "SparkMAX", "yams", "v2", true, "epilogue"));
    expect(yams.content).not.toContain("@Logged");
    expect(yams.content.match(/Telemetry\.log\("[^"]*"/g)).toEqual([
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
