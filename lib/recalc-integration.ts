// Motor name mapping from our system to ReCalc's motor names
const RECALC_MOTOR_MAPPING: Record<string, string> = {
  NEO: "NEO",
  NEO550: "NEO 550",
  Krakenx44: "Kraken X44 (FOC)*",
  Krakenx60: "Kraken X60 (FOC)*",
  Vortex: "NEO Vortex",
  Minion: "Bag Motor",
  Cu60: "NEO", // Fallback since Cu60 might not be in ReCalc
}

export interface ReCalcArmParams {
  armMass: number
  armMassUnit: "kg" | "lbs"
  comLength: number // Center of mass length
  armLength: number
  currentLimit: number
  motorType: string
  motorCount: number
  gearRatio: number
  startAngle: number
  endAngle: number
}

export interface ReCalcElevatorParams {
  load: number
  loadUnit: "kg" | "lbs"
  travelDistance: number
  spoolDiameter: number
  currentLimit: number
  motorType: string
  motorCount: number
  gearRatio: number
}

export interface ReCalcResults {
  kG?: number
  kV?: number
  kA?: number
}

/**
 * Constructs a ReCalc URL for arm calculations
 */
export function buildReCalcArmUrl(params: ReCalcArmParams): string {
  const baseUrl = "https://www.reca.lc/arm"

  // Convert kg to lbs if needed for ReCalc
  const massInLbs = params.armMassUnit === "kg" ? params.armMass * 2.20462 : params.armMass

  // Convert meters to inches for ReCalc
  const comLengthInches = params.comLength * 39.3701

  // Get ReCalc motor name
  const recalcMotorName = RECALC_MOTOR_MAPPING[params.motorType] || "NEO"

  const urlParams = {
    armMass: { s: massInLbs, u: "lbs" },
    comLength: { s: comLengthInches, u: "in" },
    currentLimit: { s: params.currentLimit, u: "A" },
    efficiency: 100,
    endAngle: { s: params.endAngle, u: "deg" },
    iterationLimit: 10000,
    motor: { quantity: params.motorCount, name: recalcMotorName },
    ratio: { magnitude: params.gearRatio, ratioType: "Reduction" },
    startAngle: { s: params.startAngle, u: "deg" },
  }

  return `${baseUrl}?${Object.entries(urlParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`)
    .join("&")}`
}

/**
 * Constructs a ReCalc URL for elevator/linear calculations
 */
export function buildReCalcElevatorUrl(params: ReCalcElevatorParams): string {
  const baseUrl = "https://www.reca.lc/linear"

  // Convert kg to lbs if needed for ReCalc
  const loadInLbs = params.loadUnit === "kg" ? params.load * 2.20462 : params.load

  // Convert meters to inches for ReCalc
  const travelDistanceInches = params.travelDistance * 39.3701
  const spoolDiameterInches = params.spoolDiameter * 39.3701

  // Get ReCalc motor name
  const recalcMotorName = RECALC_MOTOR_MAPPING[params.motorType] || "NEO"

  const urlParams = {
    angle: { s: 90, u: "deg" }, // Vertical elevator
    currentLimit: { s: params.currentLimit, u: "A" },
    efficiency: 100,
    limitAcceleration: 0,
    limitDeceleration: 0,
    limitVelocity: 0,
    limitedAcceleration: { s: 400, u: "in/s2" },
    limitedDeceleration: { s: 50, u: "in/s2" },
    limitedVelocity: { s: 10, u: "in/s" },
    load: { s: loadInLbs, u: "lbs" },
    motor: { quantity: params.motorCount, name: recalcMotorName },
    ratio: { magnitude: params.gearRatio, ratioType: "Reduction" },
    spoolDiameter: { s: spoolDiameterInches, u: "in" },
    travelDistance: { s: travelDistanceInches, u: "in" },
  }

  return `${baseUrl}?${Object.entries(urlParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`)
    .join("&")}`
}

/**
 * Parses HTML content to extract ReCalc values
 */
function parseReCalcHTML(html: string): ReCalcResults {
  const results: ReCalcResults = {}

  // Create a temporary DOM parser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Extract kG value
  const kGElement = doc.getElementById("kG")
  if (kGElement?.textContent) {
    const kGText = kGElement.textContent.trim()
    const kGMatch = kGText.match(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/)
    if (kGMatch) {
      const kGValue = Number.parseFloat(kGMatch[0])
      if (!isNaN(kGValue)) results.kG = kGValue
    }
  }

  // Extract kV value
  const kVElement = doc.getElementById("estimatedKV")
  if (kVElement?.textContent) {
    const kVText = kVElement.textContent.trim()
    const kVMatch = kVText.match(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/)
    if (kVMatch) {
      const kVValue = Number.parseFloat(kVMatch[0])
      if (!isNaN(kVValue)) results.kV = kVValue
    }
  }

  // Extract kA value
  const kAElement = doc.getElementById("estimatedKA")
  if (kAElement?.textContent) {
    const kAText = kAElement.textContent.trim()
    const kAMatch = kAText.match(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/)
    if (kAMatch) {
      const kAValue = Number.parseFloat(kAMatch[0])
      if (!isNaN(kAValue)) results.kA = kAValue
    }
  }

  return results
}

/**
 * Fetches ReCalc results directly using fetch API
 */
export async function fetchReCalcResults(url: string): Promise<ReCalcResults | null> {
  try {
    console.log("Fetching ReCalc results from:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    console.log("Received HTML response, parsing...")

    // Parse the HTML to extract values
    const results = parseReCalcHTML(html)

    console.log("Parsed ReCalc results:", results)

    // Return results if we found at least one value
    if (Object.keys(results).length > 0) {
      return results
    } else {
      console.warn("No values found in ReCalc response")
      return null
    }
  } catch (error) {
    console.error("Error fetching ReCalc results:", error)

    // If CORS fails, provide helpful error message
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error('Unable to connect to ReCalc. Please use the "Open ReCalc" button to calculate values manually.')
    }

    throw error
  }
}

/**
 * Validates if ReCalc integration is available for the given mechanism type
 */
export function isReCalcSupported(mechanismType: string): boolean {
  return mechanismType === "Arm" || mechanismType === "Elevator"
}

/**
 * Converts form values to ReCalc parameters for arms
 */
export function formValuesToReCalcArmParams(formValues: any, motorCount = 1): ReCalcArmParams | null {
  if (formValues.mechanismType !== "Arm") return null

  const armParams = formValues.armParams
  if (!armParams) return null

  return {
    armMass: armParams.mass || 5.0,
    armMassUnit: armParams.massUnit || "lbs",
    comLength: armParams.centerOfMass || (armParams.length || 1.0) / 2,
    armLength: armParams.length || 1.0,
    currentLimit: formValues.currentLimits?.stator || 40,
    motorType: formValues.motorType,
    motorCount,
    gearRatio: formValues.gearRatio,
    startAngle: armParams.startingPosition || 0,
    endAngle: armParams.hardLimitMax || 90,
  }
}

/**
 * Converts form values to ReCalc parameters for elevators
 */
export function formValuesToReCalcElevatorParams(formValues: any, motorCount = 1): ReCalcElevatorParams | null {
  if (formValues.mechanismType !== "Elevator") return null

  const elevatorParams = formValues.elevatorParams
  if (!elevatorParams) return null

  return {
    load: elevatorParams.mass || 5.0,
    loadUnit: elevatorParams.massUnit || "lbs",
    travelDistance: (elevatorParams.hardLimitMax || 2.0) - (elevatorParams.hardLimitMin || 0.0),
    spoolDiameter: (elevatorParams.drumRadius || 0.025) * 2, // Convert radius to diameter
    currentLimit: formValues.currentLimits?.stator || 40,
    motorType: formValues.motorType,
    motorCount,
    gearRatio: formValues.gearRatio,
  }
}

/**
 * Gets the appropriate ReCalc URL based on mechanism type
 */
export function getReCalcUrl(formValues: any, motorCount = 1): string | null {
  if (formValues.mechanismType === "Arm") {
    const params = formValuesToReCalcArmParams(formValues, motorCount)
    return params ? buildReCalcArmUrl(params) : null
  } else if (formValues.mechanismType === "Elevator") {
    const params = formValuesToReCalcElevatorParams(formValues, motorCount)
    return params ? buildReCalcElevatorUrl(params) : null
  }
  return null
}
