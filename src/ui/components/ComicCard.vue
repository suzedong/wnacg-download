<template>
  <div class="comic-card" :class="{ selected: selected }">
    <div class="comic-cover-container" v-if="showCheckbox">
      <img :src="comic.coverUrl" :alt="comic.title" class="comic-cover" />
      <input type="checkbox" class="comic-checkbox" :checked="selected" @change="handleSelect" />
    </div>
    <img v-else :src="comic.coverUrl" :alt="comic.title" class="comic-cover" />
    <div class="comic-info">
      <h3 class="comic-title" :title="comic.title">{{ comic.title }}</h3>
      <p class="comic-category">{{ comic.category }}</p>
      <div class="comic-actions" v-if="showActions">
        <a :href="comic.url" target="_blank" class="comic-link">查看详情</a>
        <button @click="handleDownload" class="small-btn">下载</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  comic: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  showCheckbox: {
    type: Boolean,
    default: false,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['select', 'download']);

const handleSelect = () => {
  emit('select', props.comic);
};

const handleDownload = () => {
  emit('download', props.comic);
};
</script>

<style scoped>
.comic-card {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.comic-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.comic-card.selected {
  border: 3px solid #667eea;
}

.comic-cover-container {
  position: relative;
}

.comic-cover {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.comic-checkbox {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.comic-info {
  padding: 1.2rem;
}

.comic-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  line-height: 1.4;
  color: #333;
  height: 2.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.comic-category {
  margin: 0 0 1rem 0;
  font-size: 0.8rem;
  color: #888;
}

.comic-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.comic-link {
  color: #667eea;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
}

.comic-link:hover {
  text-decoration: underline;
}

.small-btn {
  padding: 0.4rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}
</style>
