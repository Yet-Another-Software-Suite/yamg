import {
  createSimulationOptions,
  getSliderRangeConfig,
  convertTargetValue,
} from "@/lib/simulation/simulation-config"
import type { FormValues } from "@/lib/types"

function baseFormValues(overrides: Partial<FormValues> = {}): FormValues {
  return {
    subsystemName: "FlywheelSubsystem",
    mechanismType: "Flywheel",
    motorControllerType: "SparkMAX",
    motorType: "NEO",
    canId: 1,
    pidValues: { kP: 1, kI: 0, kD: 0 },
    gearRatio: 1,
    brakeMode: true,
    telemetry: {
      ntKey: "Flywheel",
      position: false,
      velocity: true,
      voltage: true,
      temperature: false,
      current: false,
    },
    ...overrides,
  } as FormValues
}

describe("simulation-config", () => {
  describe("createSimulationOptions", () => {
    it("creates FlywheelSim options with the configured moment of inertia", () => {
      const formValues = baseFormValues({
        flywheelParams: { momentOfInertia: 0.01 },
      })

      const { simType, options } = createSimulationOptions(formValues, undefined as unknown as HTMLCanvasElement)

      expect(simType).toBe("FlywheelSim")
      expect(options.kG).toBe(0)
      expect((options as any).momentOfInertia).toBe(0.01)
    })

    it("falls back to a default moment of inertia when not provided", () => {
      const formValues = baseFormValues({ flywheelParams: undefined })

      const { options } = createSimulationOptions(formValues, undefined as unknown as HTMLCanvasElement)

      expect((options as any).momentOfInertia).toBeGreaterThan(0)
    })
  })

  describe("getSliderRangeConfig", () => {
    it("returns an RPM-based velocity range for Flywheel", () => {
      const formValues = baseFormValues()
      const range = getSliderRangeConfig(formValues, "velocity")

      expect(range.unit).toBe("RPM")
      expect(range.max).toBeGreaterThan(0)
    })
  })

  describe("convertTargetValue", () => {
    it("converts RPM to radians per second for Flywheel velocity control", () => {
      const formValues = baseFormValues()
      const radPerSec = convertTargetValue(6000, formValues, "velocity")

      expect(radPerSec).toBeCloseTo((6000 * 2 * Math.PI) / 60)
    })
  })
})
