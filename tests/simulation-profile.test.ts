import { getMotor } from "@/lib/config/hardware-config"
import { ArmSim, type ArmSimOptions } from "@/lib/simulation/arm-sim"
import { ElevatorSim } from "@/lib/simulation/elevator-sim"
import { FlywheelSim } from "@/lib/simulation/flywheel-sim"
import { TrapezoidProfile } from "@/lib/simulation/trapezoid-profile"
import { createSimulationOptions, gainUnits } from "@/lib/simulation/simulation-config"
import type { FormValues } from "@/lib/types"

// The sims only draw on the canvas, which these tests never do.
const canvas = { width: 600, height: 400, getContext: () => ({}) } as unknown as HTMLCanvasElement

const DT = 0.02
const GEARING = 50
const NEO = getMotor("NEO")
/** The motor's back-EMF, in volts per radian per second of the mechanism. */
const VOLTS_PER_RAD_PER_SEC = GEARING / ((NEO.kv * 2 * Math.PI) / 60)
/** The motor's torque at the mechanism per volt across its resistance. */
const NM_PER_VOLT = (NEO.kt * GEARING) / NEO.resistance

beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => {})
  jest.spyOn(console, "log").mockImplementation(() => {})
})

describe("TrapezoidProfile", () => {
  const profile = new TrapezoidProfile(2, 1)

  it("accelerates, cruises at the max velocity and slows to stop at the goal", () => {
    // 2 s to reach 2 m/s over 2 m, 3 s at 2 m/s over 6 m, and 2 s to stop over 2 m.
    const start = { position: 0, velocity: 0 }
    const goal = { position: 10, velocity: 0 }
    expect(profile.calculate(1, start, goal).position).toBeCloseTo(0.5)
    expect(profile.calculate(1, start, goal).velocity).toBeCloseTo(1)
    expect(profile.calculate(4, start, goal).position).toBeCloseTo(6)
    expect(profile.calculate(4, start, goal).velocity).toBeCloseTo(2)
    expect(profile.calculate(6, start, goal).position).toBeCloseTo(9.5)
    expect(profile.calculate(6, start, goal).velocity).toBeCloseTo(1)
    expect(profile.calculate(8, start, goal)).toEqual(goal)
  })

  it("runs backward the same way", () => {
    const back = profile.calculate(1, { position: 0, velocity: 0 }, { position: -10, velocity: 0 })
    expect(back.position).toBeCloseTo(-0.5)
    expect(back.velocity).toBeCloseTo(-1)
  })

  it("makes a triangle when the move is too short to reach the max velocity", () => {
    // 1 m: 1 s to speed up to 1 m/s, and 1 s to stop.
    const start = { position: 0, velocity: 0 }
    const goal = { position: 1, velocity: 0 }
    expect(profile.calculate(1, start, goal).velocity).toBeCloseTo(1)
    expect(profile.calculate(1, start, goal).position).toBeCloseTo(0.5)
    expect(profile.calculate(1.5, start, goal).velocity).toBeCloseTo(0.5)
  })
})

/** A level pivot with no gravity, and feedforward gains that match its physics exactly. */
function pivot(options: { maxVelocity: number; maxAcceleration: number; kP?: number }) {
  const length = 0.5
  const mass = 4
  const moi = (mass * length * length) / 3
  // The gains a pivot takes are per rotation.
  const rotationsPerRadian = 1 / (2 * Math.PI)
  return new ArmSim(canvas, {
    motorType: "NEO",
    gearing: GEARING,
    length,
    mass,
    minAngle: -Math.PI,
    maxAngle: Math.PI,
    startingAngle: 0,
    simulateGravity: false,
    kP: options.kP ?? 2,
    kV: (VOLTS_PER_RAD_PER_SEC * (1 + (NEO.resistance * NEO.freeCurrent) / 12)) / rotationsPerRadian,
    kA: moi / NM_PER_VOLT / rotationsPerRadian,
    maxVelocity: options.maxVelocity,
    maxAcceleration: options.maxAcceleration,
    ...gainUnits("Pivot"),
  })
}

