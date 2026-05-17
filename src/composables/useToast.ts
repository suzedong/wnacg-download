// Toast 通知组合式函数

import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number; // 自动消失时间（ms），0 表示不自动消失
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

export function useToast() {
  function add(message: string, type: Toast['type'] = 'info', duration = 4000) {
    const id = nextId++;
    const toast: Toast = { id, message, type, duration };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
  }

  function remove(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  function success(message: string, duration = 3000) {
    add(message, 'success', duration);
  }

  function error(message: string, duration = 6000) {
    add(message, 'error', duration);
  }

  function info(message: string, duration = 4000) {
    add(message, 'info', duration);
  }

  return { toasts, add, remove, success, error, info };
}
