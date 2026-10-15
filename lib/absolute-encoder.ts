import type { AbsoluteEncoderParams, AbsoluteEncoderType, CrtEncoderParams, FormValues } from "./types";

/** The absolute encoders the form offers, and what each is called. */
export const ABSOLUTE_ENCODERS: Record<AbsoluteEncoderType, { displayName: string; description: string }> = {
  CANcoder: { displayName: "CTRE CANcoder", description: "On the CAN bus." },
  ThroughBore: {
    displayName: "REV Through Bore Encoder",
    description: "Plugged into a SPARK's or a Nova's data port, a CANdi for a Talon, or a SystemCore Smart IO port.",
  },
  Thrifty10Pin: {
    displayName: "Thrifty 10-Pin Magnetic Encoder",
    description: "Plugged into a SPARK MAX's or a Thrifty Nova's data port.",
  },
  DutyCycle: {
    displayName: "Duty cycle encoder",
    description: "Any absolute encoder with a duty cycle (PWM) output, plugged into a CANdi for a Talon, or a SystemCore Smart IO port.",
  },
};

/** The motor controllers whose data port each encoder can plug into. */
const DATA_PORT_CONTROLLERS: Partial<Record<AbsoluteEncoderType, FormValues["motorControllerType"][]>> = {
  ThroughBore: ["SparkMAX", "SparkFlex", "ThriftyNova"],
  Thrifty10Pin: ["SparkMAX", "ThriftyNova"],
};

/** The SystemCore's Smart IO channels. */
export const SMART_IO_CHANNELS = 6;

/** Mechanisms that can have an absolute encoder. */
export function takesAbsoluteEncoder(mechanismType: FormValues["mechanismType"]): boolean {
  return mechanismType === "Arm" || mechanismType === "Pivot" || mechanismType === "Turret";
}

/** True when the encoder can plug into this motor controller's data port. */
export function fitsDataPort(type: AbsoluteEncoderType, controller: FormValues["motorControllerType"]): boolean {
  return DATA_PORT_CONTROLLERS[type]?.includes(controller) ?? false;
}

/** True for a Talon FX or FXS, which can read a CANcoder, or a duty cycle encoder through a CANdi. */
export function isTalon(controller: FormValues["motorControllerType"]): boolean {
  return controller === "TalonFX" || controller === "TalonFXS";
}

/**
 * Where an encoder is read: a CANcoder, a CANdi with the encoder on its PWM1 input, the motor
 * controller's data port, or a SystemCore Smart IO port.
 */
export function encoderConnection(
  type: AbsoluteEncoderType | CrtEncoderParams["type"],
  port: AbsoluteEncoderParams["port"],
  controller: FormValues["motorControllerType"],
): "can" | "candi" | "dataPort" | "smartIo" {
  if (type === "CANcoder") return "can";
  if (type === "Thrifty10Pin") return "dataPort";
  if (port === "smartIo") return "smartIo";
  if (type === "ThroughBore" && fitsDataPort("ThroughBore", controller)) return "dataPort";
  if (port === "candi" && isTalon(controller)) return "candi";
  return "smartIo";
}

/**
 * True when the encoder is from the motor controller's vendor and the controller reads it itself, so
 * YAMS gives it to the SmartMotorController with withExternalEncoder: a CANcoder or a CANdi on a
 * Talon, or an encoder on a SPARK's or a Nova's data port.
 */
export function attachesToMotorController(connection: ReturnType<typeof encoderConnection>, controller: FormValues["motorControllerType"]) {
  return connection === "dataPort" || connection === "candi" || (connection === "can" && isTalon(controller));
}

/**
 * The discontinuity point that keeps an encoder the motor controller reads from wrapping between the
 * hard stops: 0.5 rotations reads -180 to 180 degrees from its zero, 1 rotation reads 0 to 360.
 * Undefined when neither does.
 */
export function discontinuityPoint(data: FormValues): "0.5" | "1.0" | undefined {
  const travel = travelDegrees(data);
  const ratio = data.absoluteEncoder?.ratio ?? 1;
  const low = travel.min * ratio;
  const high = travel.max * ratio;
  return low >= -180 && high < 180 ? "0.5" : low >= 0 && high < 360 ? "1.0" : undefined;
}

/** True when the turret finds its angle from two encoders with the Chinese Remainder Theorem. */
export function usesCrt(data: FormValues): boolean {
  return data.mechanismType === "Turret" && data.turretParams?.crt === true;
}

