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
      <button class="theme-toggle" @click="cycleTheme">
        <span class="nav-icon">{{ themeIcon }}</span>
        <span class="nav-text">{{ themeLabel }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useConfig } from '../composables/useConfig';

const props = defineProps({
  currentView: {
    type: String,
    default: 'search',
  },
});

const emit = defineEmits(['view-change']);

const { config, loadConfig, saveConfig } = useConfig();
// theme 可选值：'light' | 'dark' | 'auto'
const themeMode = ref('auto');
// 实际解析后的暗色状态
const isDark = ref(false);
// 系统主题监听器
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const navItems = [
  { id: 'search', icon: '🔍', label: '搜索' },
  { id: 'compare', icon: '📊', label: '对比' },
  { id: 'download', icon: '⬇️', label: '下载' },
  { id: 'config', icon: '⚙️', label: '配置' },
];

function selectView(viewId) {
  emit('view-change', viewId);
}

// 根据系统主题更新实际暗色状态
function applySystemTheme() {
  isDark.value = systemThemeQuery.matches;
  document.documentElement.setAttribute(
    'data-theme',
    isDark.value ? 'dark' : 'light'
  );
}

// 应用当前主题模式
function applyTheme() {
  if (themeMode.value === 'auto') {
    applySystemTheme();
  } else {
    isDark.value = themeMode.value === 'dark';
    document.documentElement.setAttribute(
      'data-theme',
      isDark.value ? 'dark' : 'light'
    );
  }
}

// 系统主题变化回调
function onSystemThemeChange(e) {
  if (themeMode.value === 'auto') {
    isDark.value = e.matches;
    document.documentElement.setAttribute(
      'data-theme',
      isDark.value ? 'dark' : 'light'
    );
  }
}

// 切换主题：auto → dark → light → auto 循环
async function cycleTheme() {
  if (themeMode.value === 'auto') {
    themeMode.value = 'dark';
  } else if (themeMode.value === 'dark') {
    themeMode.value = 'light';
  } else {
    themeMode.value = 'auto';
  }
  applyTheme();

  if (config.value) {
    config.value.theme = themeMode.value;
    await saveConfig(config.value);
  }
}

// 按钮图标
const themeIcon = computed(() => {
  if (themeMode.value === 'auto') return '🖥️';
  return isDark.value ? '☀️' : '🌙';
});

// 按钮文字
const themeLabel = computed(() => {
  if (themeMode.value === 'auto') return '跟随系统';
  return isDark.value ? '亮色' : '暗色';
});

onMounted(async () => {
  await loadConfig();
  if (config.value) {
    themeMode.value = config.value.theme || 'auto';
  }
  applyTheme();

  systemThemeQuery.addEventListener('change', onSystemThemeChange);
});
</script>

<style scoped>
.sidebar {
  width: 200px;
  height: 100%;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
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
