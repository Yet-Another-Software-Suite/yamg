import * as SparkMAX from "./spark-max"
import * as SparkFlex from "./spark-flex"
import * as TalonFX from "./talon-fx"
import * as TalonFXS from "./talon-fxs"
import * as ThriftyNova from "./thrifty-nova"

export const getMotorControllerModule = (type: string) => {
  switch (type) {
    case "SparkMAX":
      return SparkMAX
    case "SparkFlex":
      return SparkFlex
    case "TalonFX":
      return TalonFX
    case "TalonFXS":
      return TalonFXS
    case "ThriftyNova":
      return ThriftyNova
    default:
      throw new Error(`Unknown motor controller type: ${type}`)
  }
}

export const getMotorType = (type: string) => {
  switch (type) {
    case "NEO":
      return "DCMotor.getNEO(1)"
    case "NEO550":
      return "DCMotor.getNEO550(1)"
    case "Minion":
      return "DCMotor.getMinion(1)"
    case "Krakenx40":
      return "DCMotor.getKrakenX40(1)"
    case "Krakenx60":
      return "DCMotor.getKrakenX60(1)"
    default:
      return "DCMotor.getNEO(1)"
  }
}
