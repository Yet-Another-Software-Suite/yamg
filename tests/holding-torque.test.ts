import { holdingTorque, holdingTorqueWarning } from "@/lib/simulation/holding-torque"
import { ArmSim } from "@/lib/simulation/arm-sim"
import { createSimulationOptions } from "@/lib/simulation/simulation-config"
import type { FormValues } from "@/lib/types"

const canvas = { width: 600, height: 400, getContext: () => ({}) } as unknown as HTMLCanvasElement

beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => {})
  jest.spyOn(console, "log").mockImplementation(() => {})
})

function arm(overrides: Partial<FormValues> = {}): FormValues {
  return {
    subsystemName: "Arm",
    mechanismType: "Arm",
    motorControllerType: "TalonFX",
    motorType: "Krakenx60",
    canId: 1,
    pidValues: { kP: 60, kI: 0, kD: 0 },
    gearRatio: 5,
    brakeMode: true,
    currentLimits: { stator: 40 },
    telemetry: { ntKey: "Arm", position: true, velocity: true, voltage: false, temperature: false, current: false },
    armParams: { length: 1, mass: 20, massUnit: "kg", hardLimitMin: -90, hardLimitMax: 90, startingPosition: 0 },
    ...overrides,
  } as FormValues
}

describe("holding torque", () => {
  it("warns when the motors can't hold an arm level at their current limit", () => {
    const torque = holdingTorque(arm(), 1)!
    // 20 kg at half of 1 m: 98.1 N·m. A Kraken X60's 0.0194 N·m/A at 40 A, through 5:1: 3.9 N·m.
    expect(torque.needed).toBeCloseTo(98.1, 1)
    expect(torque.available).toBeCloseTo(3.88, 2)
    expect(holdingTorqueWarning(arm(), 1)).toBe(
      "It takes 98.1 N·m to hold the arm level, but 1 Kraken X60 at 5:1 gives at most 3.9 N·m at the 40 A current limit, " +
        "so the arm will stall. More motors, more gearing or a higher current limit would help.",
    )
  })

  it("does not warn when the motors can hold it, and counts every motor", () => {
    const light = arm({ gearRatio: 50, armParams: { length: 0.6, mass: 4, massUnit: "kg", hardLimitMin: -30, hardLimitMax: 120 } })
    expect(holdingTorqueWarning(light, 1)).toBeNull()
    expect(holdingTorque(arm(), 4)!.available).toBeCloseTo(4 * 3.88, 1)
  })

  it("uses the stall current with no current limit, and the angle closest to level in the travel", () => {
    const unlimited = holdingTorque(arm({ currentLimits: {} }), 1)!
    expect(unlimited.available).toBeCloseTo((0.0194 * 12) / 0.025 * 5, 0)
    const steep = arm({ armParams: { length: 1, mass: 20, massUnit: "kg", hardLimitMin: 60, hardLimitMax: 90 } })
    expect(holdingTorque(steep, 1)!.worstAngle).toBe(60)
    expect(holdingTorque(steep, 1)!.needed).toBeCloseTo(98.1 / 2, 1)
    expect(holdingTorqueWarning(steep, 1)).toContain("to hold the arm at 60°")
  })

  it("holds an elevator up through its drum, and nothing gravity doesn't pull on", () => {
    const elevator = arm({
      mechanismType: "Elevator",
      motorType: "NEO",
      gearRatio: 1,
      elevatorParams: { mass: 50, massUnit: "kg", driveType: "drum", drumRadius: 0.05, rackAndPinion: false },
    })
    expect(holdingTorque(elevator, 1)!.needed).toBeGreaterThan(0)
    expect(holdingTorqueWarning(elevator, 1)).toContain("to hold up the elevator")
    expect(holdingTorque({ ...arm(), mechanismType: "Pivot" }, 1)).toBeUndefined()
    expect(holdingTorque({ ...arm(), mechanismType: "Flywheel" }, 1)).toBeUndefined()
    expect(holdingTorque({ ...elevator, elevatorParams: { rackAndPinion: true, level: true } }, 1)).toBeUndefined()
  })

  it("agrees with the simulation: a warned arm stalls, and one that isn't lifts", () => {
    const lift = (values: FormValues) => {
      const { options } = createSimulationOptions(values, canvas, 1)
      const sim = new ArmSim(canvas, options)
      sim.setTarget(Math.PI / 4)
      for (let i = 0; i < 300; i++) sim.update(0.02)
      return (sim.position * 180) / Math.PI
    }
    expect(holdingTorqueWarning(arm(), 1)).not.toBeNull()
    expect(lift(arm())).toBeLessThan(0)
    const strong = arm({ gearRatio: 150 })
    expect(holdingTorqueWarning(strong, 1)).toBeNull()
    expect(lift(strong)).toBeGreaterThan(30)
  })
})
