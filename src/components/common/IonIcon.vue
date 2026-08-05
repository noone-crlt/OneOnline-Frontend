<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 20
  },
  color: {
    type: String,
    default: null
  }
})

const sizePx = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <span
    class="ion-icon-component"
    :style="{
      width: sizePx,
      height: sizePx,
      color: color || 'inherit',
      WebkitMaskImage: `url(&quot;${icon}&quot;)`,
      maskImage: `url(&quot;${icon}&quot;)`
    }"
  ></span>
</template>

<style scoped>
.ion-icon-component {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}
</style>
