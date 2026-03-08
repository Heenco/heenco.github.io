<template>
  <input
    :class="[
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-sans',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      '[appearance:textfield] [&::-webkit-inner-spin-button]:opacity-40 [&::-webkit-outer-spin-button]:opacity-40',
      props.class,
    ]"
    v-model="model"
    v-bind="$attrs"
  />
</template>

<script setup>
defineOptions({ inheritAttrs: false })
const model = defineModel()
const props = defineProps({
  class: { type: String, default: '' },
})
</script>
