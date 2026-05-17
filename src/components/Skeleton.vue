<template>
  <div class="skeleton" :style="{ width, height }">
    <div class="skeleton-block"></div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '16px',
  },
});
</script>

<style scoped>
.skeleton {
  display: inline-block;
  border-radius: 4px;
  overflow: hidden;
}

.skeleton-block {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--bg-primary) 25%,
    var(--border-color) 50%,
    var(--bg-primary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
