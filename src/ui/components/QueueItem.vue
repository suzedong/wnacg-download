<template>
  <div class="queue-item">
    <span class="queue-index">{{ index + 1 }}</span>
    <img :src="comic.coverUrl" :alt="comic.title" class="queue-cover" />
    <div class="queue-info">
      <h4>{{ comic.title }}</h4>
      <p>{{ comic.category }}</p>
    </div>
    <button @click="handleRemove" class="remove-btn" :disabled="disabled">×</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  comic: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['remove']);

const handleRemove = () => {
  emit('remove', props.index);
};
</script>

<style scoped>
.queue-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 10px;
  transition: background 0.3s;
}

.queue-item:hover {
  background: #e9ecef;
}

.queue-index {
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.queue-cover {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.queue-info {
  flex: 1;
}

.queue-info h4 {
  margin: 0 0 0.3rem 0;
  font-size: 0.95rem;
  color: #333;
}

.queue-info p {
  margin: 0;
  font-size: 0.8rem;
  color: #888;
}

.remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #ff4757;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.remove-btn:hover:not(:disabled) {
  background: #ff3838;
}

.remove-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
