import {
  area,
  bearing,
  distance,
  point,
  polygon,
} from '@turf/turf'
import type { Feature, Polygon, MultiPolygon, Point, Position } from 'geojson'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * GEOMETRY ANALYSIS UTILITIES FOR PROPERTY LOT INSPECTION
 * ─────────────────────────────────────────────────────────────────────────
 * Analyzes all 5 parameter groups:
 * 1. Orientation (direction, bearing, frontage)
 * 2. Convexity (convex/concave, reflex angles)
 * 3. Frontage/Sides/Back (edge measurements)
 * 4. Battle Axe Detection (stem vs body analysis)
 * 5. Interior Angles (all angles, statistics, orthogonality)
 */

// ─────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────

export interface AnalysisResults {
  orientation: OrientationResults
  convexity: ConvexityResults
  frontage: FrontageResults
  battleAxe: BattleAxeResults
  angles: AngleResults
}

export interface OrientationResults {
  longEdgeBearing: number // 0-360 degrees
  longEdgeLength: number // meters
  longEdgeCardinal: string // "N", "NE", "E", etc.
  principalAxis: number // degrees
  principalAxisCardinal: string
}

export interface ConvexityResults {
  isConvex: boolean
  reflex_angles_count: number
  reflexAngles: number[] // angles > 180°
  convexityRatio: number // 0-1, area/convex hull area
  regularity_percentage: number // 0-100, how "bumpy"
}

export interface FrontageResults {
  frontageLength: number // meters (longest edge)
  frontageCardinal: string
  sideLengths: number[] // remaining edges sorted desc
  backLength: number // assumed as second longest
  rightSideLength: number
  leftSideLength: number
  allEdgeLengths: number[]
  edgeBearings: number[]
}

export interface BattleAxeResults {
  isBattleAxe: boolean | 'likely' | 'possible'
  confidence: number // 0-100 percentage
  stemWidth: number // meters
  stemLength: number // meters
  bodyWidth: number // meters
  widthRatio: number // stem/body, < 0.4 = battle axe
  stemAreaPercentage: number // 0-100
  accessLength: number // meters
  warning: string // brief warning if detected
}

export interface AngleResults {
  allAngles: number[] // Interior angles in degrees
  minAngle: number
  maxAngle: number
  meanAngle: number
  medianAngle: number
  standardDeviation: number
  rightAngleCount: number // angles within 5° of 90°
  orthogonalPercentage: number // 0-100
  reflex_angles: number[] // > 180°
}

// ─────────────────────────────────────────────────────────────────────────
// HELPER: GET COORDINATES FROM FEATURE
// ─────────────────────────────────────────────────────────────────────────

function getPolygonCoordinates(feature: Feature): Array<[number, number]> | null {
  if (!feature || !feature.geometry) return null

  const geom = feature.geometry
  if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
    return geom.coordinates[0] as Array<[number, number]>
  } else if (geom.type === 'MultiPolygon' && geom.coordinates && geom.coordinates[0] && geom.coordinates[0][0]) {
    return geom.coordinates[0][0] as Array<[number, number]>
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// 1. ORIENTATION / DIRECTION ANALYSIS
// ─────────────────────────────────────────────────────────────────────────

function degreesToCardinal(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round((degrees % 360) / 22.5) % 16
  return directions[index] ?? 'N'
}

function analyzeOrientation(coords: Array<[number, number]>): OrientationResults {
  // Find longest edge
  let maxLength = 0
  let maxBearing = 0
  let maxStartIdx = 0

  for (let i = 0; i < coords.length - 1; i++) {
    const coord1 = coords[i]
    const coord2 = coords[i + 1]
    if (!coord1 || !coord2) continue
    
    const [x1, y1] = coord1
    const [x2, y2] = coord2
    const p1 = point([x1, y1])
    const p2 = point([x2, y2])

    const d = distance(p1, p2, { units: 'meters' })
    if (d > maxLength) {
      maxLength = d
      maxBearing = bearing(p1, p2)
      maxStartIdx = i
    }
  }

  // Normalize bearing to 0-360
  const normalizedBearing = (maxBearing % 360 + 360) % 360

  return {
    longEdgeBearing: Math.round(normalizedBearing * 10) / 10,
    longEdgeLength: Math.round(maxLength * 10) / 10,
    longEdgeCardinal: degreesToCardinal(normalizedBearing),
    principalAxis: Math.round(normalizedBearing * 10) / 10,
    principalAxisCardinal: degreesToCardinal(normalizedBearing),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. CONVEXITY ANALYSIS
// ─────────────────────────────────────────────────────────────────────────

function isConvexPolygon(coords: Array<[number, number]>): boolean {
  let sign: number | null = null

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]
    const p2 = coords[(i + 1) % coords.length]
    const p3 = coords[(i + 2) % coords.length]

    if (!p1 || !p2 || !p3) return false

    const cross = (p2[0] - p1[0]) * (p3[1] - p2[1]) - (p2[1] - p1[1]) * (p3[0] - p2[0])

    if (cross !== 0) {
      if (sign === null) {
        sign = cross > 0 ? 1 : -1
      } else if ((cross > 0 ? 1 : -1) !== sign) {
        return false
      }
    }
  }
  return true
}

function calculateInteriorAngles(coords: Array<[number, number]>): number[] {
  const angles: number[] = []

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[(i - 1 + coords.length) % coords.length]
    const p1 = coords[i]
    const p2 = coords[(i + 1) % coords.length]

    if (!p0 || !p1 || !p2) continue

    const v1: [number, number] = [p0[0] - p1[0], p0[1] - p1[1]]
    const v2: [number, number] = [p2[0] - p1[0], p2[1] - p1[1]]

    const dot = v1[0]! * v2[0]! + v1[1]! * v2[1]!
    const cross = v1[0]! * v2[1]! - v1[1]! * v2[0]!
    let angle = Math.atan2(cross, dot) * (180 / Math.PI)

    // Normalize to 0-360
    angle = (angle + 360) % 360

    angles.push(Math.round(angle * 10) / 10)
  }

  return angles
}

