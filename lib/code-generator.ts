import type { FormValues, FileOutput } from "./types";
import Handlebars from "handlebars";
import {
  getMechanism,
  getMotor,
  getMotorController,
  getWPILibMotorType,
} from "./config/hardware-config";
import {
  ABSOLUTE_ENCODERS,
  attachesToMotorController,
  discontinuityPoint,
  encoderConnection,
  usesAbsoluteEncoder,
  usesCrt,
} from "./absolute-encoder";
import { elevatorDrive } from "./elevator-drive";
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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // webpack's require.context, which Jest does not have.
    interface Require {
      context?: (directory: string, subdirectories: boolean, filter: RegExp) => {
        keys(): string[];
        (key: string): unknown;
      };
    }
  }
}

/**
 * Every template, bundled into the site when it is built, keyed by its path in public/templates.
 * The generator and its templates then always come from the same build: fetching the templates
 * separately let a page from one deploy load templates from another.
 */
function bundledTemplates(): Record<string, string> {
  // webpack only bundles a literal require.context call, so it is called directly rather than
  // checked first. Under Jest, which has no require.context, the call fails and the tests load the
  // templates themselves.
  let context;
  try {
    context = require.context!("../public/templates", true, /\.hbs$/);
  } catch {
    return {};
  }
  return Object.fromEntries(
    context.keys().map((key) => {
      const source = context(key) as string | { default: string };
      return [key.replace(/^\.\//, ""), typeof source === "string" ? source : source.default];
    }),
  );
}

const BUNDLED_TEMPLATES = bundledTemplates();

let loadTemplate: TemplateLoader = async (path) => {
  const source = BUNDLED_TEMPLATES[path];
  if (source === undefined) {
    throw new Error(`Missing template: ${path}`);
  }
  return source;
};

/** Load templates some other way, for example from disk in tests. */
export function setTemplateLoader(loader: TemplateLoader) {
  loadTemplate = loader;
}

Handlebars.registerHelper("eq", (a, b) => a === b);
// True when every argument is, for example {{#if (and useEpilogue logPosition)}}.
Handlebars.registerHelper("and", (...args) => args.slice(0, -1).every(Boolean));
// True when any argument is.
Handlebars.registerHelper("or", (...args) => args.slice(0, -1).some(Boolean));
// True when its argument is not.
Handlebars.registerHelper("not", (a) => !a);

const MECHANISM_FILES: Record<FormValues["mechanismType"], string> = {
  Arm: "arm",
  Elevator: "elevator",
  Pivot: "pivot",
  Turret: "turret",
  Flywheel: "flywheel",
};

/** Shared partials, put in front of every mechanism template: the absolute encoder and CRT code. */
const SHARED_PARTIALS = "shared/absolute-encoder.hbs";

const THRIFTY_MOTOR_TYPES: Record<string, string> = {
  NEO: "NEO",
  NEO550: "NEO",
  Minion: "MINION",
  Pulsar: "PULSAR",
};

const TALON_FXS_ARRANGEMENTS: Record<string, string> = {
  NEO: "NEO_JST",
  NEO550: "NEO550_JST",
  Vortex: "VORTEX_JST",
  Minion: "Minion_JST",
  // The Pulsar is wired and commutated like a NEO
  Pulsar: "NEO_JST",
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
  const isNova = data.motorControllerType === "ThriftyNova";
  const isSpark = data.motorControllerType === "SparkMAX" || data.motorControllerType === "SparkFlex";
  // A max velocity and acceleration of 0 turn the trapezoidal profile off: the closed loop goes
  // straight to the goal. Flywheels have no profile.
  const useProfile = !isFlywheel && !((data.maxVelocity ?? 1) === 0 && (data.maxAcceleration ?? 1) === 0);
  const forward = data.softLimits?.forward;
  const reverse = data.softLimits?.reverse;

  const templateData: Record<string, unknown> = {
    className: data.subsystemName,
    output,
    commands,
    mechanismType: data.mechanismType,
    mechanismNoun: data.mechanismType.toLowerCase(),
    motorControllerType: data.motorControllerType,
    motorType: data.motorType,
    motorDisplayName: motor.displayName,
    controllerDisplayName: controller.displayName,
    canId: data.canId,
    // The SystemCore CAN bus: CANPort for most vendors, and its number for a Thrifty Nova.
    canBus: data.canBus ?? 0,
    canPort: `CAN_S${data.canBus ?? 0}`,
    dcMotor: getWPILibMotorType(data.motorType),
    // WPILib has no model of the Thrifty Pulsar, so the code explains where its DCMotor comes from.
    dcMotorFromSpecs: data.motorType === "Pulsar",
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
    useProfile,
    // The unit the PID gains are per: YAMS uses mechanism rotations, or meters for an elevator.
    gainUnit: isElevator ? "meter" : isFlywheel ? "rotation per second" : "rotation",
    velocityControl: isFlywheel,
    // A Talon or a SPARK runs the trapezoidal profile, the PID and the feedforward itself. A Nova's
    // closed loop runs on the SystemCore, with WPILib's profile and feedforward.
    onboardControl: data.motorControllerType !== "ThriftyNova",
    // WPILib's profile and feedforward: for a Nova, and for a SPARK's position control in
    // simulation. REVLib's simulated SPARK applies the onboard feedforward, but its MAXMotion profile
    // neither keeps to the acceleration nor stops at the goal.
    systemCoreProfile: useProfile && (isNova || isSpark),
    // With no profile, the SystemCore gives a Nova the goal and the feedforward to hold it, and a
    // SPARK arm in simulation its gravity: REVLib's simulated SPARK works kCos out from the setpoint
    // in degrees.
    goalFeedforward: !useProfile && !isFlywheel && (isNova || (isSpark && data.mechanismType === "Arm")),
    // A Nova flywheel's feedforward runs on the SystemCore. A SPARK flywheel runs its own.
    systemCoreFeedforward: isNova && isFlywheel,
    // A Talon runs its closed loop from the last request it was sent, so it is sent the goal once,
    // when the goal changes. A SPARK and a Nova are given their setpoint in periodic(): a Nova's
    // profile, and a SPARK's in simulation, run there.
    sendGoalOnce: ["TalonFX", "TalonFXS"].includes(data.motorControllerType),
    // Gains per meter, which the motor controller code converts to per turn of the drive.
    linear: isElevator,
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
    // YAMS publishes its own telemetry, so Epilogue is only for plain vendor code.
    useEpilogue: data.telemetry.logger === "epilogue" && output !== "yams",
    thriftyMotorType: THRIFTY_MOTOR_TYPES[data.motorType] ?? "NEO",
    talonFXSArrangement: TALON_FXS_ARRANGEMENTS[data.motorType] ?? "NEO_JST",
    // A Minion needs its own commutation: advanced hall support on a Talon FXS, and 120 degrees of advance on a SPARK.
    minion: data.motorType === "Minion",
    // The motor a simulated Talon FX models.
    talonSimMotorType: data.motorType === "Krakenx44" ? "KrakenX44" : "KrakenX60",
  };

  if (data.mechanismType === "Arm" || data.mechanismType === "Pivot" || data.mechanismType === "Turret") {
    const p = data.armParams ?? {};
    Object.assign(templateData, {
      armLength: num(p.length, 1),
      mass: num(kg(p.mass, p.massUnit), 5),
      startingPosition: num(p.startingPosition, 0),
      hardLimitMin: num(p.hardLimitMin, 0),
      hardLimitMax: num(p.hardLimitMax, 90),
    });
  }
  Object.assign(templateData, encoderTemplateData(data));

  if (isElevator) {
    const p = data.elevatorParams ?? {};
    Object.assign(templateData, {
      startingHeight: num(p.startingHeight, 0),
      hardLimitMin: num(p.hardLimitMin, 0),
      hardLimitMax: num(p.hardLimitMax, 1),
      mass: num(kg(p.mass, p.massUnit), 5),
      drumRadius: num(p.drumRadius, 0.0254),
      ...elevatorTemplateData(p),
      ...(elevatorDrive(p).level ? { kG: num(0, 0) } : {}),
    });
  }

  if (isFlywheel) {
    Object.assign(templateData, {
      momentOfInertia: num(data.flywheelParams?.momentOfInertia, 0.0025),
      flywheelDiameter: num(data.flywheelParams?.diameter, 0.1016),
    });
  }

  Object.assign(templateData, robotTemplateData(data, templateData));
  return templateData;
}

/**
 * The Chinese Remainder Theorem's basis for two coprime pinions: a number that is 1 more than a
 * multiple of a and a multiple of b, and one that is a multiple of a and 1 more than a multiple of b.
 * For 19 and 21 teeth they are 210 and 190. Zero when the pinions are not coprime, which the form
 * reports.
 */
export function crtBasis(a: number, b: number): { a: number; b: number } {
  const inverse = (value: number, modulus: number) => {
    for (let x = 1; x < modulus; x++) {
      if ((value * x) % modulus === 1) return x;
    }
    return 0;
  };
  if (!(a > 1 && b > 1)) return { a: 0, b: 0 };
  return { a: b * inverse(b % a, a), b: a * inverse(a % b, b) };
}

/** A CANcoder, a CANdi, or a duty cycle encoder on a Smart IO port. */
interface EncoderDevice {
  field: string;
  cancoder: boolean;
  candi: boolean;
  canId: number;
  canPort: string;
  channel: number;
  displayName: string;
}

/**
 * What the absolute encoder and CRT partials need.
 *
 * With YAMS, an encoder from the motor controller's vendor that the controller reads itself (a
 * CANcoder or a CANdi on a Talon, or an encoder on a SPARK's or a Nova's data port) is given to the
 * SmartMotorController with withExternalEncoder. An encoder from another vendor, and every encoder
 * in plain vendor code, is read once when the robot turns on, and the motor's encoder is set there
 * with setEncoderPosition. The two CRT encoders are never attached to the SmartMotorController.
 * YAMS code solves them with EasyCRT, and plain vendor code with a Chinese Remainder Theorem solve
 * adapted from FRC Team 8114's 2026 turret.
 */
function encoderTemplateData(data: FormValues) {
  const yams = data.outputType === "yams";
  const controller = data.motorControllerType;
  const spark = controller === "SparkMAX" || controller === "SparkFlex";
  const nova = controller === "ThriftyNova";
  const talon = !spark && !nova;
  const systemCoreEncoders: EncoderDevice[] = [];

  /**
   * Add an encoder device field, and return the Java that reads it as an Angle: once at startup,
   * waiting for a fresh value, and every loop, without waiting.
   */
  const systemCoreEncoder = (
    field: string,
    type: string,
    connection: "can" | "candi" | "smartIo",
    canId: number | undefined,
    canBus: number | undefined,
    channel: number | undefined,
  ) => {
    const cancoder = connection === "can";
    const candi = connection === "candi";
    const displayName = ABSOLUTE_ENCODERS[type as keyof typeof ABSOLUTE_ENCODERS].displayName;
    systemCoreEncoders.push({ field, cancoder, candi, canId: canId ?? 0, canPort: `CAN_S${canBus ?? 0}`, channel: channel ?? 0, displayName });
    // A CANcoder or a CANdi can still be booting when the robot program starts, so wait for a fresh reading.
    const signal = cancoder ? `${field}.getAbsolutePosition()` : `${field}.getPWM1Position()`;
    if (cancoder || candi) {
      return { startup: `${signal}.waitForUpdate(0.25).getValue()`, live: `${signal}.refresh().getValue()` };
    }
    return { startup: `Rotations.of(${field}.get())`, live: `Rotations.of(${field}.get())` };
  };

  const shared = () => {
    const hasCancoder = systemCoreEncoders.some((encoder) => encoder.cancoder);
    const hasCandi = systemCoreEncoders.some((encoder) => encoder.candi);
    return {
      systemCoreEncoders,
      hasCancoder,
      hasCandi,
      hasDutyCycleEncoder: systemCoreEncoders.some((encoder) => !encoder.cancoder && !encoder.candi),
      // Talon partials import these already, and so do SPARK partials for CANPort.
      importCanBus: (hasCancoder || hasCandi) && !talon,
      importCanPort: (hasCancoder || hasCandi) && nova,
      seedCall: yams ? "motor.setEncoderPosition" : "setEncoderPosition",
    };
  };

  if (usesCrt(data)) {
    const params = data.turretParams!;
    const crtEncoder = (field: string, encoder: NonNullable<typeof params.encoderA>) => ({
      ...systemCoreEncoder(
        field,
        encoder.type ?? "CANcoder",
        (encoder.type ?? "CANcoder") === "CANcoder" ? "can" : "smartIo",
        encoder.canId,
        encoder.canBus,
        encoder.channel,
      ),
      offset: num(encoder.offset, 0),
      inverted: encoder.inverted ?? false,
      pinionTeeth: encoder.pinionTeeth ?? 0,
    });
    const crtA = crtEncoder("crtEncoderA", params.encoderA ?? {});
    const crtB = crtEncoder("crtEncoderB", params.encoderB ?? {});
    const basis = crtBasis(crtA.pinionTeeth, crtB.pinionTeeth);
    return {
      absoluteEncoder: false,
      crt: true,
      absoluteSeed: true,
      absoluteNative: false,
      sharedGearTeeth: params.sharedGearTeeth ?? 0,
      sharedGearRatio: num(params.sharedGearRatio, 1),
      crtA,
      crtB,
      crtModulus: crtA.pinionTeeth * crtB.pinionTeeth,
      crtBasisA: basis.a,
      crtBasisB: basis.b,
      ...shared(),
    };
  }

  if (!usesAbsoluteEncoder(data)) {
    return { absoluteEncoder: false, crt: false, absoluteSeed: false, absoluteNative: false, ...shared() };
  }

  const encoder = data.absoluteEncoder!;
  const type = encoder.type as keyof typeof ABSOLUTE_ENCODERS;
  const connection = encoderConnection(type, encoder.port, controller);
  const ratio = encoder.ratio ?? 1;
  const offset = encoder.offset ?? 0;
  const native = yams && attachesToMotorController(connection, controller);

  let reading: { startup: string; live: string };
  if (connection === "dataPort") {
    const dataPort = spark
      ? `Rotations.of(${yams ? "spark" : "motor"}.getAbsoluteEncoder().getPosition().get())`
      : `Rotations.of(${yams ? "nova" : "motor"}.status().getAbsPosition())`;
    reading = { startup: dataPort, live: dataPort };
  } else {
    const field = connection === "can" ? "cancoder" : connection === "candi" ? "candi" : "absoluteEncoder";
    reading = systemCoreEncoder(field, type, connection, encoder.canId, encoder.canBus, encoder.channel);
  }

  const controllerName = getMotorController(controller).displayName;
  return {
    absoluteEncoder: true,
    crt: false,
    absoluteNative: native,
    absoluteSeed: !native,
    encoderDisplayName: ABSOLUTE_ENCODERS[type].displayName,
    encoderWhere:
      connection === "can"
        ? `with CAN ID ${encoder.canId ?? 0} on CAN bus CAN_S${encoder.canBus ?? 0}`
        : connection === "candi"
          ? `on the PWM1 input of the CANdi with CAN ID ${encoder.canId ?? 0} on CAN bus CAN_S${encoder.canBus ?? 0}`
          : connection === "dataPort"
          ? `on the ${controllerName}'s data port`
          : `on SystemCore Smart IO channel ${encoder.channel ?? 0}`,
    encoderReading: reading.startup,
    encoderLiveReading: reading.live,
    encoderOffset: num(offset, 0),
    encoderInverted: encoder.inverted ?? false,
    encoderRatio: num(ratio, 1),
    encoderGeared: ratio !== 1,
    // YAMS takes the zero offset in mechanism rotations.
    nativeOffset: num(Math.round((offset / ratio) * 1e4) / 1e4, 0),
    // The form reports a travel that fits neither, so the fallback is only seen while it is being edited.
    discontinuity: discontinuityPoint(data) ?? "0.5",
    travelMiddle: num(((data.armParams?.hardLimitMin ?? 0) + (data.armParams?.hardLimitMax ?? 90)) / 2, 0),
    yamsExternalEncoder:
      connection === "can" ? "cancoder" : connection === "candi" ? "candi" : spark ? "spark.getAbsoluteEncoder()" : "FeedbackSensorType.ABS",
    // YAMS needs the CANdi's PWM1 input chosen as the Talon's feedback source in its vendor config.
    candiFeedback: native && connection === "candi",
    novaDataPort: nova && connection === "dataPort",
    novaEncoderType: type === "Thrifty10Pin" ? "THRIFTY_10_PIN_ENCODER" : "REV_ENCODER",
    // A SPARK MAX's data port also takes an alternate encoder, so it is told to read the absolute one.
    sparkMaxDataPort: !yams && controller === "SparkMAX" && connection === "dataPort",
    ...shared(),
  };
}

/** What Robot.java and the files around it need: the mechanism's field, and its commands. */
function robotTemplateData(data: FormValues, mechanismData: Record<string, unknown>) {
  const v3 = (data.commandsVersion ?? "v2") === "v3";
  const yams = data.outputType === "yams";
  const field = data.subsystemName.charAt(0).toLowerCase() + data.subsystemName.slice(1);
  // WPILib allows op mode names of at most 32 characters.
  const teleop = `${data.subsystemName} Teleop`;
  const teleopName = teleop.length <= 32 ? teleop : data.subsystemName.slice(0, 32);
  const round = (value: number) => Math.round(value * 10) / 10;
  const middle = (low: unknown, high: unknown) => num(round((Number(low) + Number(high)) / 2), 0);

  if (data.mechanismType === "Flywheel") {
    // Bind a slow and a fast speed: 40% and 80% of the motor's free speed through the gearing.
    const freeRpm = (getMotor(data.motorType).kv * 12) / (data.gearRatio || 1);
    const speed = (fraction: number) => num(Math.round((freeRpm * fraction) / 10) * 10, 0);
    const setter = yams && !v3 ? "run" : "setVelocity";
    return {
      mechanismField: field,
      teleopName,
      mechanismNoun: "flywheel",
      bindingUnit: "RPM",
      defaultCommand: v3 ? `${field}.idle()` : `${field}.set(0)`,
      defaultUsesUnit: false,
      defaultDescription: "let the flywheel coast",
      targetA: `${setter}(RPM.of(${speed(0.4)}))`,
      targetB: `${setter}(RPM.of(${speed(0.8)}))`,
      targetDescription: "Spin at a slow speed while the bottom (A) face button is held, and a fast one while the right (B) one is.",
    };
  }

  const elevator = data.mechanismType === "Elevator";
  const unit = elevator ? "Meters" : "Degrees";
  const start = String(elevator ? mechanismData.startingHeight : mechanismData.startingPosition);
  const setter = yams && !v3 ? "run" : elevator ? "setHeight" : "setAngle";
  const noun = data.mechanismType.toLowerCase();
  return {
    mechanismField: field,
    teleopName,
    mechanismNoun: noun,
    bindingUnit: unit,
    defaultCommand: v3 ? `${field}.hold(${unit}.of(${start}))` : `${field}.${setter}(${unit}.of(${start}))`,
    defaultUsesUnit: true,
    defaultDescription: `hold the ${noun} where it starts`,
    targetA: `${setter}(${unit}.of(${start}))`,
    targetB: `${setter}(${unit}.of(${middle(mechanismData.hardLimitMin, mechanismData.hardLimitMax)}))`,
    targetDescription: `Go to where the ${noun} starts while the bottom (A) face button is held, and halfway between its limits while the right (B) one is.`,
  };
}

/**
 * The robot files that go with the mechanism: the template file each is rendered from, and the file
 * it becomes. Commands v2 changes the template's RobotContainer. Commands v3 gets its own teleop op
 * mode, next to the template's ExampleTeleop.
 */
function robotFiles(data: FormValues): { template: string; filename: string }[] {
  if ((data.commandsVersion ?? "v2") === "v3") {
    return [
      { template: "robot/v3/Robot.java.hbs", filename: "Robot.java" },
      { template: "robot/v3/Teleop.java.hbs", filename: `${data.subsystemName}Teleop.java` },
    ];
  }
  return [
    { template: "robot/v2/Robot.java.hbs", filename: "Robot.java" },
    { template: "robot/v2/RobotContainer.java.hbs", filename: "RobotContainer.java" },
  ];
}

/** The elevator's drive and cascade, for the templates. */
function elevatorTemplateData(params: FormValues["elevatorParams"]) {
  const drive = elevatorDrive(params);
  return {
    circumferenceJava: drive.circumferenceJava,
    circumferenceUnit: drive.circumferenceUnit,
    driveDescription: drive.description,
    driveNoun: drive.kind === "chain" ? "sprocket" : drive.kind === "belt" ? "pulley" : drive.kind === "rack" ? "pinion" : "drum",
    rackAndPinion: drive.kind === "rack",
    // A level slide has no gravity: no kG, and no gravity in the simulation.
    level: drive.level,
    cascade: drive.stages > 1,
    cascadeStages: drive.stages,
    // YAMS takes a chain or belt as its pitch and teeth, and a drum as its circumference.
    yamsDriveCall: drive.pitchJava
      ? `.withDrumRadius(${drive.pitchJava}, ${drive.teeth})`
      : `.withMechanismCircumference(${drive.circumferenceJava})`,
  };
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
  const source =
    (await loadTemplate(SHARED_PARTIALS)) + (await loadTemplate(paths.controller)) + (await loadTemplate(paths.mechanism));
  const template = Handlebars.compile(source, { noEscape: true });
  // Drop the blank lines the partial definitions leave at the top of the file.
  return template(buildTemplateData(data)).replace(/^\s+/, "");
}

/** Render a template that does not use a motor controller's partials, such as Robot.java. */
async function renderPlain(path: string, data: FormValues): Promise<string> {
  const template = Handlebars.compile(await loadTemplate(path), { noEscape: true });
  return template(buildTemplateData(data));
}

/**
 * The files a form generates, relative to src/main/java/first/robot: the mechanism, then Robot.java
 * and the other template files it changes.
 */
export async function generateFiles(formData: FormValues): Promise<FileOutput[]> {
  const commands = formData.commandsVersion ?? "v2";
  const folder = commands === "v3" ? "mechanisms" : "subsystems";
  try {
    const files: FileOutput[] = [
      { filename: `${folder}/${formData.subsystemName}.java`, content: await formatJava(await renderJava(formData)) },
    ];
    for (const { template, filename } of robotFiles(formData)) {
      files.push({ filename, content: await formatJava(await renderPlain(template, formData)) });
    }
    return files;
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
