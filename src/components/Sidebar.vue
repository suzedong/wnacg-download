<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.id"
        :class="['nav-item', { active: currentView === item.id }]"
        @click="selectView(item.id)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.label }}</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-toggle" @click="toggleTheme">
        <span class="nav-icon">{{ isDark ? '☀️' : '🌙' }}</span>
        <span class="nav-text">{{ isDark ? '亮色' : '暗色' }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useConfig } from '../composables/useConfig';

const props = defineProps({
  currentView: {
    type: String,
    default: 'search',
  },
});

const emit = defineEmits(['view-change']);

const { config, loadConfig, saveConfig } = useConfig();
const isDark = ref(false);

const navItems = [
  { id: 'search', icon: '🔍', label: '搜索' },
  { id: 'compare', icon: '📊', label: '对比' },
  { id: 'download', icon: '⬇️', label: '下载' },
  { id: 'config', icon: '⚙️', label: '配置' },
];

function selectView(viewId) {
  emit('view-change', viewId);
}

async function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');

  if (config.value) {
    config.value.theme = isDark.value ? 'dark' : 'light';
    await saveConfig(config.value);
  }
}

onMounted(async () => {
  await loadConfig();
  if (config.value) {
    isDark.value = config.value.theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
  }
});
</script>

<style scoped>
.sidebar {
  width: 200px;
  height: 100vh;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}

.nav-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.nav-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.nav-icon {
  font-size: 20px;
  margin-right: 12px;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px 0;
  border-top: 1px solid var(--border-color);
}

.theme-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
}

.theme-toggle:hover {
  background: rgba(102, 126, 234, 0.1);
}
</style>
