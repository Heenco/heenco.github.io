import { parquetRead, asyncBufferFromUrl } from 'hyparquet'
import { latLngToCell, cellToBoundary } from 'h3-js'

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: { type: string; coordinates: unknown }
  properties: Record<string, unknown>
}

/**
 * Loads a Parquet file and bins points into H3 hexagons at the given resolution.
 * Returns a GeoJSON FeatureCollection of Polygon features with a `count` property.
 *
 * H3 resolution guide (approximate edge length):
 *   4 ≈ 110 km  |  5 ≈ 40 km  |  6 ≈ 15 km  |  7 ≈ 5 km  |  8 ≈ 2 km
 */
export async function loadParquetAsHexbins(
  url: string,
  resolution = 6,
): Promise<GeoJSONFeatureCollection> {
  const asyncBuffer = await asyncBufferFromUrl({ url })
  const counts = new Map<string, number>()

  await parquetRead({
    file: asyncBuffer,
    rowFormat: 'object',
    onComplete: (rows: Record<string, unknown>[]) => {
      for (const row of rows) {
        const lon = row.longitude as number | null
        const lat = row.latitude as number | null
        if (lon != null && lat != null) {
          const cell = latLngToCell(lat, lon, resolution)
          counts.set(cell, (counts.get(cell) ?? 0) + 1)
        }
      }
    },
  })

  const features: GeoJSONFeature[] = []
  for (const [cell, count] of counts) {
    // cellToBoundary returns [lat, lng] pairs — flip to [lng, lat] for GeoJSON
    const boundary = cellToBoundary(cell).map(([lat, lng]) => [lng, lat])
    if (boundary[0]) boundary.push(boundary[0]) // close the ring
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [boundary] },
      properties: { h3: cell, count },
    })
  }

  return { type: 'FeatureCollection', features }
}
