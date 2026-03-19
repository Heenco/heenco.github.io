/**
 * XSD → Graph parser
 * Parses one or more XSD files into a flat { nodes, links } structure
 * suitable for 3d-force-graph.
 *
 * Handles: complexType, simpleType, element, attribute, extension,
 *          restriction, sequence/choice/all, import/include.
 */

export type NodeKind = 'element' | 'complexType' | 'simpleType' | 'group' | 'attributeGroup'

export interface XsdNode {
  id: string
  label: string
  kind: NodeKind
  abstract: boolean
  namespace: string
  fileName: string
  documentation: string
  attributes: Array<{ name: string; type: string; use: string }>
  minOccurs?: string
  maxOccurs?: string
  // raw detail for side panel
  raw: Record<string, string>
}

export type LinkKind = 'extends' | 'restricts' | 'references' | 'contains' | 'imports'

export interface XsdLink {
  source: string
  target: string
  kind: LinkKind
  label?: string
}

export interface XsdGraph {
  nodes: XsdNode[]
  links: XsdLink[]
}

const XS = 'http://www.w3.org/2001/XMLSchema'

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? ''
}

function localName(qname: string): string {
  return qname.includes(':') ? qname.split(':').pop()! : qname
}

function docText(el: Element): string {
  const ann = el.querySelector(':scope > annotation > documentation')
  return ann?.textContent?.trim() ?? ''
}

function parseAttributes(parent: Element): XsdNode['attributes'] {
  const out: XsdNode['attributes'] = []
  parent.querySelectorAll(':scope > attribute, :scope > anyAttribute').forEach(a => {
    out.push({
      name: attr(a, 'name') || attr(a, 'ref') || '(any)',
      type: localName(attr(a, 'type') || attr(a, 'ref') || 'anyType'),
      use:  attr(a, 'use') || 'optional',
    })
  })
  // also look inside complexContent/simpleContent > extension|restriction
  parent.querySelectorAll(':scope > complexContent > *, :scope > simpleContent > *').forEach(ext => {
    ext.querySelectorAll(':scope > attribute').forEach(a => {
      out.push({
        name: attr(a, 'name') || attr(a, 'ref') || '(any)',
        type: localName(attr(a, 'type') || attr(a, 'ref') || 'anyType'),
        use:  attr(a, 'use') || 'optional',
      })
    })
  })
  return out
}

/**
 * Parse a single XSD document string into nodes + links.
 * @param xmlText   raw XSD content
 * @param fileName  used as node namespace prefix fallback
 * @param targetNS  optional explicit targetNamespace override
 */
