import { ArmSim } from "@/lib/simulation/arm-sim"
import { CHART_WINDOW_SECONDS, currentBars, trimSamples, type ChartSample } from "@/lib/simulation/sim-chart"
import { chartUnits } from "@/lib/simulation/simulation-config"
import type { FormValues } from "@/lib/types"

const canvas = { width: 600, height: 400, getContext: () => ({}) } as unknown as HTMLCanvasElement

beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => {})
  jest.spyOn(console, "log").mockImplementation(() => {})
})

const sample = (time: number, current = 0): ChartSample => ({ time, value: 0, setpoint: 0, current })

describe("the sim's chart", () => {
  it("keeps the last 15 seconds", () => {
    const samples = [0, 1, 5, 10, 16, 20].map((t) => sample(t))
    trimSamples(samples)
    expect(samples.map((s) => s.time)).toEqual([5, 10, 16, 20])
  })

  it("bars the current by its mean size in each slice of time", () => {
    const samples = [sample(0.1, 10), sample(0.2, -30), sample(14.9, 5)]
    const bars = currentBars(samples, CHART_WINDOW_SECONDS, 60)
    expect(bars).toHaveLength(60)
    expect(bars[0]).toBeCloseTo(20)
    expect(bars[59]).toBeCloseTo(5)
    expect(bars[30]).toBeNull()
  })

  it("records the position, the setpoint and each motor's current every loop, for 15 seconds", () => {
    const arm = new ArmSim(canvas, { motorType: "NEO", gearing: 50, motorCount: 2, maxVelocity: 2, maxAcceleration: 4 })
    arm.setTarget(1)
    for (let i = 0; i < 1000; i++) arm.update(0.02)
    const last = arm.history[arm.history.length - 1]
    expect(arm.history[0].time).toBeGreaterThanOrEqual(last.time - CHART_WINDOW_SECONDS)
    expect(arm.history.length).toBeGreaterThan(740)
    expect(last.value).toBe(arm.position)
    expect(last.setpoint).toBe(arm.setpoint.position)
    expect(last.current).toBeCloseTo(arm.current / 2)
  })

  it("plots the velocity under velocity control, and starts over when the mode changes", () => {
    const arm = new ArmSim(canvas, { motorType: "NEO", gearing: 50 })
    for (let i = 0; i < 10; i++) arm.update(0.02)
    arm.setControlMode("velocity")
    expect(arm.history).toHaveLength(0)
    arm.setTargetVelocity(1)
    arm.update(0.02)
    expect(arm.history[0].value).toBe(arm.velocity)
    expect(arm.history[0].setpoint).toBe(1)
  })

  it("labels the chart in the slider's units", () => {
    const units = (mechanismType: FormValues["mechanismType"], simType: string) =>
      chartUnits({ mechanismType } as FormValues, simType)
    expect(units("Arm", "position")).toEqual({ name: "Angle", unit: "°", scale: 180 / Math.PI })
    expect(units("Elevator", "position")).toEqual({ name: "Height", unit: "m", scale: 1 })
    expect(units("Flywheel", "velocity")).toEqual({ name: "Velocity", unit: "RPM", scale: 60 / (2 * Math.PI) })
  })
})
