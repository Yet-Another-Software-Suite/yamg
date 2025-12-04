import * as SparkMAX from "./spark-max";
import * as SparkFlex from "./spark-flex";
import * as TalonFX from "./talon-fx";
import * as TalonFXS from "./talon-fxs";
import * as ThriftyNova from "./thrifty-nova";
import {
  getMotorController,
  getWPILibMotorType,
} from "@/lib/config/hardware-config";

const motorModules = {
  SparkMAX,
  SparkFlex,
  TalonFX,
  TalonFXS,
  ThriftyNova,
} as const;

export type MotorType = keyof typeof motorModules;

export function getMotorControllerModule<T extends MotorType>(
  type: T,
): (typeof motorModules)[T] {
  return motorModules[type];
}

export const getMotorType = (type: string) => {
  return getWPILibMotorType(type);
};

// Check if a motor controller is a REV controller (SparkMAX or SparkFlex)
export const isWPILibControlled = (type: string) => {
  return type === "ThriftyNova";
};

// Check if a motor controller supports supply current limits
export const supportsSupplyCurrentLimit = (type: string) => {
  const controller = getMotorController(type);
  return controller.supportsSupplyCurrentLimit;
};
