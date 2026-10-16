/** A position and velocity along a profile. */
export interface ProfileState {
  position: number
  velocity: number
}

/**
 * WPILib's TrapezoidProfile: accelerate at the max acceleration, cruise at the max velocity, then
 * slow at the max acceleration to stop at the goal. The generated code steps the same profile, and a
 * Talon's Motion Magic and a SPARK's MAXMotion run the same shape onboard.
 */
export class TrapezoidProfile {
  constructor(
    readonly maxVelocity: number,
    readonly maxAcceleration: number,
  ) {}

  /** Where the profile is t seconds after the current state, on its way to the goal. */
  calculate(t: number, current: ProfileState, goal: ProfileState): ProfileState {
    // Work as if moving forward, and flip the result back at the end.
    const direction = current.position > goal.position ? -1 : 1
    const start = { position: current.position * direction, velocity: current.velocity * direction }
    const end = { position: goal.position * direction, velocity: goal.velocity * direction }
    const maxV = this.maxVelocity
    const maxA = this.maxAcceleration

    if (Math.abs(start.velocity) > maxV) {
      start.velocity = Math.sign(start.velocity) * maxV
    }

    // The profile is a full trapezoid with its corners cut off to start and end at these speeds.
    const cutoffBegin = start.velocity / maxA
    const cutoffDistBegin = (cutoffBegin * cutoffBegin * maxA) / 2
    const cutoffEnd = end.velocity / maxA
    const cutoffDistEnd = (cutoffEnd * cutoffEnd * maxA) / 2
    const fullTrapezoidDist = cutoffDistBegin + (end.position - start.position) + cutoffDistEnd

    let accelerationTime = maxV / maxA
    let fullSpeedDist = fullTrapezoidDist - accelerationTime * accelerationTime * maxA
    // Too short to reach the max velocity: a triangle.
    if (fullSpeedDist < 0) {
      accelerationTime = Math.sqrt(fullTrapezoidDist / maxA)
      fullSpeedDist = 0
    }

    const endAccel = accelerationTime - cutoffBegin
    const endFullSpeed = endAccel + fullSpeedDist / maxV
    const endDecel = endFullSpeed + accelerationTime - cutoffEnd

    const result = { ...start }
    if (t < endAccel) {
      result.velocity += t * maxA
      result.position += (start.velocity + (t * maxA) / 2) * t
    } else if (t < endFullSpeed) {
      result.velocity = maxV
      result.position += (start.velocity + (endAccel * maxA) / 2) * endAccel + maxV * (t - endAccel)
    } else if (t <= endDecel) {
      const timeLeft = endDecel - t
      result.velocity = end.velocity + timeLeft * maxA
      result.position = end.position - (end.velocity + (timeLeft * maxA) / 2) * timeLeft
    } else {
      result.position = end.position
      result.velocity = end.velocity
    }

    return { position: result.position * direction, velocity: result.velocity * direction }
  }
}
