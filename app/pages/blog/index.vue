<template>
  <main class="blog-page">
    <div class="container">
      <!-- Blog Header -->
      <header class="blog-header">
        <h1 class="blog-header__title">Insights & Analysis</h1>
        <p class="blog-header__subtitle">
          Expert perspectives on spatial intelligence, geospatial technology, and location-based analytics
        </p>
      </header>

      <!-- Featured Article -->
      <article v-if="featuredPost" class="featured-article">
        <NuxtLink :to="`/blog/${featuredPost.slug}`" class="featured-article__link">
          <div class="featured-article__content">
            <div class="featured-article__meta">
              <span class="badge">{{ featuredPost.category }}</span>
              <span class="featured-article__date">{{ featuredPost.date }}</span>
            </div>
            <h2 class="featured-article__title">{{ featuredPost.title }}</h2>
            <p class="featured-article__excerpt">{{ featuredPost.excerpt }}</p>
            <div class="featured-article__footer">
              <span class="read-time">{{ featuredPost.readTime }}</span>
            </div>
          </div>
        </NuxtLink>
      </article>

      <!-- Blog Grid -->
      <section class="blog-grid">
        <article v-for="post in posts" :key="post.slug" class="blog-card">
          <NuxtLink :to="`/blog/${post.slug}`" class="blog-card__link">
            <div class="blog-card__content">
              <div class="blog-card__meta">
                <span class="badge badge--small">{{ post.category }}</span>
                <span class="blog-card__date">{{ post.date }}</span>
              </div>
              <h3 class="blog-card__title">{{ post.title }}</h3>
              <p class="blog-card__excerpt">{{ post.excerpt }}</p>
              <div class="blog-card__footer">
                <span class="read-time">{{ post.readTime }}</span>
              </div>
            </div>
          </NuxtLink>
        </article>
      </section>
    </div>
  </main>
</template>

<script setup>
// Sample blog posts data - replace with API/CMS in production
const featuredPost = {
  slug: 'spatial-data-infrastructure',
  title: 'Building Modern Spatial Data Infrastructure for Enterprise Scale',
  excerpt: 'How leading organizations are transforming their geospatial capabilities by implementing cloud-native spatial data platforms that integrate seamlessly with existing enterprise systems.',
  category: 'Infrastructure',
  date: 'March 1, 2026',
  readTime: '8 min read'
}

const posts = [
  {
    slug: 'geospatial-analytics-trends',
    title: 'Emerging Trends in Geospatial Analytics for 2026',
    excerpt: 'Exploring the latest developments in spatial analytics, from AI-powered location intelligence to real-time processing capabilities.',
    category: 'Analytics',
    date: 'February 28, 2026',
    readTime: '6 min read'
  },
  {
    slug: 'asset-management-gis',
    title: 'Transforming Asset Management with Location Intelligence',
    excerpt: 'Discover how spatial data platforms are revolutionizing infrastructure asset management and maintenance planning.',
    category: 'Case Study',
    date: 'February 20, 2026',
    readTime: '10 min read'
  },
  {
    slug: 'digital-twin-cities',
    title: 'Digital Twins: The Future of Urban Planning',
    excerpt: 'How cities are leveraging digital twin technology and spatial data to improve decision-making and service delivery.',
    category: 'Innovation',
    date: 'February 15, 2026',
    readTime: '7 min read'
  },
  {
    slug: 'spatial-data-quality',
    title: 'Ensuring Spatial Data Quality in Enterprise Systems',
    excerpt: 'Best practices for maintaining high-quality geospatial data across distributed enterprise environments.',
    category: 'Best Practices',
    date: 'February 10, 2026',
    readTime: '5 min read'
  },
  {
    slug: 'open-source-gis-tools',
    title: 'Open Source GIS Tools for Modern Workflows',
    excerpt: 'A comprehensive guide to leveraging open-source geospatial technologies in enterprise environments.',
    category: 'Technology',
    date: 'February 5, 2026',
    readTime: '9 min read'
  },
  {
    slug: 'cloud-native-geospatial',
    title: 'Cloud-Native Architectures for Geospatial Applications',
    excerpt: 'Why cloud-native approaches are essential for scalable, performant spatial data systems.',
    category: 'Architecture',
    date: 'January 28, 2026',
    readTime: '8 min read'
  }
]

useSeoMeta({
  title: 'Blog - Heenco',
  description: 'Expert insights on spatial intelligence, geospatial technology, and location-based analytics'
})
</script>

<style scoped>
.blog-page {
  min-height: 100vh;
  padding: 4rem 0 6rem;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Blog Header */
.blog-header {
  text-align: center;
  margin-bottom: 4rem;
  padding-bottom: 2rem;
}

.blog-header__title {
  font-family: 'Inter', sans-serif;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  margin-bottom: 1rem;
  color: #111827;
  letter-spacing: -0.02em;
}

.blog-header__subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  color: #6b7280;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.7;
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* Featured Article */
.featured-article {
  margin-bottom: 4rem;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border: 1px solid rgba(31, 41, 55, 0.08);
  transition: all 0.3s ease;
}

.featured-article:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(31, 41, 55, 0.1);
  border-color: rgba(55, 65, 81, 0.3);
}

.featured-article__link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.featured-article__content {
  padding: 3rem;
}

.featured-article__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.featured-article__date {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.featured-article__title {
  font-family: 'Inter', sans-serif;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 700;
  margin-bottom: 1rem;
  color: #111827;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.featured-article__excerpt {
  font-size: 1.1rem;
  color: #475569;
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

.featured-article__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Blog Grid */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.blog-card {
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(31, 41, 55, 0.08);
  transition: all 0.3s ease;
  overflow: hidden;
}

.blog-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(31, 41, 55, 0.08);
  border-color: rgba(55, 65, 81, 0.3);
}

.blog-card__link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.blog-card__content {
  padding: 2rem;
}

.blog-card__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.blog-card__date {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
}

.blog-card__title {
  font-family: 'Inter', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #111827;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.blog-card__excerpt {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.blog-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
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

.badge--small {
  padding: 0.3rem 0.75rem;
  font-size: 0.75rem;
}

.read-time {
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .blog-page {
    padding: 2rem 0 4rem;
  }

  .blog-header {
    margin-bottom: 2.5rem;
  }

  .featured-article__content {
    padding: 2rem;
  }

  .blog-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .blog-card__content {
    padding: 1.5rem;
  }
}
</style>
