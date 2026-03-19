<template>
  <main class="post-page">
    <div class="container">

      <!-- Back -->
      <NuxtLink to="/blog" class="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Insights
      </NuxtLink>

      <!-- Header -->
      <header class="post-header">
        <div class="post-meta">
          <span class="post-category">{{ post.category }}</span>
          <span class="post-dot">·</span>
          <span class="post-date">{{ post.date }}</span>
          <span class="post-dot">·</span>
          <span class="post-read-time">{{ post.readTime }}</span>
          <template v-if="viewCount !== null">
            <span class="post-dot">·</span>
            <span class="post-views">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {{ viewCount.toLocaleString() }} views
            </span>
          </template>
        </div>
        <h1 class="post-title">{{ post.title }}</h1>
        <p class="post-excerpt">{{ post.excerpt }}</p>
      </header>

      <!-- Content -->
      <div class="post-content" v-html="post.content" />

      <!-- Footer -->
      <footer class="post-footer">
        <div class="post-footer__divider" />
        <NuxtLink to="/blog" class="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Insights
        </NuxtLink>
      </footer>

    </div>
  </main>
</template>

<script setup>
const route = useRoute()
const slug = route.params.slug

const posts = {
  'xsd-graph-explorer': {
    title: 'Visualising ADAC XSD Schemas as a 3D Graph',
    excerpt: 'XML Schema files are notoriously hard to navigate. We built a browser-based tool that turns them into an interactive 3D node graph — with search, an inheritance tree, and no install required.',
    category: 'Tool',
    date: 'March 19, 2026',
    readTime: '3 min read',
    content: `
      <p>If you've ever had to work with ADAC — Australia's asset data handover standard — you'll know the schema is not small. Sixteen XSD files, hundreds of complex types, deep inheritance chains, and cross-file references. Reading it in a text editor tells you almost nothing about how the types relate to each other.</p>

      <p>We built the <strong>XSD Graph Explorer</strong> to change that.</p>

      <div style="margin:2rem 0;">
        <video controls muted loop playsinline style="width:100%;border-radius:10px;display:block;background:#0a0a12;">
          <source src="/blog/xsd-graph-demo.webm" type="video/webm">
          Your browser does not support embedded video.
        </video>
        <p style="text-align:center;font-size:0.82rem;color:#888;margin-top:0.6rem;">The XSD Graph Explorer auto-loading all 16 ADAC schema files and rendering a navigable 3D node graph.</p>
      </div>

      <h2>The Problem With Schemas</h2>

      <p>XSD files are designed for machine validation, not human exploration. They encode rich structural information — type hierarchies, element references, attribute constraints — but that information is spread across files, buried in XML, and cross-linked in ways that are almost impossible to follow linearly.</p>

      <p>Tools like Oxygen XML or Altova XMLSpy can visualise schemas, but they require a licence, a local install, and a fairly specific workflow. There's no quick, open, browser-based way to just <em>look at</em> how a schema hangs together.</p>

      <h2>What We Built</h2>

      <p>The <strong>XSD Graph Explorer</strong> parses one or more XSD files in the browser and renders them as a force-directed 3D graph. Nodes represent types, elements, groups, and attribute groups. Edges represent the relationships between them: extension, restriction, reference, containment, and import.</p>

      <ul>
        <li>Drag and drop any <code>.xsd</code> files or use the auto-loaded ADAC schema set (all 16 files, parsed on first visit)</li>
        <li>Rotate, zoom, and pan the 3D graph freely — click any node to inspect its attributes, documentation, and connections</li>
        <li>Search across all node names and namespaces — results appear in a dropdown with the matching segment highlighted</li>
        <li>Switch to the <strong>Tree tab</strong> to browse the inheritance hierarchy — expand/collapse branches, filter by name, and click any row to fly the camera to that node</li>
        <li>Filter by node kind (complexType, element, simpleType, group, attributeGroup) and namespace</li>
        <li>Everything runs in the browser — no install, no server, no account</li>
      </ul>

      <h2>ADAC as a Starting Point</h2>

      <p>We pre-load the full ADAC V6.0 schema set on first visit. ADAC (Asset Data and Acquisition Commitment) is the XML-based standard used by Australian local councils and utilities for asset data handover. Its schema is a good stress test: 16 interdependent XSD files with complex GML-based inheritance, hundreds of types, and a wide range of element structures across water, sewerage, transport, electrical, and open space domains.</p>

      <p>The graph renders all of it in a few seconds. The result is a navigable map of the entire schema — something that would take hours to reconstruct manually from the raw files.</p>

      <p><a href="/tools/xsd-graph">Open the XSD Graph Explorer →</a></p>
    `,
  },

  'overture-downloader': {
    title: 'Downloading Overture Maps Data Without the Headache',
    excerpt: 'Running DuckDB queries against cloud-hosted Parquet files is powerful, but it shouldn\'t require a data engineering background just to grab a city\'s worth of POIs.',
    category: 'Tool',
    date: 'March 9, 2026',
    readTime: '3 min read',
    content: `
      <p>Overture Maps is one of the most exciting open datasets to emerge in recent years: a global, structured, regularly updated alternative to OpenStreetMap, maintained by a consortium including Microsoft, Meta, and Amazon.</p>

      <p>The data is openly available. The problem is how you get to it.</p>

      <div style="margin:2rem 0;">
        <video controls muted loop playsinline style="width:100%;border-radius:10px;display:block;background:#0a0a12;">
          <source src="/blog/overture-downloader-demo.webm" type="video/webm">
          Your browser does not support embedded video.
        </video>
        <p style="text-align:center;font-size:0.82rem;color:#888;margin-top:0.6rem;">Queuing cafés and automotive places in Bracken Ridge, QLD — DuckDB WASM running entirely in the browser.</p>
      </div>

      <h2>The Existing Options Fall Short</h2>

      <p>The standard approach is to query Overture's cloud-hosted Parquet files using DuckDB or Athena. That works well if you're comfortable writing SQL against remote S3 buckets, know the schema, and have the right environment set up. For most people — planners, analysts, small teams — it's a significant barrier.</p>

      <p>The official <code>overturemaps</code> CLI tool helps, but it requires Python, a configured environment, and familiarity with the category taxonomy. There's no visual feedback, no map preview, and you can only pull one thing at a time.</p>

      <h2>What We Built</h2>

      <p>The <strong>Overture Downloader</strong> is a fully browser-based tool — no install, no backend, no account. DuckDB runs directly in the browser as a WASM module, querying Overture's cloud-hosted Parquet files on the client. Draw a bounding box, choose a theme and category, and queue it up.</p>

      <ul>
        <li>Visual bounding box selection on an interactive map</li>
        <li>Browse the full Overture category taxonomy across Places, Buildings, Transportation, and Addresses</li>
        <li>Add multiple extractions to a queue — each runs concurrently in the background with its own DuckDB connection</li>
        <li>Live progress bar per extraction, with elapsed time and an adaptive estimate that adjusts as the query runs</li>
        <li>Results appear as interactive map layers — toggle visibility, change colour, preview your data before downloading</li>
        <li>Download individual layers as GeoParquet, or use <em>Extract All</em> to bundle everything into a single ZIP</li>
        <li>Set the Overture release version you want to query</li>
      </ul>

      <p>Everything happens in your browser. The files go straight to your machine, ready for QGIS, GeoPandas, or DuckDB.</p>

      <p><a href="/tools/overture-downloader">Try the Overture Downloader →</a></p>
    `,
  },

  'osm-downloader': {
    title: 'Getting OpenStreetMap Data Into a Format That Actually Works',
    excerpt: 'Overpass Turbo is great for quick lookups. But when you need clean, analysis-ready data in Parquet, you\'re usually left stitching scripts together.',
    category: 'Tool',
    date: 'March 9, 2026',
    readTime: '3 min read',
    content: `
      <p>OpenStreetMap is the world's most comprehensive open geographic dataset. It covers roads, buildings, parks, cafés, hospitals, and almost everything in between. Getting that data into a useful format, however, has always required more effort than it should.</p>

      <h2>The Gap in Existing Tools</h2>

      <p>Overpass Turbo is the go-to for ad hoc queries. It's excellent for exploration, but exports to GeoJSON (which becomes unwieldy at scale) and offers no Parquet output. Tools like <code>osmium</code> and <code>osm2pgsql</code> are powerful but CLI-only, requiring installation and configuration.</p>

      <p>None of them let you point at a map, pick a tag, and walk away with a clean file.</p>

      <h2>What We Built</h2>

      <p>The <strong>OSM Downloader</strong> gives you a map-based interface to extract OpenStreetMap features by tag and bounding box, with output straight to Parquet.</p>

      <ul>
        <li>Draw or enter your bounding box directly on the map</li>
        <li>Filter by element type: nodes, ways, or relations</li>
        <li>Choose from common tag keys and values (amenity, leisure, landuse, and more)</li>
        <li>Export to Parquet with geometry, tags, and OSM ID preserved</li>
      </ul>

      <p>Way geometries are represented as centroid points, making the output immediately usable in spatial analysis without additional processing.</p>

      <p><a href="/tools/osm-downloader">Try the OSM Downloader →</a></p>
    `,
  },

  'population-dataset': {
    title: 'From a 400 MB GeoPackage to a Web Map in Four Steps',
    excerpt: 'Kontur\'s population dataset is one of the most useful open spatial datasets available. Here\'s exactly how we downloaded it, converted it to PMTiles, and put it on a map anyone can explore.',
    category: 'Dataset',
    date: 'March 9, 2026',
    readTime: '4 min read',
    content: `
      <p>Global, gridded, openly licensed population data sounds like something that should be easy to get hold of. In practice, most sources are either too coarse, paywalled, or so unwieldy that getting them into a usable form requires a dedicated pipeline.</p>

      <p>The <strong>Kontur Population dataset</strong> is different. It's one of the most practically useful open spatial datasets we've come across, and we wanted to put it on a map that anyone could open in a browser, without installing anything.</p>

      <h2>What Is the Kontur Population Dataset?</h2>

      <p>Kontur produces a global population dataset built on the H3 hexagonal grid system (resolution 8, ~400 m across). Each hexagon carries a population estimate assembled from several sources:</p>

      <ul>
        <li><strong>GHSL (Global Human Settlement Layer)</strong>: the primary base, a European Commission framework using radar and optical satellite imagery to detect built-up areas globally.</li>
        <li><strong>Meta's High Resolution Settlement Layer (HRSL)</strong>: overlaid where available, using Facebook's AI-derived building detection from satellite imagery to improve accuracy in densely populated regions.</li>
        <li><strong>Microsoft Building Footprints</strong>, Copernicus Global Land Service, and Land Information New Zealand data: used to further refine the spatial distribution of population within each hexagon.</li>
        <li><strong>OpenStreetMap</strong>: used to constrain known artifacts. Roads, quarries, lakes, forests, and similar land uses are explicitly marked as unpopulated, correcting systematic errors in both GHSL and HRSL.</li>
      </ul>

      <p>The result is a uniform, analysis-ready grid covering the entire country: no census tract boundaries, no irregular polygons, no projection headaches. Just hexagons with numbers. The Australia extract is published on the <strong>Humanitarian Data Exchange (HDX)</strong> as a gzipped GeoPackage, updated regularly by Kontur, and freely available under a CC BY licence.</p>

      <h2>Step 1: Download</h2>

      <p>The dataset ships as a <code>.gpkg.gz</code>, a GeoPackage compressed with gzip. We streamed it directly from Kontur's S3 bucket using Python's <code>requests</code> library, then decompressed it with <code>gzip.open()</code>. No special tooling required.</p>

      <pre><code>DOWNLOAD_URL = "https://geodata-eu-central-1-kontur-public.s3.amazonaws.com/kontur_datasets/kontur_population_AU_20231101.gpkg.gz"</code></pre>

      <h2>Step 2: Inspect and Convert to GeoJSON Lines</h2>

      <p>We loaded the GeoPackage with <strong>GeoPandas</strong> and checked the schema — one layer, one column (<code>population</code>), ~2.5 million hexagons for Australia. The geometry is in WGS 84.</p>

      <p>Tippecanoe (the tile-generation tool we use) reads <strong>newline-delimited GeoJSON</strong> (<code>.geojsonl</code>) efficiently, one feature per line, streamed rather than loaded whole. GeoPandas exports this directly via the <code>GeoJSONSeq</code> driver:</p>

      <pre><code>gdf.to_file("kontur_population_AU.geojsonl", driver="GeoJSONSeq")</code></pre>

      <h2>Step 3: Generate PMTiles with Tippecanoe</h2>

      <p>We used the <strong>felt/tippecanoe</strong> fork, which adds native PMTiles output support (the original Mapbox version only writes MBTiles). The tile generation command:</p>

      <pre><code>tippecanoe \\
  -o kontur_population_AU.pmtiles \\
  -Z2 -z12 \\
  --drop-densest-as-needed \\
  --extend-zooms-if-still-dropping \\
  -l population \\
  kontur_population_AU.geojsonl</code></pre>

      <p>The zoom range 2–12 gives full global context at low zoom and individual hex resolution at high zoom. <code>--drop-densest-as-needed</code> keeps tile sizes under the 500 KB limit by thinning features at lower zoom levels, without distorting the overall picture.</p>

      <h2>Step 4: Serve and Render</h2>

      <p><strong>PMTiles</strong> is a single-file tile archive with range-request support. The browser fetches only the tiles it needs, directly from cloud storage, with no tile server required. We host the file in a public bucket and render it using <strong>MapboxGL JS</strong> with a custom colour ramp tied to the population value.</p>

      <p>The result is an interactive map of population density across Australia that loads in seconds, works on any device, and costs nothing to run.</p>

      <p><a href="/maps/population-pois">Explore the Population &amp; POI Map →</a></p>

      <hr/>

      <p><strong>Need this dataset?</strong> If you'd like access to the processed PMTiles file for your own project, <a href="mailto:hello@heenco.com.au">get in touch</a>. We're happy to share it or help you generate one for a different region.</p>
    `,
  },

  'esri-rest-downloader': {
    title: 'Accessing ArcGIS Data Without an ArcGIS Licence',
    excerpt: 'Thousands of government datasets sit behind ArcGIS REST endpoints. Getting data out without the right software has always meant wrestling with APIs by hand.',
    category: 'Tool',
    date: 'March 9, 2026',
    readTime: '3 min read',
    content: `
      <p>A significant portion of publicly available geospatial data, from local councils, state agencies, and national governments, is published through ArcGIS REST services. The data is technically open. Accessing it cleanly is not always straightforward.</p>

      <h2>The Problem With the Current Workflow</h2>

      <p>Without an ArcGIS licence, your options are limited. You can manually call the REST API endpoint by endpoint, paginate through features in batches of 1,000, and stitch results together. It works, but it's tedious. Tools like Postman or <code>curl</code> don't understand service trees, layer hierarchies, or pagination. QGIS can connect to ArcGIS services, but export is clunky and format support is narrow.</p>

      <p>There's no clean, free, browser-based way to browse an ArcGIS service, pick a layer, and download it.</p>

      <h2>What We Built</h2>

      <p>The <strong>ESRI REST Downloader</strong> lets you paste any ArcGIS REST service URL, explore the full service tree, inspect layer metadata, and add layers to a download queue. All in the browser — no install, no backend.</p>

      <ul>
        <li>Paste a service URL and auto-discover all folders, services, and layers</li>
        <li>Browse service metadata and field schemas inline</li>
        <li>Add multiple layers to a queue — each fetches in the background with live progress while you keep browsing</li>
        <li>Automatic pagination is handled client-side, so large layers come through in full without any manual batching</li>
        <li>Completed layers appear in a panel — toggle visibility, review the data, then download individually or use <em>Extract All</em> to bundle everything into a single ZIP of GeoParquet files</li>
        <li>CORS restrictions are detected upfront and surfaced clearly, before you waste time queuing a layer that can't be reached</li>
      </ul>

      <p><a href="/tools/esri-rest-downloader">Try the ESRI REST Downloader →</a></p>
    `,
  },
}

