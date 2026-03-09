// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    optimizeDeps: {
      // duckdb-wasm ships its own WASM bundles — don't let Vite pre-bundle it
      exclude: ['@duckdb/duckdb-wasm'],
    },
  },
  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt'
  ],
  shadcn: {
    prefix: 'U',
    componentDir: './app/components/ui'
  },
  runtimeConfig: {
    public: {
      mapboxToken: process.env.NUXT_PUBLIC_MAPBOX_TOKEN,
      upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL,
      upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    }
  },
  app: {
    head: {
      title: 'Heenco - Geographic Intelligence',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Heenco transforms raw geospatial data into actionable insights for modern organizations.' }
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&display=swap'
        }
      ]
    }
  }
})
