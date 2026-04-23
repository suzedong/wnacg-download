<template>
  <div class="stat-card" :class="variant">
    <span class="stat-number">{{ number }}</span>
    <span class="stat-label">{{ label }}</span>
  </div>
</template>

<script setup>
const props = defineProps({
  number: {
    type: [Number, String],
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'to-download', 'already-have'].includes(value),
  },
});
</script>

<style scoped>
.stat-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.stat-card.to-download {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-card.already-have {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.stat-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.9;
}
</style>
