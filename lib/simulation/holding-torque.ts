import { getMotor } from "@/lib/config/hardware-config"
import { elevatorDrive } from "@/lib/elevator-drive"
import type { FormValues } from "@/lib/types"

/** The battery's voltage with no load, which the sim's stall current is worked out at. */
const NOMINAL_VOLTAGE = 12

/** Pounds to kilograms, as the sim converts them. */
const KG_PER_LB = 0.453592

/** The torque a load needs, and the most the motors can give, at the mechanism, in newton meters. */
export interface HoldingTorque {
  /** The most gravity pulls on the mechanism anywhere in its travel. */
  needed: number
  /** The most the motors give: at the stator current limit, or stalled at 12 V with no limit. */
  available: number
  /** Where gravity pulls hardest: an arm's angle in degrees. Undefined for an elevator. */
  worstAngle?: number
}

/**
 * The torque the mechanism needs to hold its load against gravity, and the most its motors can give,
 * worked out the way the simulation works them out. Undefined for a mechanism gravity does not pull
 * on: a pivot, a turret, a flywheel or a level slide.
 */
export function holdingTorque(formValues: FormValues, motorCount: number): HoldingTorque | undefined {
  const motor = getMotor(formValues.motorType)
  const stallCurrent = NOMINAL_VOLTAGE / motor.resistance
  const statorLimit = formValues.currentLimits?.stator ?? 0
  const current = statorLimit > 0 ? Math.min(statorLimit, stallCurrent) : stallCurrent
  const available = motor.kt * current * (formValues.gearRatio || 1) * motorCount

  if (formValues.mechanismType === "Arm") {
    const params = formValues.armParams ?? {}
    const mass = (params.mass || 5.0) * (params.massUnit === "lbs" ? KG_PER_LB : 1)
    const length = params.length || 1.0
    // Gravity pulls hardest with the arm closest to level, anywhere between its hard stops.
    const min = params.hardLimitMin ?? -90
    const max = params.hardLimitMax ?? 90
    let worstAngle = min
    for (let angle = min; angle <= max; angle += 0.5) {
      if (Math.abs(Math.cos((angle * Math.PI) / 180)) > Math.abs(Math.cos((worstAngle * Math.PI) / 180))) {
        worstAngle = angle
      }
    }
    const needed = mass * 9.81 * (length / 2) * Math.abs(Math.cos((worstAngle * Math.PI) / 180))
    return { needed, available, worstAngle }
  }

  if (formValues.mechanismType === "Elevator") {
    const drive = elevatorDrive(formValues.elevatorParams)
    if (drive.level) return undefined
    const params = formValues.elevatorParams ?? {}
    const mass = (params.mass || 5.0) * (params.massUnit === "lbs" ? KG_PER_LB : 1)
    return { needed: mass * 9.81 * drive.effectiveRadiusMeters, available }
  }

  return undefined
}

/**
 * A warning that the motors cannot hold the mechanism's load, so the simulation (and the robot)
 * will stall, or null when they can.
 */
export function holdingTorqueWarning(formValues: FormValues, motorCount: number): string | null {
  const torque = holdingTorque(formValues, motorCount)
  if (!torque || torque.available >= torque.needed) return null
  const motor = getMotor(formValues.motorType)
  const motors = `${motorCount} ${motor.displayName}${motorCount === 1 ? "" : "s"} at ${formValues.gearRatio}:1`
  const statorLimit = formValues.currentLimits?.stator ?? 0
  const limit = statorLimit > 0 ? `at the ${statorLimit} A current limit` : "even stalled at 12 V"
  const noun = formValues.mechanismType.toLowerCase()
  const where =
    torque.worstAngle === undefined
      ? `to hold up the ${noun}`
      : Math.abs(Math.cos((torque.worstAngle * Math.PI) / 180)) > 0.999
        ? `to hold the ${noun} level`
        : `to hold the ${noun} at ${torque.worstAngle}°`
  return (
    `It takes ${torque.needed.toFixed(1)} N·m ${where}, but ${motors} ${motorCount === 1 ? "gives" : "give"} at most ${torque.available.toFixed(1)} N·m ${limit}, ` +
    `so the ${noun} will stall. More motors, more gearing or a higher current limit would help.`
  )
}
