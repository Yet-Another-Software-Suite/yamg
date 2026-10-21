import { DEFAULT_VALUES } from "@/components/useCodeGeneratorForm"
import { DEFAULT_GEAR_RATIO, DEFAULT_PID, gearRatioForMechanism, pidForMechanism } from "@/lib/default-gains"

describe("default gains", () => {
  it("starts the form with the elevator's firm gains", () => {
    expect(DEFAULT_VALUES.mechanismType).toBe("Elevator")
    expect(DEFAULT_VALUES.pidValues).toEqual({ kP: 50, kI: 0, kD: 0 })
  })

  it("follows the mechanism type while the gains are untouched", () => {
    expect(pidForMechanism(DEFAULT_PID.Elevator, "Elevator", "Flywheel")).toEqual(DEFAULT_PID.Flywheel)
    expect(pidForMechanism(DEFAULT_PID.Flywheel, "Flywheel", "Arm")).toEqual(DEFAULT_PID.Arm)
  })

  it("keeps gains that were edited", () => {
    const edited = { kP: 12, kI: 0, kD: 0.5 }
    expect(pidForMechanism(edited, "Elevator", "Arm")).toBe(edited)
  })

  it("follows the mechanism type's gear ratio until it is edited", () => {
    expect(DEFAULT_VALUES.gearRatio).toBe(DEFAULT_GEAR_RATIO.Elevator)
    expect(gearRatioForMechanism(15, "Elevator", "Arm")).toBe(60)
    expect(gearRatioForMechanism(60, "Arm", "Flywheel")).toBe(1)
    expect(gearRatioForMechanism(25, "Elevator", "Flywheel")).toBe(25)
  })
})
