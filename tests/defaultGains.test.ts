import { DEFAULT_VALUES } from "@/components/useCodeGeneratorForm"
import { DEFAULT_PID, pidForMechanism } from "@/lib/default-gains"

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
})
