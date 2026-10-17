import type { FormValues, HomingSwitchParams } from "./types";
import { SMART_IO_CHANNELS, encoderConnection, usesAbsoluteEncoder, usesCrt, type EncoderIssue } from "./absolute-encoder";

/** The two ends of the travel a homing switch can be at. */
export type HomingEnd = "lower" | "upper";

/** Mechanisms with hard stops for homing switches to be at. A flywheel has none. */
export function takesHomingSwitches(mechanismType: FormValues["mechanismType"]): boolean {
  return mechanismType !== "Flywheel";
}

/** True when homing is on and the switch at this end is on. */
export function usesHomingSwitch(data: FormValues, end: HomingEnd): boolean {
  return takesHomingSwitches(data.mechanismType) && data.homing?.enabled === true && data.homing?.[end]?.enabled === true;
}

/** The homing switches in use, lower first. */
export function homingSwitches(data: FormValues): { end: HomingEnd; params: HomingSwitchParams }[] {
  return (["lower", "upper"] as const).filter((end) => usesHomingSwitch(data, end)).map((end) => ({ end, params: data.homing![end]! }));
}

/** The Smart IO channels the absolute encoders use, and what uses each. */
function encoderChannels(data: FormValues): { channel: number; name: string }[] {
  const channels: { channel: number; name: string }[] = [];
  if (usesAbsoluteEncoder(data)) {
    const encoder = data.absoluteEncoder!;
    if (encoderConnection(encoder.type as never, encoder.port, data.motorControllerType) === "smartIo") {
      channels.push({ channel: encoder.channel ?? 0, name: "the absolute encoder" });
    }
  }
  if (usesCrt(data)) {
    for (const [key, name] of [["encoderA", "CRT encoder A"], ["encoderB", "CRT encoder B"]] as const) {
      const encoder = data.turretParams?.[key] ?? {};
      if (encoderConnection(encoder.type ?? "CANcoder", "smartIo", data.motorControllerType) === "smartIo") {
        channels.push({ channel: encoder.channel ?? 0, name });
      }
    }
  }
  return channels;
}

/** Problems with the homing switches, each with the form field it belongs to. */
export function homingIssues(data: FormValues): EncoderIssue[] {
  const issues: EncoderIssue[] = [];
  if (!takesHomingSwitches(data.mechanismType) || data.homing?.enabled !== true) return issues;
  const switches = homingSwitches(data);
  if (switches.length === 0) {
    issues.push({ path: ["homing", "enabled"], message: "Turn on the lower switch, the upper switch, or both." });
  }
  const used = encoderChannels(data);
  for (const { end, params } of switches) {
    const channel = params.channel;
    if (!(Number.isInteger(channel) && channel! >= 0 && channel! < SMART_IO_CHANNELS)) {
      issues.push({ path: ["homing", end, "channel"], message: `Smart IO channels go from 0 to ${SMART_IO_CHANNELS - 1}.` });
      continue;
    }
    const taken = used.find((other) => other.channel === channel);
    if (taken) {
      issues.push({ path: ["homing", end, "channel"], message: `Smart IO channel ${channel} is ${taken.name}'s.` });
    }
    used.push({ channel: channel!, name: `the ${end} switch` });
  }
  return issues;
}

/**
 * A note for each homing switch the soft limits keep the mechanism off: the motor controller stops
 * the mechanism at the soft limit, before it reaches the switch at the hard stop.
 */
export function homingNotes(data: FormValues): { end: HomingEnd; message: string }[] {
  const forward = data.softLimits?.forward;
  const reverse = data.softLimits?.reverse;
  // Soft limits need both ends, as the generator does.
  if (forward === undefined || reverse === undefined || typeof forward !== "number" || typeof reverse !== "number") return [];
  const elevator = data.mechanismType === "Elevator";
  const hard = elevator
    ? { lower: data.elevatorParams?.hardLimitMin ?? 0, upper: data.elevatorParams?.hardLimitMax ?? 1 }
    : { lower: data.armParams?.hardLimitMin ?? 0, upper: data.armParams?.hardLimitMax ?? 90 };
  const unit = elevator ? " m" : "°";
  const noun = data.mechanismType.toLowerCase();
  return homingSwitches(data)
    .filter(({ end }) => (end === "lower" ? reverse > hard.lower : forward < hard.upper))
    .map(({ end }) => ({
      end,
      message:
        `The ${end === "lower" ? "reverse" : "forward"} soft limit (${end === "lower" ? reverse : forward}${unit}) stops the ${noun} ` +
        `before it reaches the ${end} switch at ${hard[end]}${unit}, so the switch only homes it when the ${noun} is already ` +
        `there, such as resting on it when the robot turns on. Move the soft limit to the hard stop to home on it every time.`,
    }));
}
