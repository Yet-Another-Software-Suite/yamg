import { homingIssues, homingNotes, homingSwitches } from "@/lib/homing"
import { ArmSim } from "@/lib/simulation/arm-sim"
import { ElevatorSim } from "@/lib/simulation/elevator-sim"
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
    pidValues: { kP: 1, kI: 0, kD: 0 },
    gearRatio: 50,
    brakeMode: true,
    telemetry: { ntKey: "Arm", position: true, velocity: true, voltage: false, temperature: false, current: false },
    armParams: { hardLimitMin: -10, hardLimitMax: 100 },
    homing: { enabled: true, lower: { enabled: true, channel: 4 }, upper: { enabled: true, channel: 5 } },
    ...overrides,
  } as FormValues
}

describe("homing", () => {
  it("uses the switches that are on, only while homing is on, and never on a flywheel", () => {
    expect(homingSwitches(arm()).map((s) => s.end)).toEqual(["lower", "upper"])
    expect(homingSwitches(arm({ homing: { enabled: false, lower: { enabled: true } } }))).toEqual([])
    expect(homingSwitches(arm({ homing: { enabled: true, lower: { enabled: false }, upper: { enabled: true } } })).map((s) => s.end)).toEqual(["upper"])
    expect(homingSwitches(arm({ mechanismType: "Flywheel" }))).toEqual([])
  })

  it("asks for a switch, a Smart IO channel, and one no other device uses", () => {
    const issue = (values: FormValues, path: string) => homingIssues(values).find((i) => i.path.join(".") === path)?.message
    expect(issue(arm({ homing: { enabled: true, lower: { enabled: false }, upper: { enabled: false } } }), "homing.enabled")).toMatch(/Turn on/)
    expect(issue(arm({ homing: { enabled: true, lower: { enabled: true, channel: 6 } } }), "homing.lower.channel")).toMatch(/0 to 5/)
    expect(issue(arm({ homing: { enabled: true, lower: { enabled: true, channel: 3 }, upper: { enabled: true, channel: 3 } } }), "homing.upper.channel")).toBe(
      "Smart IO channel 3 is the lower switch's.",
    )
    const withEncoder = arm({ absoluteEncoder: { type: "DutyCycle", port: "smartIo", channel: 4 } })
    expect(issue(withEncoder, "homing.lower.channel")).toBe("Smart IO channel 4 is the absolute encoder's.")
    expect(homingIssues(arm())).toEqual([])
  })

  it("says when the soft limits keep the mechanism off a switch", () => {
    const notes = homingNotes(arm({ softLimits: { reverse: 0, forward: 100 } }))
    expect(notes.map((n) => n.end)).toEqual(["lower"])
    expect(notes[0].message).toMatch(/reverse soft limit \(0°\) stops the arm before it reaches the lower switch at -10°/)
    expect(homingNotes(arm({ softLimits: {} }))).toEqual([])
  })

  it("presses the web sim's switches at the hard stops", () => {
    const homing = { enabled: true, lower: { enabled: true }, upper: { enabled: false } }
    const { options } = createSimulationOptions(arm({ homing, pidValues: { kP: 40, kI: 0, kD: 0 } }), canvas)
    expect(options.lowerSwitch).toBe(true)
    expect(options.upperSwitch).toBe(false)
    const sim = new ArmSim(canvas, options)
    sim.setTarget(-Math.PI / 2)
    for (let i = 0; i < 500; i++) sim.update(0.02)
    expect(sim.lowerSwitchPressed()).toBe(true)
    expect(sim.switchTelemetry()).toEqual(["Lower switch: pressed"])
    sim.setTarget(Math.PI / 4)
    for (let i = 0; i < 500; i++) sim.update(0.02)
    expect(sim.lowerSwitchPressed()).toBe(false)
    expect(sim.switchTelemetry()).toEqual(["Lower switch: open"])

    const elevator = new ElevatorSim(canvas, { motorType: "NEO", gearing: 10, minHeight: 0, maxHeight: 1, upperSwitch: true })
    elevator.setTarget(2)
    for (let i = 0; i < 500; i++) elevator.update(0.02)
    expect(elevator.upperSwitchPressed()).toBe(true)
    expect(elevator.lowerSwitchPressed()).toBe(false)
  })
})