const post = posts[slug] || {
  title: 'Post Not Found',
  excerpt: '',
  category: '',
  date: '',
  readTime: '',
  content: '<p>This post doesn\'t exist. <a href="/blog">Back to Insights</a>.</p>',
}

const { viewCount } = usePageViews()

useSeoMeta({
  title: `${post.title} — Heenco`,
  description: post.excerpt,
})
</script>

<style scoped>
.post-page {
  font-family: var(--font-family);
  min-height: 100vh;
  padding: 3rem 0 6rem;
}

.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* ── Back link ─────────────────────────────────────────────── */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #9ca3af;
  text-decoration: none;
  margin-bottom: 2.5rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #10b981;
}

/* ── Header ────────────────────────────────────────────────── */
.post-header {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #f3f4f6;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.post-category {
  color: #10b981;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.post-dot {
  color: #d1d5db;
}

.post-date,
.post-read-time,
.post-views {
  color: #9ca3af;
}

.post-views {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.post-title {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.03em;
  line-height: 1.25;
  margin: 0 0 1rem;
}

.post-excerpt {
  font-size: 1.05rem;
  color: #6b7280;
  line-height: 1.65;
  margin: 0;
}

/* ── Content ───────────────────────────────────────────────── */
.post-content {
  font-size: 0.975rem;
  color: #374151;
  line-height: 1.75;
}

.post-content :deep(p) {
  margin: 0 0 1.25rem;
}

.post-content :deep(h2) {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
  margin: 2.5rem 0 0.75rem;
}

.post-content :deep(ul),
.post-content :deep(ol) {
  padding-left: 1.5rem;
  margin: 0 0 1.25rem;
}

.post-content :deep(li) {
  margin-bottom: 0.4rem;
  color: #4b5563;
}

.post-content :deep(pre) {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 0 0 1.25rem;
  overflow-x: auto;
  max-width: 100%;
}

.post-content :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.825em;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-all;
}

.post-content :deep(hr) {
  border: none;
  border-top: 1px solid #f3f4f6;
  margin: 2rem 0;
}

.post-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0.1em 0.4em;
  color: #374151;
}

.post-content :deep(a) {
  color: #10b981;
  text-decoration: none;
  font-weight: 500;
  border-bottom: 1px solid rgba(16, 185, 129, 0.25);
  transition: border-color 0.2s ease;
}

.post-content :deep(a:hover) {
  border-color: #10b981;
}

.post-content :deep(strong) {
  color: #111827;
  font-weight: 600;
}

/* ── Footer ────────────────────────────────────────────────── */
.post-footer {
  margin-top: 4rem;
}

.post-footer__divider {
  height: 1px;
  background: #f3f4f6;
  margin-bottom: 2rem;
}
</style>