/** True when the mechanism has one absolute encoder. */
export function usesAbsoluteEncoder(data: FormValues): boolean {
  const type = data.absoluteEncoder?.type ?? "none";
  return takesAbsoluteEncoder(data.mechanismType) && type !== "none" && !usesCrt(data);
}

/** Greatest common divisor of two positive integers. */
export function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * How many rotations the shared gear can turn before the two encoder readings repeat together:
 * lcm(a, b) / shared, the same as EasyCRT.getUniqueRange().
 */
export function crtUniqueRange(sharedGearTeeth: number, pinionA: number, pinionB: number): number {
  return (pinionA / gcd(pinionA, pinionB)) * pinionB / sharedGearTeeth;
}

/** The mechanism's travel between its hard stops, in degrees. */
export function travelDegrees(data: FormValues): { min: number; max: number } {
  return { min: data.armParams?.hardLimitMin ?? 0, max: data.armParams?.hardLimitMax ?? 90 };
}

export interface EncoderIssue {
  path: (string | number)[];
  message: string;
}

/** True when two CAN devices have the same CAN ID on the same CAN bus. */
function sameCan(a: { canId?: number; canBus?: number }, b: { canId?: number; canBus?: number }): boolean {
  return (a.canId ?? 0) === (b.canId ?? 0) && (a.canBus ?? 0) === (b.canBus ?? 0);
}

const isWhole = (value: number | undefined): value is number => value !== undefined && Number.isInteger(value) && value > 0;

