/** The mechanism types, as they appear at the start of a default class name. */
const MECHANISM_NAMES = ["Elevator", "Arm", "Pivot", "Flywheel"] as const;

/** The class name suffix for each command framework. */
const SUFFIXES = { v2: "Subsystem", v3: "Mechanism" } as const;

/**
 * The name to use after the mechanism type or the command framework changes. A name that is only
 * the old type, alone or with "Subsystem" or "Mechanism" after it, becomes the new type with the
 * suffix for the framework: "Subsystem" for Commands v2 and "Mechanism" for Commands v3. So
 * "ElevatorSubsystem" becomes "ArmSubsystem", or "ElevatorMechanism" for Commands v3, and "Pivot"
 * gains its suffix. Any other name is the user's own, and stays as it is.
 */
export function renameForMechanism(name: string, from: string, to: string, commandsVersion: "v2" | "v3" = "v2"): string {
  const match = name.match(/^([A-Za-z]+?)(Subsystem|Mechanism)?$/);
  if (!match || match[1] !== from || !MECHANISM_NAMES.includes(to as (typeof MECHANISM_NAMES)[number])) {
    return name;
  }
  return to + SUFFIXES[commandsVersion];
}