function analyzeConvexity(feature: Feature): ConvexityResults {
  const coords = getPolygonCoordinates(feature)
  if (!coords || coords.length < 3) {
    return {
      isConvex: false,
      reflex_angles_count: 0,
      reflexAngles: [],
      convexityRatio: 0,
      regularity_percentage: 0,
    }
  }

  const isConvex = isConvexPolygon(coords)
  const angles = calculateInteriorAngles(coords)
  const reflexAngles = angles.filter(a => a > 180)

  // Approximate convexity ratio
  const feat = feature as Feature<Polygon | MultiPolygon>
  const polyArea = area(feat)
  
  // Simple bounding box calculation
  const xs = coords.map(c => c[0])
  const ys = coords.map(c => c[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  
  const boxArea = (maxX - minX) * (maxY - minY)
  const approxConvexityRatio = Math.round((polyArea / boxArea) * 100) / 100

  const regularity = Math.round(Math.max(0, 100 - reflexAngles.length * 15))

  return {
    isConvex,
    reflex_angles_count: reflexAngles.length,
    reflexAngles: reflexAngles.map(a => Math.round(a * 10) / 10),
    convexityRatio: approxConvexityRatio,
    regularity_percentage: regularity,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. FRONTAGE / SIDES / BACK ANALYSIS
// ─────────────────────────────────────────────────────────────────────────

function analyzeFrontage(coords: Array<[number, number]>): FrontageResults {
  const edgeLengths: { length: number; bearing: number; index: number }[] = []

  // Calculate all edge lengths and bearings
  for (let i = 0; i < coords.length - 1; i++) {
    const coord1 = coords[i]
    const coord2 = coords[i + 1]
    if (!coord1 || !coord2) continue
    
    const p1 = point(coord1 as Position)
    const p2 = point(coord2 as Position)

    const d = distance(p1, p2, { units: 'meters' })
    const b = bearing(p1, p2)

    edgeLengths.push({
      length: Math.round(d * 10) / 10,
      bearing: (b % 360 + 360) % 360,
      index: i,
    })
  }

  // Sort by length descending
  const sorted = [...edgeLengths].sort((a, b) => b.length - a.length)

  const allEdgeLengths = edgeLengths.map(e => e.length)
  const edgeBearings = edgeLengths.map(e => Math.round(e.bearing * 10) / 10)

  return {
    frontageLength: sorted[0]?.length || 0,
    frontageCardinal: degreesToCardinal(sorted[0]?.bearing || 0),
    sideLengths: sorted.slice(1, -1).map(e => e.length),
    backLength: sorted[sorted.length - 1]?.length || 0,
    rightSideLength: sorted[1]?.length || 0,
    leftSideLength: sorted[2]?.length || 0,
    allEdgeLengths,
    edgeBearings,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. BATTLE AXE DETECTION
// ─────────────────────────────────────────────────────────────────────────

function detectBattleAxe(feature: Feature): BattleAxeResults {
  const coords = getPolygonCoordinates(feature)
  if (!coords || coords.length < 5) {
    return {
      isBattleAxe: false,
      confidence: 0,
      stemWidth: 0,
      stemLength: 0,
      bodyWidth: 0,
      widthRatio: 0,
      stemAreaPercentage: 0,
      accessLength: 0,
      warning: '',
    }
  }

  // Simplified battle-axe detection:
  // Look for a significant width change in the polygon

  // Find bounding box
  const xs = coords.map(c => c[0]).sort((a, b) => a - b)
  const ys = coords.map(c => c[1]).sort((a, b) => a - b)
  const minX = xs[0] ?? 0
  const maxX = xs[xs.length - 1] ?? 0
  const minY = ys[0] ?? 0
  const maxY = ys[ys.length - 1] ?? 0

  const width = maxX - minX
  const height = maxY - minY

  // Approximate stem and body
  // For now, very simplified: if aspect ratio > 2:1 and area is distributed unevenly = battle axe
  const aspectRatio = Math.max(width, height) / Math.min(width, height)

  // Calculate some narrowing points
  const feat = feature as Feature<Polygon | MultiPolygon>
  const totalArea = area(feat)

  // Heuristic: division point at 30% from one end
  let confidence = 0
  let isBattleAxe: boolean | 'likely' | 'possible' = false
  let stemWidth = 0
  let bodyWidth = 0

  if (aspectRatio > 2.5) {
    // Elongated lot
    const narrowestWidth = Math.min(width, height) * 0.4 // Assume narrowest is ~40% of max
    const wideSection = Math.max(width, height) * 0.6
    const widthRatio = narrowestWidth / wideSection

    if (widthRatio < 0.4) {
      isBattleAxe = 'likely'
      confidence = Math.min(85, 40 + widthRatio * 50)
      stemWidth = narrowestWidth * 1000 // meters
      bodyWidth = wideSection * 1000
    } else if (widthRatio < 0.6) {
      isBattleAxe = 'possible'
      confidence = Math.min(60, 30 + widthRatio * 30)
      stemWidth = narrowestWidth * 1000
      bodyWidth = wideSection * 1000
    }
  }

  const stemArea = totalArea * 0.25 // Rough estimate
  const accessLength = Math.max(width, height) * 0.4 // Rough estimate

  return {
    isBattleAxe,
    confidence: Math.round(confidence),
    stemWidth: Math.round(stemWidth * 10) / 10,
    stemLength: Math.round(accessLength * 10) / 10,
    bodyWidth: Math.round(bodyWidth * 10) / 10,
    widthRatio: Math.round((stemWidth / bodyWidth) * 100) / 100,
    stemAreaPercentage: Math.round((stemArea / totalArea) * 100),
    accessLength: Math.round(accessLength * 10) / 10,
    warning: isBattleAxe ? '⚠️ Access-limited lot — may impact development potential' : '',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 5. ANGLE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────

function analyzeAngles(coords: Array<[number, number]>): AngleResults {
  const angles = calculateInteriorAngles(coords)

  const minAngle = Math.min(...angles)
  const maxAngle = Math.max(...angles)
  const meanAngle = Math.round((angles.reduce((a, b) => a + b, 0) / angles.length) * 10) / 10

  // Calculate median
  const sorted = [...angles].sort((a, b) => a - b)
  let median = 0
  if (sorted.length % 2 === 0) {
    const mid1 = sorted[Math.floor(sorted.length / 2) - 1] ?? 0
    const mid2 = sorted[Math.floor(sorted.length / 2)] ?? 0
    median = (mid1 + mid2) / 2
  } else {
    median = sorted[Math.floor(sorted.length / 2)] ?? 0
  }

  // Standard deviation
  const variance = angles.reduce((acc, angle) => acc + Math.pow(angle - meanAngle, 2), 0) / angles.length
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10

  // Right angle count (within 5° of 90°)
  const rightAngleCount = angles.filter(a => Math.abs(a - 90) <= 5).length
  const orthogonalPercentage = Math.round((rightAngleCount / angles.length) * 100)

  const reflexAngles = angles.filter(a => a > 180)

  return {
    allAngles: angles,
    minAngle: Math.round(minAngle * 10) / 10,
    maxAngle: Math.round(maxAngle * 10) / 10,
    meanAngle,
    medianAngle: Math.round(median * 10) / 10,
    standardDeviation: stdDev,
    rightAngleCount,
    orthogonalPercentage,
    reflex_angles: reflexAngles,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN ANALYSIS FUNCTION
// ─────────────────────────────────────────────────────────────────────────

export function analyzePolygonGeometry(feature: Feature): AnalysisResults | null {
  const coords = getPolygonCoordinates(feature)
  if (!coords || coords.length < 4) {
    return null
  }

  return {
    orientation: analyzeOrientation(coords),
    convexity: analyzeConvexity(feature),
    frontage: analyzeFrontage(coords),
    battleAxe: detectBattleAxe(feature),
    angles: analyzeAngles(coords),
  }
}