export function parseXsd(xmlText: string, fileName: string, targetNS = ''): XsdGraph {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error(`XML parse error in ${fileName}: ${parseError.textContent?.slice(0, 120)}`)

  const schema = doc.documentElement
  const ns = targetNS || attr(schema, 'targetNamespace') || fileName.replace(/\.xsd$/i, '')

  const nodes: XsdNode[] = []
  const links: XsdLink[] = []
  const nodeIds = new Set<string>()

  const makeId = (kind: string, name: string) => `${ns}#${kind}/${name}`

  const ensureNode = (id: string, n: Partial<XsdNode>) => {
    if (!nodeIds.has(id)) {
      nodeIds.add(id)
      nodes.push({
        id,
        label: n.label ?? id,
        kind: n.kind ?? 'element',
        abstract: n.abstract ?? false,
        namespace: n.namespace ?? ns,
        fileName: n.fileName ?? fileName,
        documentation: n.documentation ?? '',
        attributes: n.attributes ?? [],
        raw: n.raw ?? {},
      })
    }
  }

  /** Walk direct children of <sequence>, <choice>, <all>, <group ref>, element refs */
  const walkParticles = (parent: Element, parentId: string) => {
    for (const child of Array.from(parent.children)) {
      const tag = child.localName
      if (tag === 'element') {
        const refName = attr(child, 'ref')
        const ownName = attr(child, 'name')
        if (refName) {
          const targetId = makeId('element', localName(refName))
          links.push({ source: parentId, target: targetId, kind: 'references', label: localName(refName) })
        } else if (ownName) {
          // Inline element — process it and link
          processElement(child, parentId)
        }
      } else if (tag === 'group') {
        const refName = attr(child, 'ref')
        if (refName) {
          const targetId = makeId('group', localName(refName))
          links.push({ source: parentId, target: targetId, kind: 'references', label: localName(refName) })
        }
      } else if (['sequence', 'choice', 'all'].includes(tag)) {
        walkParticles(child, parentId)
      }
    }
  }

  const processElement = (el: Element, containerId?: string) => {
    const name = attr(el, 'name')
    if (!name) return
    const id = makeId('element', name)
    const typeRef = localName(attr(el, 'type') || '')
    const isAbstract = attr(el, 'abstract') === 'true'
    const substGroup = localName(attr(el, 'substitutionGroup') || '')

    ensureNode(id, {
      label: name,
      kind: 'element',
      abstract: isAbstract,
      namespace: ns,
      fileName,
      documentation: docText(el),
      attributes: parseAttributes(el),
      minOccurs: attr(el, 'minOccurs') || undefined,
      maxOccurs: attr(el, 'maxOccurs') || undefined,
      raw: { type: typeRef, substitutionGroup: substGroup },
    })

    if (containerId) {
      links.push({ source: containerId, target: id, kind: 'contains' })
    }

    if (typeRef && !['string','integer','decimal','boolean','date','dateTime',
        'float','double','long','int','short','byte','anyType','anySimpleType',
        'normalizedString','token','NMTOKEN','ID','IDREF','anyURI',
        'base64Binary','hexBinary','duration','gYear','gMonth','gDay',
        'gYearMonth','gMonthDay','time','positiveInteger','nonNegativeInteger',
        'negativeInteger','nonPositiveInteger','unsignedLong','unsignedInt',
        'unsignedShort','unsignedByte','language','Name','NCName','QName',
        'NOTATION','IDREFS','NMTOKENS','ENTITIES','ENTITY'].includes(typeRef)) {
      const typeId = makeId('complexType', typeRef)
      links.push({ source: id, target: typeId, kind: 'references' })
    }

    if (substGroup) {
      const sgId = makeId('element', substGroup)
      links.push({ source: id, target: sgId, kind: 'extends' })
    }

    // Inline complexType
    const inlineCT = el.querySelector(':scope > complexType')
    if (inlineCT) processComplexType(inlineCT, id, `${name}_type`)
  }

  const processComplexType = (ct: Element, containerId?: string, forceName?: string) => {
    const name = forceName || attr(ct, 'name')
    if (!name) return
    const id = makeId('complexType', name)
    const isAbstract = attr(ct, 'abstract') === 'true'

    ensureNode(id, {
      label: name,
      kind: 'complexType',
      abstract: isAbstract,
      namespace: ns,
      fileName,
      documentation: docText(ct),
      attributes: parseAttributes(ct),
      raw: { abstract: String(isAbstract) },
    })

    if (containerId) {
      links.push({ source: containerId, target: id, kind: 'contains' })
    }

    // extension / restriction
    const ext = ct.querySelector(':scope > complexContent > extension, :scope > simpleContent > extension')
    const rst = ct.querySelector(':scope > complexContent > restriction, :scope > simpleContent > restriction')

    if (ext) {
      const base = localName(attr(ext, 'base'))
      if (base) {
        const baseId = makeId('complexType', base)
        links.push({ source: id, target: baseId, kind: 'extends' })
      }
      walkParticles(ext, id)
    }

    if (rst) {
      const base = localName(attr(rst, 'base'))
      if (base) {
        const baseId = makeId('complexType', base)
        links.push({ source: id, target: baseId, kind: 'restricts' })
      }
      walkParticles(rst, id)
    }

    // direct sequence/choice/all
    for (const child of Array.from(ct.children)) {
      if (['sequence', 'choice', 'all'].includes(child.localName)) {
        walkParticles(child, id)
      }
    }
  }

  const processSimpleType = (st: Element) => {
    const name = attr(st, 'name')
    if (!name) return
    const id = makeId('simpleType', name)

    const rst = st.querySelector(':scope > restriction')
    const base = rst ? localName(attr(rst, 'base')) : ''

    const enums: string[] = []
    rst?.querySelectorAll(':scope > enumeration').forEach(e => enums.push(attr(e, 'value')))

    ensureNode(id, {
      label: name,
      kind: 'simpleType',
      namespace: ns,
      fileName,
      documentation: docText(st),
      attributes: [],
      raw: { base, enumerations: enums.join(', ') },
    })

    if (base && !['string','integer','decimal','boolean','token','normalizedString','anySimpleType'].includes(base)) {
      const baseId = makeId('simpleType', base)
      links.push({ source: id, target: baseId, kind: 'restricts' })
    }
  }

  const processGroup = (g: Element) => {
    const name = attr(g, 'name')
    if (!name) return
    const id = makeId('group', name)

    ensureNode(id, {
      label: name,
      kind: 'group',
      namespace: ns,
      fileName,
      documentation: docText(g),
      attributes: [],
      raw: {},
    })

    for (const child of Array.from(g.children)) {
      if (['sequence', 'choice', 'all'].includes(child.localName)) {
        walkParticles(child, id)
      }
    }
  }

  const processAttributeGroup = (ag: Element) => {
    const name = attr(ag, 'name')
    if (!name) return
    const id = makeId('attributeGroup', name)

    ensureNode(id, {
      label: name,
      kind: 'attributeGroup',
      namespace: ns,
      fileName,
      documentation: docText(ag),
      attributes: parseAttributes(ag),
      raw: {},
    })
  }

  // Walk top-level schema children
  for (const child of Array.from(schema.children)) {
    switch (child.localName) {
      case 'element':        processElement(child); break
      case 'complexType':    processComplexType(child); break
      case 'simpleType':     processSimpleType(child); break
      case 'group':          processGroup(child); break
      case 'attributeGroup': processAttributeGroup(child); break
      case 'import':
      case 'include': {
        const loc = attr(child, 'schemaLocation') || attr(child, 'namespace')
        if (loc) {
          const importId = `imported:${loc}`
          ensureNode(importId, { label: loc.split('/').pop() ?? loc, kind: 'element', namespace: loc, fileName: loc, documentation: '', attributes: [], raw: {} })
          links.push({ source: `${ns}#root`, target: importId, kind: 'imports' })
        }
        break
      }
    }
  }

  return { nodes, links }
}

/**
 * Merge multiple parsed graphs into one, deduplicating nodes by id.
 */
export function mergeGraphs(graphs: XsdGraph[]): XsdGraph {
  const nodeMap = new Map<string, XsdNode>()
  const links: XsdLink[] = []

  for (const g of graphs) {
    for (const n of g.nodes) nodeMap.set(n.id, n)
    links.push(...g.links)
  }

  // Deduplicate links
  const linkSet = new Set<string>()
  const uniqueLinks: XsdLink[] = []
  for (const l of links) {
    const key = `${l.source}|${l.target}|${l.kind}`
    if (!linkSet.has(key)) { linkSet.add(key); uniqueLinks.push(l) }
  }

  return { nodes: [...nodeMap.values()], links: uniqueLinks }
}
