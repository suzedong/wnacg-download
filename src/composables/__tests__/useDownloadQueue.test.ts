import { describe, it, expect, beforeEach } from 'vitest';
import { useDownloadQueue } from '../useDownloadQueue';
import type { DownloadTask } from '../../types';

describe('useDownloadQueue', () => {
  beforeEach(() => {
    const { clearQueue } = useDownloadQueue();
    clearQueue();
  });

  function createTask(overrides: Partial<DownloadTask> = {}): DownloadTask {
    return {
      aid: '1',
      title: 'Test Comic',
      url: 'https://example.com',
      cover_url: 'https://example.com/cover.jpg',
      save_path: '/comics',
      pages: 10,
      ...overrides,
    };
  }

  it('should add a single task to queue', () => {
    const { addToQueue, getQueueLength } = useDownloadQueue();
    addToQueue(createTask({ aid: '1' }));
    expect(getQueueLength()).toBe(1);
  });

  it('should add multiple tasks to queue', () => {
    const { addToQueue, getQueueLength } = useDownloadQueue();
    addToQueue([
      createTask({ aid: '1' }),
      createTask({ aid: '2' }),
      createTask({ aid: '3' }),
    ]);
    expect(getQueueLength()).toBe(3);
  });

  it('should deduplicate tasks by aid', () => {
    const { addToQueue, getQueueLength } = useDownloadQueue();
    addToQueue(createTask({ aid: '1' }));
    addToQueue(createTask({ aid: '1' }));
    expect(getQueueLength()).toBe(1);
  });

  it('should return count of newly added tasks', () => {
    const { addToQueue } = useDownloadQueue();
    const added = addToQueue([
      createTask({ aid: '1' }),
      createTask({ aid: '2' }),
      createTask({ aid: '3' }), // 不同的 aid，都算新增
    ]);
    expect(added).toBe(3);
  });

  it('should remove task by aid', () => {
    const { addToQueue, removeFromQueue, getQueueLength } = useDownloadQueue();
    addToQueue(createTask({ aid: '1' }));
    removeFromQueue('1');
    expect(getQueueLength()).toBe(0);
  });

  it('should handle removing non-existent aid', () => {
    const { addToQueue, removeFromQueue, getQueueLength } = useDownloadQueue();
    addToQueue(createTask({ aid: '1' }));
    removeFromQueue('999');
    expect(getQueueLength()).toBe(1);
  });

  it('should clear the entire queue', () => {
    const { addToQueue, clearQueue, getQueueLength } = useDownloadQueue();
    addToQueue([
      createTask({ aid: '1' }),
      createTask({ aid: '2' }),
    ]);
    clearQueue();
    expect(getQueueLength()).toBe(0);
  });

  it('should return queue reference', () => {
    const { addToQueue, getQueue } = useDownloadQueue();
    addToQueue(createTask({ aid: '1' }));
    const queue = getQueue();
    expect(queue.value.length).toBe(1);
    expect(queue.value[0].aid).toBe('1');
  });
});