describe("the web sim's motion profile", () => {
  it("follows the profile the generated code steps, one loop at a time", () => {
    const sim = pivot({ maxVelocity: 3, maxAcceleration: 6 })
    const profile = new TrapezoidProfile(3, 6)
    sim.setTarget(Math.PI / 2)

    let expected = { position: 0, velocity: 0 }
    let peakVelocity = 0
    for (let i = 0; i < 100; i++) {
      sim.update(DT)
      expected = profile.calculate(DT, expected, { position: Math.PI / 2, velocity: 0 })
      expect(sim.setpoint.position).toBeCloseTo(expected.position, 9)
      expect(sim.setpoint.velocity).toBeCloseTo(expected.velocity, 9)
      // With the feedforward matching the physics, the pivot keeps to the setpoint.
      expect(Math.abs(sim.position - sim.setpoint.position)).toBeLessThan(0.02)
      peakVelocity = Math.max(peakVelocity, Math.abs(sim.velocity))
    }
    expect(peakVelocity).toBeLessThan(3 * 1.02)
    expect(peakVelocity).toBeGreaterThan(3 * 0.98)
    expect(Math.abs(sim.position - Math.PI / 2)).toBeLessThan(0.01)
  })

  it("keeps to the max velocity however hard the PID pushes", () => {
    const sim = pivot({ maxVelocity: 1, maxAcceleration: 2, kP: 40 })
    sim.setTarget(Math.PI / 2)
    for (let i = 0; i < 150; i++) {
      sim.update(DT)
      expect(Math.abs(sim.velocity)).toBeLessThan(1.05)
    }
    expect(sim.position).toBeCloseTo(Math.PI / 2, 2)
  })

  it("carries on from the setpoint when the goal changes partway, as the generated code does", () => {
    const sim = pivot({ maxVelocity: 2, maxAcceleration: 4 })
    sim.setTarget(Math.PI / 2)
    for (let i = 0; i < 20; i++) sim.update(DT)
    const midway = { ...sim.setpoint }
    expect(midway.velocity).toBeGreaterThan(0)

    sim.setTarget(-Math.PI / 4)
    sim.update(DT)
    const expected = new TrapezoidProfile(2, 4).calculate(DT, midway, { position: -Math.PI / 4, velocity: 0 })
    expect(sim.setpoint.position).toBeCloseTo(expected.position, 9)
    expect(sim.setpoint.velocity).toBeCloseTo(expected.velocity, 9)
  })

  it("turns the profile off when the max velocity and acceleration are both 0", () => {
    const sim = pivot({ maxVelocity: 0, maxAcceleration: 0, kP: 100 })
    expect(sim.profile).toBeNull()
    sim.setTarget(Math.PI / 2)
    sim.update(DT)
    // The setpoint jumps to the goal, so the PID sees the whole error at once.
    expect(sim.setpoint).toEqual({ position: Math.PI / 2, velocity: 0 })
    expect(sim.voltage).toBe(12)
  })

  it("starts the profile from where the mechanism is", () => {
    const arm = new ArmSim(canvas, { motorType: "NEO", gearing: GEARING, startingAngle: 0.7, maxVelocity: 1, maxAcceleration: 1 })
    expect(arm.setpoint).toEqual({ position: 0.7, velocity: 0 })
    const elevator = new ElevatorSim(canvas, { motorType: "NEO", gearing: GEARING, startingHeight: 0.4, maxVelocity: 1, maxAcceleration: 1 })
    expect(elevator.setpoint).toEqual({ position: 0.4, velocity: 0 })
  })
})

