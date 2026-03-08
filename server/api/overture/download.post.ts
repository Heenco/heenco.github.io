// This server route is intentionally disabled.
// All Overture data extraction now runs client-side via DuckDB WASM.
export default defineEventHandler(async () => {
  throw createError({ statusCode: 410, message: 'Use client-side DuckDB WASM instead.' })
})
