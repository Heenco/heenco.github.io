<template>
  <div class="heenco-logo" role="img" aria-label="HEENCO - Location Intelligence Lab">
    <div class="heenco-logo__row">
      <span class="heenco-logo__mark" aria-hidden="true">
        <span class="heenco-logo__orbit heenco-logo__orbit--1"></span>
        <span class="heenco-logo__orbit heenco-logo__orbit--2"></span>
        <span class="heenco-logo__core"></span>
      </span>
      <p class="heenco-logo__wordmark">HEENCO</p>
    </div>
    <p class="heenco-logo__motto">Location Intelligence Lab</p>
  </div>
</template>

<style scoped>
.heenco-logo {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.heenco-logo__row {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
}

.heenco-logo__mark {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 999px;
  position: relative;
  background: linear-gradient(135deg, #374151 0%, #4b5563 50%, #6b7280 100%);
  box-shadow: 
    0 8px 24px rgba(55, 65, 81, 0.25),
    0 4px 8px rgba(55, 65, 81, 0.15),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% {
    box-shadow: 
      0 8px 24px rgba(55, 65, 81, 0.25),
      0 4px 8px rgba(55, 65, 81, 0.15),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 12px 32px rgba(55, 65, 81, 0.35),
      0 6px 12px rgba(75, 85, 99, 0.25),
      inset 0 2px 4px rgba(255, 255, 255, 0.3);
  }
}

.heenco-logo__orbit {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  animation: rotate 20s linear infinite;
}

.heenco-logo__orbit--1 {
  transform: rotate(22deg) scale(0.78, 0.54);
  animation: rotate1 25s linear infinite;
}

.heenco-logo__orbit--2 {
  transform: rotate(-26deg) scale(0.62, 0.9);
  animation: rotate2 30s linear infinite;
}

@keyframes rotate1 {
  from { transform: rotate(22deg) scale(0.78, 0.54); }
  to { transform: rotate(382deg) scale(0.78, 0.54); }
}

@keyframes rotate2 {
  from { transform: rotate(-26deg) scale(0.62, 0.9); }
  to { transform: rotate(334deg) scale(0.62, 0.9); }
}

.heenco-logo__core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.65rem;
  height: 0.65rem;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: linear-gradient(135deg, #f9fafb, #e5e7eb);
  box-shadow: 
    0 0 0 3px rgba(107, 114, 128, 0.35),
    0 0 12px rgba(75, 85, 99, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 
      0 0 0 3px rgba(107, 114, 128, 0.35),
      0 0 12px rgba(75, 85, 99, 0.4),
      inset 0 1px 2px rgba(255, 255, 255, 0.8);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 
      0 0 0 5px rgba(107, 114, 128, 0.45),
      0 0 20px rgba(75, 85, 99, 0.6),
      inset 0 1px 2px rgba(255, 255, 255, 0.9);
  }
}

.heenco-logo__wordmark {
  margin: 0;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
  background: linear-gradient(135deg, #111827 0%, #374151 50%, #4b5563 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-transform: uppercase;
  position: relative;
}

.heenco-logo__motto {
  margin: 0;
  font-family: "Inter", sans-serif;
  font-size: clamp(0.75rem, 1.8vw, 1rem);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b7280;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(107, 114, 128, 0.2);
}

@media (max-width: 768px) {
  .heenco-logo__row {
    gap: 0.8rem;
  }

  .heenco-logo__mark {
    width: 2.8rem;
    height: 2.8rem;
  }

  .heenco-logo__core {
    width: 0.55rem;
    height: 0.55rem;
  }

  .heenco-logo__motto {
    letter-spacing: 0.16em;
  }
}
</style>
