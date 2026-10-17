/** How much history the chart shows, in seconds. */
export const CHART_WINDOW_SECONDS = 15

/** How many current bars the chart shows across its window. */
const CURRENT_BARS = 60

/** One loop of the sim: what the mechanism did, what it was asked to do, and the current it took. */
export interface ChartSample {
  time: number
  /** The position, or the velocity under velocity control, in the sim's units. */
  value: number
  /** The setpoint the closed loop followed, in the same units. */
  setpoint: number
  /** Each motor's stator current, in amps. */
  current: number
}

/** How the chart labels the value and the setpoint. */
export interface ChartUnits {
  name: string
  unit: string
  /** Multiplies the sim's units into the shown ones, such as degrees from radians. */
  scale: number
}

/** The chart's colors, chosen to read on the sim's dark background. */
const COLORS = {
  background: "#1e293b",
  grid: "rgba(148, 163, 184, 0.18)",
  axis: "#cbd5e1",
  value: "#38bdf8",
  setpoint: "#fbbf24",
  current: "rgba(248, 113, 113, 0.38)",
  currentEdge: "rgba(248, 113, 113, 0.75)",
  currentLimit: "#f87171",
}

/** Keep only the samples within the chart's window of the latest one. */
export function trimSamples(samples: ChartSample[]): void {
  const latest = samples[samples.length - 1]?.time ?? 0
  const start = latest - CHART_WINDOW_SECONDS
  let drop = 0
  while (drop < samples.length && samples[drop].time < start) drop++
  if (drop > 0) samples.splice(0, drop)
}

/**
 * The stator current in bars across the window ending at `end`: each bar is the mean of the
 * magnitude of the current in its slice of time, or null with no samples in it.
 */
export function currentBars(samples: ChartSample[], end: number, bars = CURRENT_BARS): (number | null)[] {
  const width = CHART_WINDOW_SECONDS / bars
  const start = end - CHART_WINDOW_SECONDS
  const sums = new Array<number>(bars).fill(0)
  const counts = new Array<number>(bars).fill(0)
  for (const sample of samples) {
    const bar = Math.floor((sample.time - start) / width)
    if (bar < 0 || bar >= bars) continue
    sums[bar] += Math.abs(sample.current)
    counts[bar]++
  }
  return sums.map((sum, i) => (counts[i] === 0 ? null : sum / counts[i]))
}

/** A round step for about `count` gridlines across `span`. */
function niceStep(span: number, count: number): number {
  const raw = span / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude
}

function formatTick(value: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  return value.toFixed(decimals)
}

