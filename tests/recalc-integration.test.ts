import {
  buildReCalcArmUrl,
  buildReCalcElevatorUrl,
  formValuesToReCalcArmParams,
  formValuesToReCalcElevatorParams,
  getReCalcUrl,
  isReCalcSupported,
  ReCalcArmParams,
  ReCalcElevatorParams,
} from "@/lib/recalc-integration"

// Helper to parse encoded ReCalc query params
function parseQueryParams(url: string) {
  const query = url.split("?")[1] || ""
  const params: Record<string, any> = {}
  query.split("&").forEach((part) => {
    const [key, value] = part.split("=")
    if (value) {
      try {
        params[key] = JSON.parse(decodeURIComponent(value))
      } catch {
        params[key] = decodeURIComponent(value)
      }
    }
  })
  return params
}

describe("ReCalc Utility Functions", () => {
  describe("isReCalcSupported", () => {
    it("returns true for Arm and Elevator", () => {
      expect(isReCalcSupported("Arm")).toBe(true)
      expect(isReCalcSupported("Elevator")).toBe(true)
    })

    it("returns false for other mechanism types", () => {
      expect(isReCalcSupported("Drivetrain")).toBe(false)
      expect(isReCalcSupported("Intake")).toBe(false)
    })
  })

  describe("buildReCalcArmUrl", () => {
    it("builds a valid URL with kg units converted to lbs", () => {
      const params: ReCalcArmParams = {
        armMass: 2,
        armMassUnit: "kg",
        comLength: 0.5,
        armLength: 1,
        currentLimit: 40,
        motorType: "NEO",
        motorCount: 2,
        gearRatio: 5,
        startAngle: 10,
        endAngle: 80,
      }

      const url = buildReCalcArmUrl(params)
      expect(url).toContain("https://www.reca.lc/arm?")

      const parsed = parseQueryParams(url)
      expect(parsed.armMass.s).toBeCloseTo(4.40924) // 2kg -> lbs
      expect(parsed.comLength.s).toBeCloseTo(19.68505) // meters -> inches
      expect(parsed.motor.name).toBe("NEO")
      expect(parsed.motor.quantity).toBe(2)
    })

    it("falls back to NEO for unknown motor type", () => {
      const params: ReCalcArmParams = {
        armMass: 1,
        armMassUnit: "lbs",
        comLength: 0.3,
        armLength: 0.6,
        currentLimit: 30,
        motorType: "INVALID",
        motorCount: 1,
        gearRatio: 3,
        startAngle: 0,
        endAngle: 90,
      }

      const url = buildReCalcArmUrl(params)
      const parsed = parseQueryParams(url)
      expect(parsed.motor.name).toBe("NEO")
    })
  })

  describe("buildReCalcElevatorUrl", () => {
    it("builds a valid URL with meters converted to inches and kg converted to lbs", () => {
      const params: ReCalcElevatorParams = {
        load: 5,
        loadUnit: "kg",
        travelDistance: 1,
        spoolDiameter: 0.05,
        currentLimit: 40,
        motorType: "Krakenx44",
        motorCount: 1,
        gearRatio: 4,
      }

      const url = buildReCalcElevatorUrl(params)
      expect(url).toContain("https://www.reca.lc/linear?")

      const parsed = parseQueryParams(url)
      expect(parsed.load.s).toBeCloseTo(11.0231) // 5kg -> lbs
      expect(parsed.motor.name).toBe("Kraken X44 (FOC)*")
      expect(parsed.travelDistance.s).toBeCloseTo(39.3701) // 1m -> inches
      expect(parsed.spoolDiameter.s).toBeCloseTo(1.968505) // radius -> diameter inches
    })

    it("falls back to NEO for unknown motor type", () => {
      const params: ReCalcElevatorParams = {
        load: 1,
        loadUnit: "lbs",
        travelDistance: 0.5,
        spoolDiameter: 0.025,
        currentLimit: 20,
        motorType: "INVALID",
        motorCount: 1,
        gearRatio: 2,
      }

      const url = buildReCalcElevatorUrl(params)
      const parsed = parseQueryParams(url)
      expect(parsed.motor.name).toBe("NEO")
    })
  })

  describe("formValuesToReCalcArmParams", () => {
    it("returns null for non-arm mechanisms", () => {
      expect(formValuesToReCalcArmParams({ mechanismType: "Elevator" })).toBeNull()
    })

    it("maps form values to ReCalcArmParams", () => {
      const formValues = {
        mechanismType: "Arm",
        armParams: { mass: 3, massUnit: "kg", length: 2, startingPosition: 10, hardLimitMax: 80 },
        currentLimits: { stator: 50 },
        motorType: "NEO",
        gearRatio: 5,
      }

      const params = formValuesToReCalcArmParams(formValues, 2)!
      expect(params.armMass).toBe(3)
      expect(params.armMassUnit).toBe("kg")
      expect(params.motorCount).toBe(2)
      expect(params.startAngle).toBe(10)
      expect(params.endAngle).toBe(80)
    })
  })

  describe("formValuesToReCalcElevatorParams", () => {
    it("returns null for non-elevator mechanisms", () => {
      expect(formValuesToReCalcElevatorParams({ mechanismType: "Arm" })).toBeNull()
    })

    it("maps form values to ReCalcElevatorParams", () => {
      const formValues = {
        mechanismType: "Elevator",
        elevatorParams: { mass: 5, massUnit: "kg", hardLimitMin: 0, hardLimitMax: 1, drumRadius: 0.025 },
        currentLimits: { stator: 40 },
        motorType: "Krakenx44",
        gearRatio: 4,
      }

      const params = formValuesToReCalcElevatorParams(formValues)!
      expect(params.load).toBe(5)
      expect(params.loadUnit).toBe("kg")
      expect(params.motorType).toBe("Krakenx44")
      expect(params.gearRatio).toBe(4)
      expect(params.motorCount).toBe(1)
      expect(params.spoolDiameter).toBeCloseTo(0.05)
      expect(params.travelDistance).toBeCloseTo(1)
    })
  })

  describe("getReCalcUrl", () => {
    it("returns arm URL for Arm mechanism", () => {
      const formValues = {
        mechanismType: "Arm",
        armParams: { mass: 2, massUnit: "kg", length: 1, startingPosition: 10, hardLimitMax: 80 },
        currentLimits: { stator: 40 },
        motorType: "NEO",
        gearRatio: 5,
      }

      const url = getReCalcUrl(formValues, 2)!
      expect(url).toContain("https://www.reca.lc/arm?")
    })

    it("returns elevator URL for Elevator mechanism", () => {
      const formValues = {
        mechanismType: "Elevator",
        elevatorParams: { mass: 5, massUnit: "kg", hardLimitMin: 0, hardLimitMax: 1, drumRadius: 0.025 },
        currentLimits: { stator: 40 },
        motorType: "Krakenx44",
        gearRatio: 4,
      }

      const url = getReCalcUrl(formValues)!
      expect(url).toContain("https://www.reca.lc/linear?")
    })

    it("returns null for unsupported mechanisms", () => {
      const url = getReCalcUrl({ mechanismType: "Drivetrain" })
      expect(url).toBeNull()
    })
  })
})
