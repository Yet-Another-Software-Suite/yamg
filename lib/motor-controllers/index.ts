import * as SparkMAX from "./spark-max";
import * as SparkFlex from "./spark-flex";
import * as TalonFX from "./talon-fx";
import * as TalonFXS from "./talon-fxs";
import * as ThriftyNova from "./thrifty-nova";
import * as ReduxNitrate from "./redux-nitrate";
import {
  getMotorController,
  getWPILibMotorType,
} from "@/lib/config/hardware-config";

export const getMotorControllerModule = (type: string) => {
  switch (type) {
    case "SparkMAX":
      return SparkMAX;
    case "SparkFlex":
      return SparkFlex;
    case "TalonFX":
      return TalonFX;
    case "TalonFXS":
      return TalonFXS;
    case "ThriftyNova":
      return ThriftyNova;
    case "ReduxNitrate":
      return ReduxNitrate;
    default:
      throw new Error(`Unknown motor controller type: ${type}`);
  }
};

export const getMotorType = (type: string) => {
  return getWPILibMotorType(type);
};

// Check if a motor controller is a REV controller (SparkMAX or SparkFlex)
export const isRevController = (type: string) => {
  return type === "SparkMAX" || type === "SparkFlex";
};

// Check if a motor controller supports supply current limits
export const supportsSupplyCurrentLimit = (type: string) => {
  const controller = getMotorController(type);
  return controller.supportsSupplyCurrentLimit;
};
