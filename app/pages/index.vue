<template>
  <main>
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <div class="hero__branding">
          <HeencoLogo class="hero__logo" />
        </div>
        <p class="hero__subtitle">
          Designing and delivering scalable spatial data platforms, analytics, and digital infrastructure to support planning, asset management, and decision making.
        </p>
        <p class="hero__description">
          We help organizations unlock the value of spatial data by building modern geospatial systems, integrating enterprise data, and delivering actionable spatial insights.
        </p>
      </div>
    </section>

    <!-- Spacer Section -->
    <section class="spacer-section">
      <div class="container">
        <div class="spacer-content">
          <p class="spacer-text">Scroll to explore our capabilities</p>
        </div>
      </div>
    </section>

  </main>
</template>

<script setup>
import HeencoLogo from '~/components/ui/HeencoLogo.vue'
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Hero Section */
.hero {
  padding: 8rem 2rem 6rem;
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  background: 
    linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 80px,
      rgba(209, 213, 219, 0.15) 80px,
      rgba(209, 213, 219, 0.15) 81px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 80px,
      rgba(209, 213, 219, 0.15) 80px,
      rgba(209, 213, 219, 0.15) 81px
    ),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 113px,
      rgba(209, 213, 219, 0.08) 113px,
      rgba(209, 213, 219, 0.08) 114px
    );
  background-size: 100% 100%, 80px 80px, 80px 80px, 113px 113px;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(75, 85, 99, 0.03) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -5%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(55, 65, 81, 0.02) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero .container {
  position: relative;
  z-index: 1;
}

.hero__branding {
  margin-bottom: 3rem;
  animation: fadeInUp 0.8s ease-out;
}

.hero__logo {
  filter: drop-shadow(0 4px 12px rgba(55, 65, 81, 0.12));
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero__subtitle {
  font-family: var(--font-family);
  font-size: clamp(1.1rem, 2.2vw, 1.35rem);
  color: #6b7280;
  max-width: 750px;
  margin: 0 auto 2rem;
  line-height: 1.65;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.hero__description {
  font-family: var(--font-family);
  font-size: clamp(0.95rem, 1.8vw, 1.1rem);
  color: #9ca3af;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.7;
  font-weight: 400;
  letter-spacing: -0.01em;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero {
    min-height: 65vh;
    padding: 4rem 2rem 3rem;
  }
}

/* Spacer Section */
.spacer-section {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    linear-gradient(rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.98)),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 80px,
      rgba(209, 213, 219, 0.1) 80px,
      rgba(209, 213, 219, 0.1) 81px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 80px,
      rgba(209, 213, 219, 0.1) 80px,
      rgba(209, 213, 219, 0.1) 81px
    );
  background-size: 100% 100%, 80px 80px, 80px 80px;
}

.spacer-content {
  text-align: center;
}

.spacer-text {
  font-family: var(--font-family);
  font-size: 0.9rem;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  animation: fadeInOut 2s ease-in-out infinite;
}

@keyframes fadeInOut {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
</style>
