import fs from "fs";
import path from "path";
import { generateFiles, setTemplateLoader, templatePaths } from "@/lib/code-generator";
import { getCompatibleMotors } from "@/lib/config/hardware-config";
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
): FormValues {
  const motor = getCompatibleMotors(motorControllerType)[0].name as FormValues["motorType"];
  const name = `${mechanismType}${motorControllerType}${everything ? "All" : "Basic"}`;
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
      ntKey: name,
      position: true,
      velocity: true,
      voltage: everything,
      temperature: everything,
      current: everything,
      positionUnit: everything ? "Degrees" : "Rotations",
    },
    armParams: { length: 0.6, hardLimitMin: -10, hardLimitMax: 100, startingPosition: 0, mass: 4, massUnit: "kg" },
    elevatorParams: { startingHeight: 0, hardLimitMin: 0, hardLimitMax: 1.5, mass: 12, massUnit: "lbs", drumRadius: 0.025 },
    flywheelParams: { momentOfInertia: 0.002, diameter: 0.1 },
  };
}

const CASES = OUTPUTS.flatMap((o) =>
  COMMANDS.flatMap((c) => MECHANISMS.flatMap((m) => CONTROLLERS.flatMap((mc) => [form(m, mc, o, c, true), form(m, mc, o, c, false)]))),
);

describe("generateFiles", () => {
  it.each(CASES.map((f) => [`${f.outputType}/${f.commandsVersion}/${f.subsystemName}`, f]))("renders %s", async (_, f) => {
    const files = await generateFiles(f as FormValues);
    expect(files).toHaveLength(1);
    const [file] = files;
    expect(file.filename).not.toBe("error.txt");
    const v3 = (f as FormValues).commandsVersion === "v3";
    expect(file.filename).toBe(`${v3 ? "mechanisms" : "subsystems"}/${(f as FormValues).subsystemName}.java`);
    expect(file.content).toContain(`package first.robot.${v3 ? "mechanisms" : "subsystems"};`);
    expect(file.content).toContain(v3 ? "implements Mechanism" : "extends SubsystemBase");
    // Only 2027 packages, no leftover Handlebars, no em dashes.
    expect(file.content).not.toMatch(/edu\.wpi\.first|frc\.robot|\{\{|—/);
    expect(file.content).not.toMatch(/\bRIO\b|roboRIO|RoboRio/);

    const out = process.env.YAMG_RENDER_DIR;
    if (out) {
      const target = path.join(out, `${(f as FormValues).outputType}-${(f as FormValues).commandsVersion}`, file.filename);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content);
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

  it("uses one template per output, Commands version and mechanism", () => {
    const paths = templatePaths(form("Arm", "TalonFX", "yams", "v3", true));
    expect(paths).toEqual({ controller: "yams/controllers/TalonFX.hbs", mechanism: "yams/v3/arm.java.hbs" });
  });
});
