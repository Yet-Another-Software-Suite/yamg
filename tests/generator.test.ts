import fs from "fs";
import path from "path";
import { generateFiles, setTemplateLoader, templatePaths } from "@/lib/code-generator";
import { getCompatibleMotors } from "@/lib/config/hardware-config";
import { elevatorDrive } from "@/lib/elevator-drive";
import type { FormValues } from "@/lib/types";

// Prettier's Java plugin is an ES module, which Jest cannot load. The Gradle check compiles the output.
jest.mock("@/lib/format-java", () => ({ formatJava: async (java: string) => java }));

// Read the templates from disk instead of fetching them.
setTemplateLoader(async (p) => fs.readFileSync(path.join(__dirname, "..", "public", "templates", p), "utf-8"));

const MECHANISMS: FormValues["mechanismType"][] = ["Arm", "Elevator", "Pivot", "Flywheel"];
const CONTROLLERS: FormValues["motorControllerType"][] = ["SparkMAX", "SparkFlex", "TalonFX", "TalonFXS", "ThriftyNova"];
const OUTPUTS: NonNullable<FormValues["outputType"]>[] = ["vendor", "yams"];
const COMMANDS: NonNullable<FormValues["commandsVersion"]>[] = ["v2", "v3"];

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
      positionUnit: everything ? "Degrees" : "Rotations",
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

  it("leaves telemetry to YAMS when YAMS is used", async () => {
    const [yams] = await generateFiles(form("Arm", "SparkMAX", "yams", "v2", true, "epilogue"));
    expect(yams.content).not.toMatch(/@Logged|Telemetry\.log/);
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

  it("uses one template per output, Commands version and mechanism", () => {
    const paths = templatePaths(form("Arm", "TalonFX", "yams", "v3", true));
    expect(paths).toEqual({ controller: "yams/controllers/TalonFX.hbs", mechanism: "yams/v3/arm.java.hbs" });
  });
});
