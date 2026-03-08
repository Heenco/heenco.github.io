<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium font-sans cursor-pointer transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size],
      props.class,
    ]"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup>
const props = defineProps({
  variant: { type: String, default: 'default' },
  size:    { type: String, default: 'default' },
  class:   { type: String, default: '' },
})

const variantClasses = {
  default:     'bg-primary text-primary-foreground hover:bg-primary/90',
  primary:     'bg-primary text-primary-foreground font-bold hover:bg-primary/90',
  outline:     'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost:       'hover:bg-accent hover:text-accent-foreground',
  secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm:      'h-9 px-3 text-xs',
  lg:      'h-11 px-8',
  icon:    'h-10 w-10',
}
</script>