describe("the web sim's physics and gain units", () => {
  it("holds an arm straight out with kG, where gravity pulls hardest", () => {
    const length = 0.6
    const mass = 3
    const kG = (mass * 9.81 * (length / 2)) / NM_PER_VOLT
    const arm = new ArmSim(canvas, { motorType: "NEO", gearing: GEARING, length, mass, minAngle: -2, maxAngle: 2, kP: 0, kG })
    arm.setTarget(0)
    for (let i = 0; i < 100; i++) arm.update(DT)
    expect(arm.position).toBeCloseTo(0, 6)
    expect(arm.voltage).toBeCloseTo(kG, 6)
  })

  it("lets gravity pull on an arm but not on a pivot or a turret", () => {
    const fall = (simulateGravity: boolean) => {
      const arm = new ArmSim(canvas, { motorType: "NEO", gearing: GEARING, kP: 0, kG: 0, minAngle: -2, maxAngle: 2, simulateGravity })
      for (let i = 0; i < 10; i++) arm.update(DT)
      return arm.position
    }
    expect(fall(true)).toBeLessThan(-0.01)
    expect(fall(false)).toBe(0)
  })

  it("reaches the speed kV asks for, from the motor's back-EMF and friction", () => {
    // A flywheel's kV is per rotation per second: the motor's back-EMF, plus the voltage its free
    // current takes, which rises with speed to the free current at 12 V.
    const kV = VOLTS_PER_RAD_PER_SEC * (1 + (NEO.resistance * NEO.freeCurrent) / 12) * 2 * Math.PI
    const flywheel = new FlywheelSim(canvas, { motorType: "NEO", gearing: GEARING, kP: 0, kV, ...gainUnits("Flywheel") })
    flywheel.setTargetVelocity(5)
    for (let i = 0; i < 500; i++) flywheel.update(DT)
    expect(flywheel.velocity).toBeCloseTo(5, 3)
  })

  it("takes PID gains per rotation, or per meter for an elevator", () => {
    const arm = new ArmSim(canvas, { kP: 3, ...gainUnits("Arm") })
    expect(arm.calculatePID(2 * Math.PI)).toBeCloseTo(3)
    const elevator = new ElevatorSim(canvas, { kP: 3, ...gainUnits("Elevator") })
    expect(elevator.calculatePID(1)).toBeCloseTo(3)
  })

  it("takes kV per rotation for an arm, a pivot and a flywheel, and per meter for an elevator", () => {
    // At a steady speed, only kV acts.
    const arm = new ArmSim(canvas, { kV: 2, kA: 0.1, ...gainUnits("Arm") })
    expect(arm.calculateFeedforward(Math.PI / 2, 2 * Math.PI, 2 * Math.PI)).toBeCloseTo(2)
    const pivotSim = new ArmSim(canvas, { kV: 2, kA: 0.1, ...gainUnits("Pivot") })
    expect(pivotSim.calculateFeedforward(Math.PI / 2, 2 * Math.PI, 2 * Math.PI)).toBeCloseTo(2)
    const elevator = new ElevatorSim(canvas, { kV: 2, kA: 0.1, ...gainUnits("Elevator") })
    expect(elevator.calculateFeedforward(0, 1, 1)).toBeCloseTo(2 + elevator.kG)
  })

  it("keeps a kP of 0", () => {
    expect(new ArmSim(canvas, { kP: 0 }).kP).toBe(0)
  })
})

describe("the web sim's settings from the form", () => {
  const formValues = (overrides: Partial<FormValues>): FormValues =>
    ({
      subsystemName: "Test",
      mechanismType: "Pivot",
      motorControllerType: "SparkMAX",
      motorType: "NEO",
      canId: 1,
      pidValues: { kP: 1, kI: 0, kD: 0 },
      feedforward: { kS: 0, kV: 0, kA: 0, kG: 0.5 },
      useMotionProfile: true,
      maxVelocity: 2,
      maxAcceleration: 3,
      gearRatio: 25,
      brakeMode: true,
      armParams: { length: 0.4, mass: 2, massUnit: "kg", hardLimitMin: -30, hardLimitMax: 120, startingPosition: 15 },
      telemetry: { ntKey: "Test", position: true, velocity: true, voltage: false, temperature: false, current: false },
      ...overrides,
    }) as FormValues

  it("gives the sim the profile, and none for a flywheel", () => {
    const { options } = createSimulationOptions(formValues({}), canvas)
    expect(options.maxVelocity).toBe(2)
    expect(options.maxAcceleration).toBe(3)
    const flywheel = createSimulationOptions(formValues({ mechanismType: "Flywheel" }), canvas)
    expect(flywheel.options.maxVelocity).toBe(0)
    expect(flywheel.options.maxAcceleration).toBe(0)
    const off = createSimulationOptions(formValues({ useMotionProfile: false }), canvas)
    expect(off.options.maxVelocity).toBe(0)
    expect(off.options.maxAcceleration).toBe(0)
  })

  it("gives a pivot or a turret its own size and limits, with no gravity", () => {
    for (const mechanismType of ["Pivot", "Turret"] as const) {
      const { options } = createSimulationOptions(formValues({ mechanismType }), canvas)
      const sim = new ArmSim(canvas, options)
      expect(sim.length).toBe(0.4)
      expect(sim.mass).toBe(2)
      expect(sim.minAngle).toBeCloseTo((-30 * Math.PI) / 180)
      expect(sim.maxAngle).toBeCloseTo((120 * Math.PI) / 180)
      expect(sim.position).toBeCloseTo((15 * Math.PI) / 180)
      expect(sim.kG).toBe(0)
      expect(sim.simulateGravity).toBe(false)
    }
  })
})