/** Problems with the absolute encoder or CRT settings, each with the form field it belongs to. */
export function absoluteEncoderIssues(data: FormValues): EncoderIssue[] {
  const issues: EncoderIssue[] = [];
  const travel = travelDegrees(data);
  const travelLength = travel.max - travel.min;

  if (usesAbsoluteEncoder(data)) {
    const encoder = data.absoluteEncoder!;
    const type = encoder.type as AbsoluteEncoderType;
    const connection = encoderConnection(type, encoder.port, data.motorControllerType);
    if (type === "Thrifty10Pin" && !fitsDataPort(type, data.motorControllerType)) {
      issues.push({
        path: ["absoluteEncoder", "type"],
        message: "The Thrifty 10-Pin Magnetic Encoder plugs into a SPARK MAX's or a Thrifty Nova's data port.",
      });
    }
    const device = connection === "can" ? "CANcoder" : "CANdi";
    if ((connection === "can" || connection === "candi") && sameCan(encoder, data)) {
      issues.push({
        path: ["absoluteEncoder", "canId"],
        message: `The ${device} needs its own CAN ID, not the motor controller's, or another CAN bus.`,
      });
    }
    if (
      data.outputType === "yams" &&
      attachesToMotorController(connection, data.motorControllerType) &&
      (connection === "can" || connection === "candi") &&
      (encoder.canBus ?? 0) !== (data.canBus ?? 0)
    ) {
      // A Talon only reads a remote sensor on its own CAN bus.
      issues.push({
        path: ["absoluteEncoder", "canBus"],
        message: `The Talon reads the ${device} itself, so it has to be on the Talon's CAN bus (CAN_S${data.canBus ?? 0}).`,
      });
    }
    if (connection === "smartIo" && !(Number.isInteger(encoder.channel) && encoder.channel! >= 0 && encoder.channel! < SMART_IO_CHANNELS)) {
      issues.push({ path: ["absoluteEncoder", "channel"], message: `Smart IO channels go from 0 to ${SMART_IO_CHANNELS - 1}.` });
    }
    const ratio = encoder.ratio ?? 1;
    if (!(ratio > 0)) {
      issues.push({ path: ["absoluteEncoder", "ratio"], message: "The encoder gearing must be more than 0." });
    } else if (travelLength * ratio >= 360) {
      // The encoder only knows where it is within one of its turns.
      issues.push({
        path: ["absoluteEncoder", "ratio"],
        message:
          `The encoder turns ${Math.round(travelLength * ratio)}° between the hard stops, but it only knows where it is within one turn (360°), ` +
          "so two angles would read the same. Gear the encoder down" +
          (data.mechanismType === "Turret" ? ", or use two encoders with CRT." : ", or narrow the hard limits."),
      });
    } else if (data.outputType === "yams" && attachesToMotorController(connection, data.motorControllerType) && !discontinuityPoint(data)) {
      // The motor controller reads the encoder from -180 to 180 degrees, or 0 to 360, from its zero.
      issues.push({
        path: ["absoluteEncoder", "ratio"],
        message:
          `The motor controller reads the encoder from -180° to 180° or from 0° to 360° from its zero, but between the hard stops it reads ` +
          `${Math.round(travel.min * ratio)}° to ${Math.round(travel.max * ratio)}°. Choose the ${data.mechanismType.toLowerCase()}'s zero so the travel fits in one of them.`,
      });
    }
  }

  if (usesCrt(data)) {
    const params = data.turretParams!;
    const a = params.encoderA ?? {};
    const b = params.encoderB ?? {};
    const shared = params.sharedGearTeeth;
    if (!isWhole(shared)) {
      issues.push({ path: ["turretParams", "sharedGearTeeth"], message: "Enter the shared gear's tooth count." });
    }
    for (const [key, encoder] of [["encoderA", a], ["encoderB", b]] as const) {
      if (!isWhole(encoder.pinionTeeth)) {
        issues.push({ path: ["turretParams", key, "pinionTeeth"], message: "Enter the pinion's tooth count." });
      }
      const connection = encoderConnection(encoder.type ?? "CANcoder", "smartIo", data.motorControllerType);
      if (connection === "can" && sameCan(encoder, data)) {
        issues.push({ path: ["turretParams", key, "canId"], message: "The CANcoder needs its own CAN ID, not the motor controller's." });
      }
      if (connection === "smartIo" && !(Number.isInteger(encoder.channel) && encoder.channel! >= 0 && encoder.channel! < SMART_IO_CHANNELS)) {
        issues.push({ path: ["turretParams", key, "channel"], message: `Smart IO channels go from 0 to ${SMART_IO_CHANNELS - 1}.` });
      }
    }
    const aConnection = encoderConnection(a.type ?? "CANcoder", "smartIo", data.motorControllerType);
    const bConnection = encoderConnection(b.type ?? "CANcoder", "smartIo", data.motorControllerType);
    if (aConnection === bConnection && aConnection === "can" && sameCan(a, b)) {
      issues.push({ path: ["turretParams", "encoderB", "canId"], message: "The two CANcoders need different CAN IDs, or different CAN buses." });
    }
    if (aConnection === bConnection && aConnection === "smartIo" && a.channel === b.channel) {
      issues.push({ path: ["turretParams", "encoderB", "channel"], message: "The two encoders need different Smart IO channels." });
    }

    if (isWhole(a.pinionTeeth) && isWhole(b.pinionTeeth)) {
      const common = gcd(a.pinionTeeth, b.pinionTeeth);
      if (a.pinionTeeth === b.pinionTeeth) {
        issues.push({
          path: ["turretParams", "encoderB", "pinionTeeth"],
          message: "The two pinions need different tooth counts, or both encoders read the same thing.",
        });
      } else if (common > 1) {
        // Sharing a factor throws range away: 20 and 30 teeth repeat every 60 teeth, not 600.
        issues.push({
          path: ["turretParams", "encoderB", "pinionTeeth"],
          message:
            `${a.pinionTeeth} and ${b.pinionTeeth} teeth are not coprime: both divide by ${common}, so the readings repeat every ` +
            `${(a.pinionTeeth * b.pinionTeeth) / common} teeth instead of ${a.pinionTeeth * b.pinionTeeth}. ` +
            "Pick tooth counts with no common factor, such as 19 and 21.",
        });
      } else if (isWhole(shared)) {
        const sharedRatio = params.sharedGearRatio ?? 1;
        const range = crtUniqueRange(shared, a.pinionTeeth, b.pinionTeeth);
        const needed = (travelLength / 360) * sharedRatio;
        if (needed > range) {
          issues.push({
            path: ["turretParams", "sharedGearTeeth"],
            message:
              `These gears can tell ${range.toFixed(2)} turns of the shared gear apart, but the travel between the hard stops turns it ` +
              `${needed.toFixed(2)} times. Use bigger pinions, or a smaller shared gear.`,
          });
        }
      }
    }
    if (!(params.sharedGearRatio === undefined || params.sharedGearRatio > 0)) {
      issues.push({ path: ["turretParams", "sharedGearRatio"], message: "The shared gear ratio must be more than 0." });
    }
  }

  return issues;
}
