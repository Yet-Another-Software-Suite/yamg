import * as SparkMAX from "@/lib/motor-controllers/spark-max";
import * as SparkFlex from "@/lib/motor-controllers/spark-flex";
import * as TalonFX from "@/lib/motor-controllers/talon-fx";
import * as TalonFXS from "@/lib/motor-controllers/talon-fxs";
import * as ThriftyNova from "@/lib/motor-controllers/thrifty-nova";
import {
  getMotorControllerModule,
  getMotorType,
  isWPILibControlled,
  supportsSupplyCurrentLimit,
} from "@/lib/motor-controllers";

describe("Motor controller wrapper", () => {
  const modules = {
    SparkMAX,
    SparkFlex,
    TalonFX,
    TalonFXS,
    ThriftyNova,
  } as const;

  describe("getMotorControllerModule", () => {
    it("returns the correct module for each controller", () => {
      for (const key of Object.keys(modules)) {
        const module = getMotorControllerModule(key as keyof typeof modules);
        expect(module).toBe(modules[key as keyof typeof modules]);
      }
    });
  });

  describe("getMotorType", () => {
    it("calls getWPILibMotorType correctly", () => {
      // Spy on getMotorController to check internal call if needed
      expect(typeof getMotorType("NEO")).toBe("string");
      expect(getMotorType("NEO")).toContain("DCMotor");
    });

    it("returns default string for unknown motor", () => {
      const result = getMotorType("UNKNOWN");
      expect(result).toBe("DCMotor.getNEO(1)"); // matches hardware-config fallback
    });
  });

  describe("isWPILibControlled", () => {
    it("returns true only for ThriftyNova", () => {
      expect(isWPILibControlled("ThriftyNova")).toBe(true);
      expect(isWPILibControlled("SparkMAX")).toBe(false);
      expect(isWPILibControlled("TalonFX")).toBe(false);
    });
  });

  describe("supportsSupplyCurrentLimit", () => {
    it("returns the correct flag from hardware config", () => {
      // ThriftyNova does not support supply limit
      expect(supportsSupplyCurrentLimit("ThriftyNova")).toBe(false);

      // TalonFX supports supply limit
      expect(supportsSupplyCurrentLimit("TalonFX")).toBe(true);

      // SparkMAX does not support supply limit
      expect(supportsSupplyCurrentLimit("SparkMAX")).toBe(false);
    });

    it("throws for unknown controller", () => {
      expect(() => supportsSupplyCurrentLimit("INVALID")).toThrow(
        "Unknown motor controller type: INVALID"
      );
    });
  });
});