describe("the web sim's current limits, losses and battery", () => {
  /** An arm far too heavy for its motor: it stalls against its lower hard limit. */
  const overloaded = (options: Partial<ArmSimOptions> = {}) => {
    const arm = new ArmSim(canvas, {
      motorType: "NEO", gearing: 5, length: 1, mass: 20, minAngle: -Math.PI / 2, maxAngle: Math.PI / 2,
      kP: 100, kG: 0, ...options,
    })
    arm.setTarget(Math.PI / 4)
    return arm
  }

  it("holds each motor to its stator limit", () => {
    const arm = overloaded({ statorCurrentLimit: 40, motorCount: 2 })
    for (let i = 0; i < 100; i++) {
      arm.update(DT)
      expect(Math.abs(arm.current)).toBeLessThanOrEqual(2 * 40 * 1.01)
    }
    expect(Math.abs(arm.current)).toBeCloseTo(80, 0)
  })

  it("holds each motor to its supply limit", () => {
    const arm = overloaded({ supplyCurrentLimit: 20, batteryResistance: 0.015 })
    for (let i = 0; i < 100; i++) {
      arm.update(DT)
      expect(arm.supplyCurrent).toBeLessThanOrEqual(20 * 1.01)
    }
  })

  it("lifts less with a lower stator limit", () => {
    // 8 kg on a 0.5 m arm at 50:1: a NEO lifts it, but not on 5 A.
    const lift = (statorCurrentLimit?: number) => {
      const arm = new ArmSim(canvas, {
        motorType: "NEO", gearing: 50, length: 0.5, mass: 8, minAngle: -Math.PI / 2, maxAngle: Math.PI / 2,
        kP: 100, kG: 0, statorCurrentLimit,
      })
      arm.setTarget(Math.PI / 4)
      for (let i = 0; i < 150; i++) arm.update(DT)
      return arm.position
    }
    expect(lift()).toBeCloseTo(Math.PI / 4, 1)
    expect(lift(5)).toBeLessThan(0)
  })

  it("sags the battery by the supply current", () => {
    const arm = overloaded({ batteryResistance: 0.015 })
    for (let i = 0; i < 20; i++) arm.update(DT)
    expect(arm.batteryVoltage).toBeCloseTo(12 - 0.015 * arm.supplyCurrent, 6)
    expect(arm.batteryVoltage).toBeLessThan(10)
  })

  it("draws the free current at free speed", () => {
    const flywheel = new FlywheelSim(canvas, { motorType: "NEO", gearing: 1, kP: 0, kV: 100, ...gainUnits("Flywheel") })
    flywheel.setTargetVelocity(1000)
    for (let i = 0; i < 500; i++) flywheel.update(DT)
    expect(flywheel.voltage).toBe(12)
    expect(flywheel.current).toBeCloseTo(NEO.freeCurrent, 1)
  })

  it("warns after 2 s stalled at a high current, and not while moving or holding", () => {
    const arm = overloaded({ statorCurrentLimit: 40 })
    for (let i = 0; i < 90; i++) arm.update(DT)
    expect(arm.stallWarning()).toBeNull()
    for (let i = 0; i < 20; i++) arm.update(DT)
    expect(arm.stallWarning()).toMatch(/^Stalled at 40 A for 2\.\d s/)

    // A pivot with no load moving freely, then holding, never warns.
    const free = pivot({ maxVelocity: 3, maxAcceleration: 6 })
    free.setTarget(Math.PI / 2)
    for (let i = 0; i < 300; i++) {
      free.update(DT)
      expect(free.stallWarning()).toBeNull()
    }
  })
})
