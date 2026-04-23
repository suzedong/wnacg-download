<template>
  <header class="header">
    <div class="header-left">
      <button class="back-btn" @click="handleBack">←</button>
      <h1>🎨 WNACG Downloader</h1>
    </div>
    <nav>
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="handleTabChange(tab.id)"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </nav>
  </header>
</template>

<script setup>
const props = defineProps({
  activeTab: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['tab-change', 'back']);

const tabs = [
  { id: 'search', label: '搜索', icon: '🔍' },
  { id: 'compare', label: '对比', icon: '📊' },
  { id: 'download', label: '下载', icon: '⬇️' },
  { id: 'config', label: '配置', icon: '⚙️' },
];

const handleTabChange = (tabId) => {
  emit('tab-change', tabId);
};

const handleBack = () => {
  emit('back');
};
</script>

<style scoped>
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  background: transparent;
  color: #555;
  border: 2px solid #e0e0e0;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.back-btn:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

nav {
  display: flex;
  gap: 0.5rem;
}

nav button {
  background: transparent;
  color: #555;
  border: 2px solid transparent;
  padding: 0.6rem 1.2rem;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

nav button:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

nav button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}
</style>
