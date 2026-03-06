<template>
  <main class="blog-post">
    <article class="container">
      <!-- Back Link -->
      <NuxtLink to="/blog" class="back-link">
        <span class="back-arrow">←</span> Back to Insights
      </NuxtLink>

      <!-- Post Header -->
      <header class="post-header">
        <div class="post-header__meta">
          <span class="badge">{{ post.category }}</span>
          <span class="post-header__date">{{ post.date }}</span>
          <span class="separator">•</span>
          <span class="read-time">{{ post.readTime }}</span>
        </div>
        <h1 class="post-header__title">{{ post.title }}</h1>
        <p class="post-header__excerpt">{{ post.excerpt }}</p>
      </header>

      <!-- Post Content -->
      <div class="post-content">
        <div v-html="post.content"></div>
      </div>

      <!-- Post Footer -->
      <footer class="post-footer">
        <div class="post-footer__divider"></div>
        <NuxtLink to="/blog" class="post-footer__back">
          ← Back to all insights
        </NuxtLink>
      </footer>
    </article>
  </main>
</template>

<script setup>
const route = useRoute()
const slug = route.params.slug

// Sample blog post data - replace with API/CMS in production
const posts = {
  'spatial-data-infrastructure': {
    title: 'Building Modern Spatial Data Infrastructure for Enterprise Scale',
    excerpt: 'How leading organizations are transforming their geospatial capabilities by implementing cloud-native spatial data platforms that integrate seamlessly with existing enterprise systems.',
    category: 'Infrastructure',
    date: 'March 1, 2026',
    readTime: '8 min read',
    content: `
      <p>Modern enterprises are increasingly recognizing the strategic value of spatial data. From asset management to customer analytics, location intelligence has become a critical component of decision-making processes across industries.</p>

      <h2>The Challenge of Legacy Systems</h2>
      <p>Many organizations still rely on legacy GIS systems that were designed for desktop use in the 1990s and early 2000s. These systems often struggle with:</p>
      <ul>
        <li>Limited scalability for enterprise-wide deployment</li>
        <li>Poor integration with modern cloud infrastructure</li>
        <li>Inflexible data models that don't align with business needs</li>
        <li>High licensing costs and vendor lock-in</li>
      </ul>

      <h2>Cloud-Native Spatial Architecture</h2>
      <p>The shift to cloud-native architectures offers a pathway to modernize spatial data infrastructure. Key components include:</p>
      
      <h3>1. Distributed Data Storage</h3>
      <p>Modern spatial databases like PostGIS, combined with cloud storage solutions, provide scalable, cost-effective data management. Organizations can store vast quantities of spatial data while maintaining query performance through proper indexing and partitioning strategies.</p>

      <h3>2. Microservices Architecture</h3>
      <p>Breaking down monolithic GIS applications into microservices enables better scalability and maintainability. Each service can be independently deployed, scaled, and updated without affecting the entire system.</p>

      <h3>3. API-First Design</h3>
      <p>RESTful and GraphQL APIs make spatial data accessible to any application, from mobile apps to business intelligence dashboards. This democratizes access to location intelligence across the organization.</p>

      <h2>Integration with Enterprise Systems</h2>
      <p>The real value of spatial infrastructure emerges when it's integrated with existing enterprise systems:</p>
      <ul>
        <li>ERP systems for asset lifecycle management</li>
        <li>CRM platforms for territory management and customer analytics</li>
        <li>Business intelligence tools for spatial analysis and visualization</li>
        <li>IoT platforms for real-time location tracking</li>
      </ul>

      <h2>Implementation Roadmap</h2>
      <p>Successfully modernizing spatial data infrastructure requires a phased approach:</p>
      <ol>
        <li><strong>Assessment</strong> - Evaluate current capabilities and identify gaps</li>
        <li><strong>Architecture Design</strong> - Define target state and migration path</li>
        <li><strong>Pilot Implementation</strong> - Start with a focused use case</li>
        <li><strong>Iterative Expansion</strong> - Gradually migrate additional workflows</li>
        <li><strong>Optimization</strong> - Continuously refine performance and capabilities</li>
      </ol>

      <h2>Looking Forward</h2>
      <p>Organizations that invest in modern spatial data infrastructure position themselves to leverage emerging technologies like AI-powered spatial analytics, real-time processing, and advanced visualization capabilities. The key is to build flexible, scalable foundations that can evolve with changing business needs and technological capabilities.</p>
    `
  },
  'geospatial-analytics-trends': {
    title: 'Emerging Trends in Geospatial Analytics for 2026',
    excerpt: 'Exploring the latest developments in spatial analytics, from AI-powered location intelligence to real-time processing capabilities.',
    category: 'Analytics',
    date: 'February 28, 2026',
    readTime: '6 min read',
    content: `
      <p>The geospatial analytics landscape is evolving rapidly, driven by advances in artificial intelligence, cloud computing, and data processing technologies. Here are the key trends shaping the industry in 2026.</p>

      <h2>AI-Powered Spatial Intelligence</h2>
      <p>Machine learning models are now being routinely applied to spatial data for pattern recognition, prediction, and automated decision-making. Applications include:</p>
      <ul>
        <li>Predictive maintenance for infrastructure assets</li>
        <li>Automated feature extraction from satellite imagery</li>
        <li>Dynamic routing and logistics optimization</li>
        <li>Risk modeling for insurance and financial services</li>
      </ul>

      <h2>Real-Time Processing at Scale</h2>
      <p>Organizations are moving beyond batch processing to real-time spatial analytics. This enables use cases like live traffic management, emergency response coordination, and dynamic resource allocation.</p>

      <h2>The Rise of Spatial Data Science</h2>
      <p>Data science teams are increasingly incorporating spatial analysis into their workflows, using tools like Python's GeoPandas and Apache Sedona for distributed spatial computing.</p>

      <p>These trends are democratizing access to location intelligence and enabling organizations to extract more value from their spatial data assets.</p>
    `
  },
  'asset-management-gis': {
    title: 'Transforming Asset Management with Location Intelligence',
    excerpt: 'Discover how spatial data platforms are revolutionizing infrastructure asset management and maintenance planning.',
    category: 'Case Study',
    date: 'February 20, 2026',
    readTime: '10 min read',
    content: `
      <p>Infrastructure asset management is being transformed by location intelligence and spatial data platforms. Organizations managing extensive physical assets - from utilities to transportation networks - are discovering new efficiencies and insights.</p>

      <h2>The Asset Management Challenge</h2>
      <p>Traditional asset management systems often lack spatial context, making it difficult to:</p>
      <ul>
        <li>Visualize asset relationships and dependencies</li>
        <li>Optimize maintenance routing and scheduling</li>
        <li>Analyze spatial patterns in asset performance</li>
        <li>Plan capital projects in geographic context</li>
      </ul>

      <h2>Spatial Data Platform Benefits</h2>
      <p>Modern spatial platforms provide comprehensive solutions that integrate asset data with location intelligence, enabling better decision-making across the asset lifecycle.</p>

      <p>Organizations implementing these solutions typically see significant improvements in operational efficiency, cost reduction, and service reliability.</p>
    `
  }
}

