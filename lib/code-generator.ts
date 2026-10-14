import type { FormValues, FileOutput } from "./types";
import Handlebars from "handlebars";
import {
  getMechanism,
  getMotor,
  getMotorController,
  getWPILibMotorType,
} from "./config/hardware-config";
import { formatJava } from "./format-java";

/**
 * Templates live in public/templates:
 *
 * - `{output}/{commands}/{mechanism}.java.hbs` is the whole file for one combination, for example
 *   `yams/v3/arm.java.hbs` or `vendor/v2/elevator.java.hbs`.
 * - `{output}/controllers/{controller}.hbs` defines the inline partials for one motor controller,
 *   for example `vendor/controllers/SparkMAX.hbs`. It is put in front of the mechanism template, so
 *   the mechanism template can use `{{> fields}}`, `{{> configure}}` and the rest.
 */
export type TemplateLoader = (path: string) => Promise<string>;

// In the browser, templates are fetched from the site, which may be served under a base path.
let loadTemplate: TemplateLoader = async (path) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/templates/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${path}`);
  }
  return response.text();
};

/** Load templates some other way, for example from disk in tests. */
export function setTemplateLoader(loader: TemplateLoader) {
  loadTemplate = loader;
}

Handlebars.registerHelper("eq", (a, b) => a === b);

const MECHANISM_FILES: Record<FormValues["mechanismType"], string> = {
  Arm: "arm",
  Elevator: "elevator",
  Pivot: "pivot",
  Flywheel: "flywheel",
};

const THRIFTY_MOTOR_TYPES: Record<string, string> = {
  NEO: "NEO",
  NEO550: "NEO",
  Minion: "MINION",
};

const TALON_FXS_ARRANGEMENTS: Record<string, string> = {
  NEO: "NEO_JST",
  NEO550: "NEO550_JST",
  Vortex: "VORTEX_JST",
  Minion: "Minion_JST",
};

// Java number literals: always with a decimal point, so that integer division never happens.
function num(value: number | undefined, fallback: number): string {
  const v = value === undefined || Number.isNaN(value) ? fallback : value;
  return Number.isInteger(v) ? v.toFixed(1) : String(v);
}

function kg(mass: number | undefined, unit: "kg" | "lbs" | undefined): number {
  const m = mass ?? 5.0;
  // Rounded, so that the Java reads 5.4431 and not 5.443108440000001.
  return unit === "lbs" ? Math.round(m * 0.45359237 * 1e4) / 1e4 : m;
}

/** Everything the templates can use, worked out from the form. */
export function buildTemplateData(data: FormValues) {
  const output = data.outputType ?? "vendor";
  const commands = data.commandsVersion ?? "v2";
  const controller = getMotorController(data.motorControllerType);
  const motor = getMotor(data.motorType);
  const isElevator = data.mechanismType === "Elevator";
  const isFlywheel = data.mechanismType === "Flywheel";
  const forward = data.softLimits?.forward;
  const reverse = data.softLimits?.reverse;

  const templateData: Record<string, unknown> = {
    className: data.subsystemName,
    output,
    commands,
    mechanismType: data.mechanismType,
    motorControllerType: data.motorControllerType,
    motorType: data.motorType,
    motorDisplayName: motor.displayName,
    controllerDisplayName: controller.displayName,
    canId: data.canId,
    dcMotor: getWPILibMotorType(data.motorType),
    gearRatio: num(data.gearRatio, 1),
    brakeMode: data.brakeMode,
    kP: num(data.pidValues.kP, 0),
    kI: num(data.pidValues.kI, 0),
    kD: num(data.pidValues.kD, 0),
    kS: num(data.feedforward?.kS, 0),
    kV: num(data.feedforward?.kV, 0),
    kA: num(data.feedforward?.kA, 0),
    kG: num(data.feedforward?.kG, 0),
    maxVelocity: num(data.maxVelocity, 1),
    maxAcceleration: num(data.maxAcceleration, 1),
    // The unit the PID gains are per: YAMS uses mechanism rotations, or meters for an elevator.
    gainUnit: isElevator ? "meter" : isFlywheel ? "rotation per second" : "rotation",
    velocityControl: isFlywheel,
    statorCurrentLimit: num(data.currentLimits?.stator, 40),
    supplyCurrentLimit: num(data.currentLimits?.supply, 40),
    enableStatorLimit: (data.currentLimits?.stator ?? 0) > 0,
    enableSupplyLimit: (data.currentLimits?.supply ?? 0) > 0 && controller.supportsSupplyCurrentLimit,
    openLoopRampRate: num(data.rampRates?.openLoop, 0),
    closedLoopRampRate: num(data.rampRates?.closedLoop, 0),
    enableOpenLoopRamp: (data.rampRates?.openLoop ?? 0) > 0,
    // A Thrifty Nova has one ramp rate for open and closed loop, so it only gets the open loop one.
    enableClosedLoopRamp: (data.rampRates?.closedLoop ?? 0) > 0 && data.motorControllerType !== "ThriftyNova",
    // Soft limits need both ends. They are in degrees, or meters for an elevator.
    enableSoftLimits: !isFlywheel && forward !== undefined && reverse !== undefined,
    forwardSoftLimit: num(forward, 0),
    reverseSoftLimit: num(reverse, 0),
    ntKey: data.telemetry.ntKey || data.subsystemName,
    logPosition: data.telemetry.position,
    logVelocity: data.telemetry.velocity,
    logVoltage: data.telemetry.voltage,
    logCurrent: data.telemetry.current,
    logTemperature: data.telemetry.temperature,
    positionUnit: data.telemetry.positionUnit,
    // YAMS publishes its own telemetry: everything at HIGH, or position and velocity at MID.
    yamsVerbosity: data.telemetry.voltage || data.telemetry.current || data.telemetry.temperature ? "HIGH" : "MID",
    thriftyMotorType: THRIFTY_MOTOR_TYPES[data.motorType] ?? "NEO",
    talonFXSArrangement: TALON_FXS_ARRANGEMENTS[data.motorType] ?? "NEO_JST",
  };

  if (data.mechanismType === "Arm" || data.mechanismType === "Pivot") {
    const p = data.armParams ?? {};
    Object.assign(templateData, {
      armLength: num(p.length, 1),
      mass: num(kg(p.mass, p.massUnit), 5),
      startingPosition: num(p.startingPosition, 0),
      hardLimitMin: num(p.hardLimitMin, 0),
      hardLimitMax: num(p.hardLimitMax, 90),
    });
  }

  if (isElevator) {
    const p = data.elevatorParams ?? {};
    Object.assign(templateData, {
      startingHeight: num(p.startingHeight, 0),
      hardLimitMin: num(p.hardLimitMin, 0),
      hardLimitMax: num(p.hardLimitMax, 1),
      mass: num(kg(p.mass, p.massUnit), 5),
      drumRadius: num(p.drumRadius, 0.0254),
    });
  }

  if (isFlywheel) {
    Object.assign(templateData, {
      momentOfInertia: num(data.flywheelParams?.momentOfInertia, 0.0025),
      flywheelDiameter: num(data.flywheelParams?.diameter, 0.1016),
    });
  }

  return templateData;
}

/** The template paths for a form: the controller partials, then the mechanism file. */
export function templatePaths(data: FormValues): { controller: string; mechanism: string } {
  const output = data.outputType ?? "vendor";
  const commands = data.commandsVersion ?? "v2";
  return {
    controller: `${output}/controllers/${data.motorControllerType}.hbs`,
    mechanism: `${output}/${commands}/${MECHANISM_FILES[data.mechanismType]}.java.hbs`,
  };
}

/** Render the Java for a form, without formatting it. */
export async function renderJava(data: FormValues): Promise<string> {
  // Throws for an unknown mechanism, which the caller reports.
  getMechanism(data.mechanismType);
  const paths = templatePaths(data);
  const source = (await loadTemplate(paths.controller)) + (await loadTemplate(paths.mechanism));
  const template = Handlebars.compile(source, { noEscape: true });
  // Drop the blank lines the partial definitions leave at the top of the file.
  return template(buildTemplateData(data)).replace(/^\s+/, "");
}

/** The file a form generates: where it goes in a project, and its formatted Java. */
export async function generateFiles(formData: FormValues): Promise<FileOutput[]> {
  const folder = (formData.commandsVersion ?? "v2") === "v3" ? "mechanisms" : "subsystems";
  const filename = `${folder}/${formData.subsystemName}.java`;
  try {
    const java = await renderJava(formData);
    const content = await formatJava(java);
    return [{ filename, content }];
  } catch (error) {
    console.error("Error generating files:", error);
    return [
      {
        filename: "error.txt",
        content: `Error generating files: ${error instanceof Error ? error.message : String(error)}`,
      },
    ];
  }
}
