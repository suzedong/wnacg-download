<template>
  <div class="download-progress" :class="status">
    <div class="progress-header">
      <span class="comic-title">{{ comicTitle }}</span>
      <span class="progress-status" :class="status">
        {{ statusText }}
      </span>
    </div>

    <div class="progress-bar-container">
      <div 
        class="progress-bar" 
        :style="{ width: progressPercent + '%' }"
      >
        <span class="progress-percent">{{ progressPercent.toFixed(1) }}%</span>
      </div>
    </div>

    <div class="progress-details">
      <span class="detail-item">
        📄 {{ downloaded }}/{{ total }} 页
      </span>
      <span class="detail-item" v-if="speed > 0">
        ⚡ {{ speed }} 页/秒
      </span>
      <span class="detail-item" v-if="remainingTime > 0">
        ⏱️ 剩余 {{ formatTime(remainingTime) }}
      </span>
    </div>

    <div v-if="error" class="error-message">
      ❌ {{ error }}
    </div>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
  comicTitle: {
    type: String,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  downloaded: {
    type: Number,
    default: 0,
  },
  speed: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: 'pending',
    validator: (value) => [
      'pending',
      'fetching',
      'downloading',
      'completed',
      'failed'
    ].includes(value),
  },
  error: {
    type: String,
    default: '',
  },
});

// 计算进度百分比
const progressPercent = computed(() => {
  if (props.total === 0) return 0;
  return (props.downloaded / props.total) * 100;
});

// 计算剩余时间（秒）
const remainingTime = computed(() => {
  if (props.speed <= 0 || props.downloaded >= props.total) return 0;
  const remaining = props.total - props.downloaded;
  return Math.ceil(remaining / props.speed);
});

// 状态文本
const statusText = computed(() => {
  const statusMap = {
    pending: '等待中',
    fetching: '获取信息中',
    downloading: '下载中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[props.status] || props.status;
});

// 格式化时间
const formatTime = (seconds) => {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs}秒`;
};
</script>

<style scoped>
.download-progress {
  background: rgba(255, 255, 255, 0.95);
  padding: 1.2rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  transition: all 0.3s;
}

.download-progress.pending {
  border-left: 4px solid #999;
}

.download-progress.fetching {
  border-left: 4px solid #409eff;
}

.download-progress.downloading {
  border-left: 4px solid #667eea;
}

.download-progress.completed {
  border-left: 4px solid #67c23a;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2f1 100%);
}

.download-progress.failed {
  border-left: 4px solid #f56c6c;
  background: linear-gradient(135deg, #fef0f0 0%, #ffe6e6 100%);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.comic-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.progress-status {
  font-size: 0.85rem;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-weight: 500;
}

.progress-status.pending {
  background: #f0f0f0;
  color: #666;
}

.progress-status.fetching {
  background: #e6f3ff;
  color: #409eff;
}

.progress-status.downloading {
  background: #e6f0ff;
  color: #667eea;
}

.progress-status.completed {
  background: #f0f9ff;
  color: #67c23a;
}

.progress-status.failed {
  background: #fef0f0;
  color: #f56c6c;
}

.progress-bar-container {
  width: 100%;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0.8rem;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  min-width: 2%;
}

.progress-percent {
  font-size: 0.75rem;
  color: white;
  font-weight: 600;
  white-space: nowrap;
}

.progress-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 0.85rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.error-message {
  margin-top: 0.8rem;
  padding: 0.6rem;
  background: #fee;
  color: #c33;
  border-radius: 6px;
  font-size: 0.85rem;
  border-left: 3px solid #c33;
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.download-progress.downloading .progress-bar {
  animation: pulse 2s infinite;
}
</style>