const post = posts[slug] || {
  title: 'Post Not Found',
  excerpt: 'The requested blog post could not be found.',
  category: 'Error',
  date: '',
  readTime: '',
  content: '<p>The requested blog post could not be found. Please return to the <a href="/blog">blog index</a>.</p>'
}

useSeoMeta({
  title: `${post.title} - Heenco`,
  description: post.excerpt
})
</script>

<style scoped>
.blog-post {
  min-height: 100vh;
  padding: 3rem 0 6rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Back Link */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 2.5rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #1f2937;
}

.back-arrow {
  font-size: 1.2rem;
}

/* Post Header */
.post-header {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid rgba(31, 41, 55, 0.08);
}

.post-header__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.separator {
  color: #cbd5e1;
}

.post-header__date {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.post-header__title {
  font-family: 'Inter', sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1.25rem;
  color: #111827;
  letter-spacing: -0.02em;
}

.post-header__excerpt {
  font-size: 1.2rem;
  color: #475569;
  line-height: 1.7;
  font-weight: 400;
}

/* Post Content */
.post-content {
  font-size: 1.05rem;
  line-height: 1.8;
  color: #334155;
}

.post-content :deep(h2) {
  font-family: 'Inter', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.post-content :deep(h3) {
  font-size: 1.4rem;
  font-weight: 600;
  color: #1e293b;
  margin-top: 2rem;
  margin-bottom: 0.875rem;
  line-height: 1.4;
}

.post-content :deep(p) {
  margin-bottom: 1.5rem;
}

.post-content :deep(ul),
.post-content :deep(ol) {
  margin-bottom: 1.5rem;
  padding-left: 1.75rem;
}

.post-content :deep(li) {
  margin-bottom: 0.625rem;
  line-height: 1.7;
}

.post-content :deep(strong) {
  font-weight: 600;
  color: #1e293b;
}

.post-content :deep(a) {
  color: #374151;
  text-decoration: none;
  border-bottom: 1px solid rgba(55, 65, 81, 0.3);
  transition: border-color 0.2s ease;
}

.post-content :deep(a:hover) {
  border-bottom-color: #1f2937;
}

/* Badge */
.badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  color: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.read-time {
  font-size: 0.9rem;
  color: #94a3b8;
  font-weight: 500;
}

/* Post Footer */
.post-footer {
  margin-top: 4rem;
  padding-top: 2rem;
}

.post-footer__divider {
  height: 2px;
  background: linear-gradient(to right, transparent, rgba(31, 41, 55, 0.08), transparent);
  margin-bottom: 2rem;
}

.post-footer__back {
  display: inline-block;
  color: #374151;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s ease;
}

.post-footer__back:hover {
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .blog-post {
    padding: 2rem 0 4rem;
  }

  .post-header__title {
    font-size: 1.75rem;
  }

  .post-header__excerpt {
    font-size: 1.05rem;
  }

  .post-content {
    font-size: 1rem;
  }

  .post-content :deep(h2) {
    font-size: 1.5rem;
    margin-top: 2rem;
  }

  .post-content :deep(h3) {
    font-size: 1.25rem;
  }
}
</style>
