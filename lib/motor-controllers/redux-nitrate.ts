import type { MotorConfig } from "@/lib/types";

export const generateImports = (config: MotorConfig): string[] => {
  const imports = [
    "com.reduxrobotics.nitrate.hardware.ReduxNitrate",
    "com.reduxrobotics.nitrate.hardware.ReduxNitrate.IdleMode",
  ];

  if (config.enableCurrentLimit) {
    imports.push(
      "com.reduxrobotics.nitrate.hardware.ReduxNitrate.CurrentLimitConfig",
    );
  }

  return imports;
};

export const generateDeclaration = (config: MotorConfig): string => {
  return `private final ReduxNitrate m_${config.name}Motor;`;
};

export const generateInitialization = (config: MotorConfig): string => {
  let code = `    m_${config.name}Motor = new ReduxNitrate(${config.canId});\n`;

  // Configure motor settings
  code += `    m_${config.name}Motor.restoreFactoryDefaults();\n`;

  // Set idle mode
  if (config.brakeMode) {
    code += `    m_${config.name}Motor.setIdleMode(IdleMode.kBrake);\n`;
  } else {
    code += `    m_${config.name}Motor.setIdleMode(IdleMode.kCoast);\n`;
  }

  // Set current limit
  if (config.enableCurrentLimit && config.currentLimit) {
    code += `    m_${config.name}Motor.setSmartCurrentLimit(${config.currentLimit});\n`;
  }

  // Set supply current limit if supported and enabled
  if (config.enableSupplyCurrentLimit && config.supplyCurrentLimit) {
    code += `    m_${config.name}Motor.setSupplyCurrentLimit(${config.supplyCurrentLimit});\n`;
  }

  // Set ramp rate
  if (config.rampRate && config.rampRate > 0) {
    code += `    m_${config.name}Motor.setOpenLoopRampRate(${config.rampRate});\n`;
    code += `    m_${config.name}Motor.setClosedLoopRampRate(${config.rampRate});\n`;
  }

  // Set soft limits
  if (config.enableSoftLimits) {
    if (config.forwardSoftLimit !== undefined) {
      code += `    m_${config.name}Motor.enableSoftLimit(ReduxNitrate.SoftLimitDirection.kForward, true);\n`;
      code += `    m_${config.name}Motor.setSoftLimit(ReduxNitrate.SoftLimitDirection.kForward, ${config.forwardSoftLimit});\n`;
    }
    if (config.reverseSoftLimit !== undefined) {
      code += `    m_${config.name}Motor.enableSoftLimit(ReduxNitrate.SoftLimitDirection.kReverse, true);\n`;
      code += `    m_${config.name}Motor.setSoftLimit(ReduxNitrate.SoftLimitDirection.kReverse, ${config.reverseSoftLimit});\n`;
    }
  }

  // Invert motor if needed
  if (config.inverted) {
    code += `    m_${config.name}Motor.setInverted(true);\n`;
  }

  code += `    m_${config.name}Motor.burnFlash();\n`;

  return code;
};

export const generateSetVoltage = (config: MotorConfig): string => {
  return `m_${config.name}Motor.setVoltage(voltage)`;
};

export const generateGetPosition = (config: MotorConfig): string => {
  return `m_${config.name}Motor.getPosition().getValueAsDouble()`;
};

export const generateGetVelocity = (config: MotorConfig): string => {
  return `m_${config.name}Motor.getVelocity().getValueAsDouble()`;
};

export const generateResetEncoder = (config: MotorConfig): string => {
  return `m_${config.name}Motor.setPosition(0)`;
};

export const generatePIDController = (config: MotorConfig): string => {
  return `m_${config.name}Motor.getPIDController()`;
};

export const generateSetReference = (
  config: MotorConfig,
  reference: string,
  controlType: string,
): string => {
  return `m_${config.name}Motor.getPIDController().setReference(${reference}, ${controlType})`;
};