/**
 * Draw the last 15 seconds: the position (or velocity) and its setpoint as lines on the left axis,
 * over the stator current as bars on the right axis, with the current limit when there is one.
 */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: ChartSample[],
  units: ChartUnits,
  currentLimit?: number,
): void {
  ctx.save()
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, width, height)

  const left = 64
  const right = width - 56
  const top = 40
  const bottom = height - 40
  const end = Math.max(samples[samples.length - 1]?.time ?? 0, CHART_WINDOW_SECONDS)
  const start = end - CHART_WINDOW_SECONDS
  const x = (time: number) => left + ((time - start) / CHART_WINDOW_SECONDS) * (right - left)

  // The value axis fits the value and the setpoint, with a little room.
  let low = Infinity
  let high = -Infinity
  for (const s of samples) {
    low = Math.min(low, s.value * units.scale, s.setpoint * units.scale)
    high = Math.max(high, s.value * units.scale, s.setpoint * units.scale)
  }
  if (!Number.isFinite(low)) {
    low = 0
    high = 1
  }
  if (high - low < 1e-6) {
    low -= 1
    high += 1
  }
  const pad = (high - low) * 0.1
  low -= pad
  high += pad
  const y = (value: number) => bottom - ((value - low) / (high - low)) * (bottom - top)

  // The current axis runs from 0 to above the highest current, and the limit.
  let maxCurrent = currentLimit ?? 0
  for (const s of samples) maxCurrent = Math.max(maxCurrent, Math.abs(s.current))
  maxCurrent = Math.max(maxCurrent * 1.15, 1)
  const yCurrent = (current: number) => bottom - (current / maxCurrent) * (bottom - top)

  ctx.font = "12px sans-serif"
  ctx.lineWidth = 1

  // Gridlines and the value axis, on the left.
  const step = niceStep(high - low, 5)
  ctx.textAlign = "right"
  ctx.textBaseline = "middle"
  for (let tick = Math.ceil(low / step) * step; tick <= high; tick += step) {
    ctx.strokeStyle = COLORS.grid
    ctx.beginPath()
    ctx.moveTo(left, y(tick))
    ctx.lineTo(right, y(tick))
    ctx.stroke()
    ctx.fillStyle = COLORS.axis
    ctx.fillText(formatTick(tick, step), left - 8, y(tick))
  }

  // The current axis, on the right.
  const currentStep = niceStep(maxCurrent, 5)
  ctx.textAlign = "left"
  for (let tick = 0; tick <= maxCurrent; tick += currentStep) {
    ctx.fillStyle = COLORS.currentEdge
    ctx.fillText(formatTick(tick, currentStep), right + 8, yCurrent(tick))
  }

  // The time axis, in seconds before now.
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillStyle = COLORS.axis
  for (let ago = 0; ago <= CHART_WINDOW_SECONDS; ago += 5) {
    const tx = x(end - ago)
    ctx.strokeStyle = COLORS.grid
    ctx.beginPath()
    ctx.moveTo(tx, top)
    ctx.lineTo(tx, bottom)
    ctx.stroke()
    ctx.fillText(ago === 0 ? "now" : `-${ago} s`, tx, bottom + 8)
  }

  // The current bars, behind the lines.
  const bars = currentBars(samples, end)
  const barWidth = (right - left) / bars.length
  bars.forEach((current, i) => {
    if (current === null) return
    const bx = left + i * barWidth
    ctx.fillStyle = COLORS.current
    ctx.fillRect(bx + 1, yCurrent(current), barWidth - 2, bottom - yCurrent(current))
    ctx.fillStyle = COLORS.currentEdge
    ctx.fillRect(bx + 1, yCurrent(current), barWidth - 2, 1.5)
  })
  if (currentLimit !== undefined) {
    ctx.strokeStyle = COLORS.currentLimit
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(left, yCurrent(currentLimit))
    ctx.lineTo(right, yCurrent(currentLimit))
    ctx.stroke()
    ctx.setLineDash([])
  }

  // The setpoint, dashed, then the value over it.
  const line = (pick: (s: ChartSample) => number, color: string, dash: number[], lineWidth: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dash)
    ctx.beginPath()
    samples.forEach((s, i) => {
      const px = x(s.time)
      const py = y(pick(s) * units.scale)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(left, top, right - left, bottom - top)
  ctx.clip()
  line((s) => s.setpoint, COLORS.setpoint, [6, 4], 2)
  line((s) => s.value, COLORS.value, [], 2.5)
  ctx.restore()

  // The axis titles and the legend, across the top.
  ctx.textBaseline = "middle"
  ctx.font = "bold 12px sans-serif"
  ctx.textAlign = "left"
  ctx.fillStyle = COLORS.axis
  ctx.fillText(`${units.name} (${units.unit})`, 8, 16)
  ctx.textAlign = "right"
  ctx.fillStyle = COLORS.currentEdge
  ctx.fillText("Stator current (A)", width - 8, 16)

  const legend: [string, string, "line" | "dash" | "bar"][] = [
    [units.name, COLORS.value, "line"],
    ["Setpoint", COLORS.setpoint, "dash"],
    ["Current", COLORS.current, "bar"],
  ]
  if (currentLimit !== undefined) legend.push(["Limit", COLORS.currentLimit, "dash"])
  ctx.font = "12px sans-serif"
  ctx.textAlign = "left"
  let lx = width / 2 - (currentLimit !== undefined ? 160 : 130)
  for (const [label, color, kind] of legend) {
    if (kind === "bar") {
      ctx.fillStyle = color
      ctx.fillRect(lx, 11, 18, 10)
    } else {
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.setLineDash(kind === "dash" ? [5, 3] : [])
      ctx.beginPath()
      ctx.moveTo(lx, 16)
      ctx.lineTo(lx + 18, 16)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.fillStyle = COLORS.axis
    ctx.fillText(label, lx + 24, 16)
    lx += 24 + ctx.measureText(label).width + 18
  }
  ctx.restore()
}
