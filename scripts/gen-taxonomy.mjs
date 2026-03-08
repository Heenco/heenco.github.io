// Generates app/config/overtureTaxonomy.ts from public/overture_categories.csv
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const csv = readFileSync(join(root, 'public', 'overture_categories.csv'), 'utf8')
const lines = csv.split('\n').slice(1).map(l => l.trim()).filter(Boolean)

const toLabel = id =>
  id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// Build a tree from the path lists
const tree = {} // id -> { id, label, children: Map }

for (const line of lines) {
  const semi = line.indexOf(';')
  const id   = line.slice(0, semi).trim()
  const pathStr = line.slice(semi + 1).trim()
  // pathStr looks like [eat_and_drink,restaurant,afghan_restaurant]
  const path = pathStr.replace(/^\[|\]$/g, '').split(',').map(s => s.trim())

  // Walk / create nodes along the path
  let cursor = tree
  for (const node of path) {
    if (!cursor[node]) {
      cursor[node] = { id: node, label: toLabel(node), children: {} }
    }
    cursor = cursor[node].children
  }
}

// Recursively serialise to TaxonomyNode[]
const serialize = (map, indent = 0) => {
  const pad  = '  '.repeat(indent)
  const pad2 = '  '.repeat(indent + 1)
  const entries = Object.values(map)
  if (entries.length === 0) return null
  return entries.map(node => {
    const childrenStr = serialize(node.children, indent + 1)
    const childrenProp = childrenStr
      ? `,\n${pad2}children: [\n${childrenStr}\n${pad2}]`
      : ''
    return `${pad}{ id: '${node.id}', label: '${node.label}'${childrenProp} }`
  }).join(',\n')
}

const body = serialize(tree, 1)

const output = `// Overture Maps Places taxonomy — auto-generated from public/overture_categories.csv
// Do not edit manually; run: node scripts/gen-taxonomy.mjs

export interface TaxonomyNode {
  id: string
  label: string
  children?: TaxonomyNode[]
}

export const OVERTURE_PLACES_TAXONOMY: TaxonomyNode[] = [
${body}
]

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return direct children of the node reached by path */
export function childrenAt(path: string[]): TaxonomyNode[] {
  let nodes: TaxonomyNode[] = OVERTURE_PLACES_TAXONOMY
  for (const id of path) {
    const found = nodes.find(n => n.id === id)
    if (!found) return []
    nodes = found.children ?? []
  }
  return nodes
}

/** Return human-readable labels for each step in a path */
export function getPathLabels(path: string[]): string[] {
  const labels: string[] = []
  let nodes: TaxonomyNode[] = OVERTURE_PLACES_TAXONOMY
  for (const id of path) {
    const found = nodes.find(n => n.id === id)
    if (!found) break
    labels.push(found.label)
    nodes = found.children ?? []
  }
  return labels
}
`

const outPath = join(root, 'app', 'config', 'overtureTaxonomy.ts')
writeFileSync(outPath, output, 'utf8')
console.log(`Written ${lines.length} categories → ${outPath}`)
