import {
  MOTORS,
  MOTOR_CONTROLLERS,
  MECHANISMS,
  getMotor,
  getMotorController,
  getMechanism,
  isMotorCompatibleWithController,
  getCompatibleMotors,
  getWPILibMotorType,
  getSimMotorType,
} from "@/lib/config/hardware-config"

describe("Hardware Configuration", () => {
  describe("getMotor", () => {
    it("returns a valid motor definition", () => {
      const motor = getMotor("NEO")
      expect(motor.name).toBe("NEO")
      expect(motor.kv).toBeGreaterThan(0)
    })

    it("throws for unknown motor", () => {
      expect(() => getMotor("INVALID_MOTOR")).toThrow(
        "Unknown motor type: INVALID_MOTOR",
      )
    })
  })

  describe("getMotorController", () => {
    it("returns a valid motor controller definition", () => {
      const controller = getMotorController("SparkMAX")
      expect(controller.supportsCurrentLimit).toBe(true)
      expect(controller.importPath).toContain("revrobotics")
    })

    it("throws for unknown controller", () => {
      expect(() => getMotorController("INVALID_CONTROLLER")).toThrow(
        "Unknown motor controller type: INVALID_CONTROLLER",
      )
    })
  })

  describe("getMechanism", () => {
    it("returns a valid mechanism definition", () => {
      const mech = getMechanism("Elevator")
      expect(mech.requiresGravityCompensation).toBe(true)
    })

    it("throws for unknown mechanism", () => {
      expect(() => getMechanism("INVALID_MECH")).toThrow(
        "Unknown mechanism type: INVALID_MECH",
      )
    })
  })

  describe("isMotorCompatibleWithController", () => {
    it("returns true for compatible motor/controller", () => {
      expect(isMotorCompatibleWithController("NEO", "SparkMAX")).toBe(true)
    })

    it("returns false for incompatible motor/controller", () => {
      expect(isMotorCompatibleWithController("Krakenx60", "SparkMAX")).toBe(
        false,
      )
    })

    it("returns true if motor name is invalid (fail-open)", () => {
      expect(
        isMotorCompatibleWithController("INVALID_MOTOR", "SparkMAX"),
      ).toBe(true)
    })
  })

  describe("getCompatibleMotors", () => {
    it("returns motors compatible with a given controller", () => {
      const motors = getCompatibleMotors("SparkMAX")
      const motorNames = motors.map((m) => m.name)

      expect(motorNames).toContain("NEO")
      expect(motorNames).toContain("NEO550")
      expect(motorNames).not.toContain("Krakenx60")
    })

    it("returns empty array for unknown controller", () => {
      const motors = getCompatibleMotors("INVALID_CONTROLLER")
      expect(motors).toHaveLength(0)
    })
  })

  describe("getWPILibMotorType", () => {
    it("returns correct WPILib string for known motors", () => {
      expect(getWPILibMotorType("NEO")).toBe("DCMotor.getNEO(1)")
      expect(getWPILibMotorType("NEO550")).toBe("DCMotor.getNeo550(1)")
      expect(getWPILibMotorType("Vortex")).toBe("DCMotor.getNEOVortex(1)")
    })

    it("returns custom DCMotor definition for Minion", () => {
      const result = getWPILibMotorType("Minion")
      expect(result).toContain("new DCMotor")
      expect(result).toContain("Minion Motor")
    })

    it("falls back to NEO for unknown motor", () => {
      expect(getWPILibMotorType("UNKNOWN")).toBe("DCMotor.getNEO(1)")
    })
  })

  describe("getSimMotorType", () => {
    it("returns correct sim motor type", () => {
      expect(getSimMotorType("NEO")).toBe("NEO")
      expect(getSimMotorType("Krakenx44")).toBe("KrakenX44")
      expect(getSimMotorType("Vortex")).toBe("NEOVortex")
    })

    it("falls back to NEO for unknown motor", () => {
      expect(getSimMotorType("UNKNOWN")).toBe("NEO")
    })
  })

  describe("data integrity", () => {
    it("all motors reference valid controllers", () => {
      for (const motor of Object.values(MOTORS)) {
        for (const controller of motor.compatibleControllers) {
          expect(MOTOR_CONTROLLERS[controller]).toBeDefined()
        }
      }
    })

    it("all motors have positive physical constants", () => {
      for (const motor of Object.values(MOTORS)) {
        expect(motor.kv).toBeGreaterThan(0)
        expect(motor.kt).toBeGreaterThan(0)
        expect(motor.resistance).toBeGreaterThan(0)
        expect(motor.mass).toBeGreaterThan(0)
      }
    })

    it("all mechanisms have templates defined", () => {
      for (const mech of Object.values(MECHANISMS)) {
        expect(mech.templateName).toBeTruthy()
        expect(mech.simTemplateName).toBeTruthy()
        expect(mech.simClassName).toBeTruthy()
      }
    })
  })
})
