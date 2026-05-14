<template>
  <div class="compare-view">
    <h2>📊 对比本地漫画</h2>

    <div v-if="!hasSearchResult" class="setup-section">
      <div class="setup-form">
        <div class="form-group">
          <label>选择搜索缓存文件</label>
          <div class="input-group">
            <select v-model="searchFile" class="select-input">
              <option value="" disabled>请选择搜索缓存文件</option>
              <option
                v-for="file in cacheFiles"
                :key="file.path"
                :value="file.path"
              >
                {{ file.label }}
              </option>
            </select>
            <button class="btn-secondary" @click="loadCacheFiles">
              🔄 刷新
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>选择本地漫画文件夹</label>
          <div class="input-group">
            <input
              v-model="localPath"
              type="text"
              placeholder="输入文件夹路径或 SMB 地址..."
            />
            <button class="btn-secondary" @click="browseLocalPath">
              📁 浏览
            </button>
          </div>
        </div>

        <button
          class="btn-primary"
          :disabled="isComparing || !searchFile || !localPath"
          @click="handleCompare"
        >
          {{ isComparing ? '对比中...' : '🔍 开始对比' }}
        </button>

        <div class="divider"></div>

        <div class="form-group">
          <label>📜 历史对比结果</label>
          <div class="history-list" v-if="compareHistoryFiles.length > 0">
            <div
              v-for="file in compareHistoryFiles"
              :key="file.path"
              class="history-item"
              :class="{ active: selectedHistoryFile === file.path }"
              @click="selectHistoryFile(file.path)"
            >
              <span class="history-keyword">{{ file.label }}</span>
              <button
                class="btn-delete"
                @click.stop="showDeleteConfirm(file.path)"
              >
                删除
              </button>
            </div>
          </div>
          <div v-else class="history-empty">
            <span>暂无历史对比记录</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div
      v-if="showDeleteConfirmModal"
      class="modal-overlay"
      @click="cancelDelete"
    >
      <div class="confirm-dialog" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除这条对比历史吗？</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="cancelDelete">取消</button>
          <button class="btn-confirm-delete" @click="executeDelete">
            确定
          </button>
        </div>
      </div>
    </div>

    <div v-if="isComparing" class="ai-streaming-section">
      <div class="ai-streaming-header">
        <span class="ai-icon">🤖</span>
        <span class="ai-label">AI 匹配中</span>
      </div>

      <!-- 状态日志 -->
      <div v-if="aiLog.length > 0" class="ai-log">
        <div
          v-for="(log, index) in aiLog"
          :key="index"
          class="ai-log-line"
        >
          {{ log }}
        </div>
      </div>

      <!-- 流式内容显示 -->
      <div v-if="aiStreamingContent" class="ai-streaming-content">
        <div class="streaming-label">流式输出：</div>
        <pre class="streaming-text">{{ aiStreamingContent }}</pre>
      </div>

      <!-- 等待中动画 -->
      <div v-if="aiLog.length === 0 && !aiStreamingContent" class="ai-waiting">
        <div class="spinner"></div>
        <span>正在初始化 AI 匹配...</span>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <div v-if="error.includes('SMB')" class="smb-help">
        <p><strong>macOS SMB 网络路径使用说明：</strong></p>
        <ol>
          <li>打开 Finder</li>
          <li>
            按
            <kbd>Cmd + K</kbd>
            （或点击「前往」→「连接服务器」）
          </li>
          <li>
            输入
            <code>smb://192.168.21.100/Comic</code>
          </li>
          <li>
            连接成功后，共享会挂载到
            <code>/Volumes/Comic/</code>
          </li>
          <li>
            重新选择
            <code>/Volumes/Comic/Type-90</code>
            路径
          </li>
        </ol>
      </div>
      <button class="btn-primary" @click="handleRetry">🔄 重试</button>
    </div>

    <div v-if="compareResult" class="results-section">
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">{{ compareResult.website_comics }}</div>
          <div class="stat-label">网站漫画</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ compareResult.local_comics }}</div>
          <div class="stat-label">本地漫画</div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-value">{{ compareResult.to_download }}</div>
          <div class="stat-label">需要下载</div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-value">{{ compareResult.already_have }}</div>
          <div class="stat-label">已拥有</div>
        </div>
      </div>

      <div v-if="compareResult.ai_response" class="ai-response-section">
        <button class="btn-secondary" @click="showAiResponse = true">
          📋 查看 AI 响应内容
        </button>
      </div>

      <!-- AI 响应弹窗 -->
      <div v-if="showAiResponse" class="modal-overlay" @click.self="showAiResponse = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>🤖 AI 响应内容</h3>
            <button class="modal-close" @click="showAiResponse = false">✕</button>
          </div>
          <div class="modal-body">
            <pre class="ai-response-content">{{ compareResult.ai_response }}</pre>
          </div>
        </div>
      </div>

      <div v-if="needDownload.length > 0" class="result-section">
        <div class="section-header">
          <h3>📥 需要下载的漫画 ({{ needDownload.length }})</h3>
          <div class="header-actions">
            <label class="select-all-label">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
              全选
            </label>
            <button
              class="btn-primary"
              :disabled="selectedForDownload.length === 0"
              @click="addSelectedToDownload"
            >
              ➕ 添加选中 ({{ selectedForDownload.length }})
            </button>
            <button class="btn-secondary" @click="addAllToDownload">
              ➕ 全部下载
            </button>
          </div>
        </div>
        <div class="comic-grid">
          <div
            v-for="detail in needDownload"
            :key="detail.website.aid"
            class="comic-card"
          >
            <div class="card-checkbox">
              <input
                type="checkbox"
                :checked="selectedForDownload.includes(detail.website.aid)"
                @change="toggleSelect(detail.website.aid)"
              />
            </div>
            <div class="comic-cover-wrapper">
              <img
                :src="detail.website.cover_url"
                :alt="detail.website.title"
              />
              <span v-if="detail.website.category" class="category-badge">
                {{ detail.website.category }}
              </span>
            </div>
            <h4>{{ cleanHtmlEntities(detail.website.title) }}</h4>
            <p class="cleaned-names" v-if="detail.algorithm === '本地'">
              清理后: <span v-html="highlightMatch(detail.website.title, detail.local?.title || '').html1"></span>
            </p>
            <div class="comic-info">
              <span class="comic-pages" v-if="detail.website.pages > 0">
                {{ detail.website.pages }} 张
              </span>
              <span class="comic-date" v-if="detail.website.upload_date">
                {{ detail.website.upload_date }}
              </span>
            </div>
            <div class="match-info">
              <span class="confidence">
                匹配度: {{ (detail.confidence * 100).toFixed(0) }}%
              </span>
              <span class="algorithm-badge">{{ detail.algorithm }}</span>
            </div>
            <p
              class="cleaned-names"
              v-if="detail.local && detail.algorithm === '本地'"
            >
              清理后: <span v-html="highlightMatch(detail.website.title, detail.local.title).html2"></span>
            </p>
            <p class="local-title" v-if="detail.local">
              本地: {{ detail.local.title }}
            </p>
            <p class="match-reason" v-if="detail.reason">{{ detail.reason }}</p>
          </div>
        </div>
      </div>

      <div v-if="alreadyHave.length > 0" class="result-section">
        <h3>✅ 已拥有的漫画 ({{ alreadyHave.length }})</h3>
        <div class="comic-grid">
          <div
            v-for="detail in alreadyHave"
            :key="detail.website.aid"
            class="comic-card owned"
          >
            <div class="comic-cover-wrapper">
              <img
                :src="detail.website.cover_url"
                :alt="detail.website.title"
              />
              <span v-if="detail.website.category" class="category-badge">
                {{ detail.website.category }}
              </span>
            </div>
            <h4>{{ cleanHtmlEntities(detail.website.title) }}</h4>
            <p class="cleaned-names" v-if="detail.algorithm === '本地'">
              清理后: <span v-html="highlightMatch(detail.website.title, detail.local?.title || '').html1"></span>
            </p>
            <div class="comic-info">
              <span class="comic-pages" v-if="detail.website.pages > 0">
                {{ detail.website.pages }} 张
              </span>
              <span class="comic-date" v-if="detail.website.upload_date">
                {{ detail.website.upload_date }}
              </span>
            </div>
            <div class="match-info">
              <span class="confidence">
                匹配度: {{ (detail.confidence * 100).toFixed(0) }}%
              </span>
              <span class="algorithm-badge">{{ detail.algorithm }}</span>
            </div>
            <p
              class="cleaned-names"
              v-if="detail.local && detail.algorithm === '本地'"
            >
              清理后: <span v-html="highlightMatch(detail.website.title, detail.local.title).html2"></span>
            </p>
            <p class="local-title" v-if="detail.local">
              本地: {{ detail.local.title }}
            </p>
            <p class="match-reason" v-if="detail.reason">{{ detail.reason }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="compareResult" class="actions">
      <button
        v-if="isViewingHistory"
        class="btn-primary"
        @click="addAllToDownload"
      >
        ➕ 添加到下载队列
      </button>
      <button class="btn-secondary" @click="resetCompare">
        {{ isViewingHistory ? '返回' : '🔄 重新对比' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCompare } from '../composables/useCompare';
import { useDownloadQueue } from '../composables/useDownloadQueue';
import { CompareResult, MatchDetail, DownloadTask, CompareHistoryEntry } from '../types/index';
import { readDir, readTextFile, remove } from '@tauri-apps/plugin-fs';
import { resourceDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';

const { isComparing, aiLog, aiStreamingContent, result, error, compare, cleanup } =
  useCompare();
const { addToQueue } = useDownloadQueue();

const searchFile = ref('');
const localPath = ref('');
const selectedForDownload = ref<string[]>([]);
const cacheFiles = ref<Array<{ path: string; label: string }>>([]);
const compareHistoryFiles = ref<Array<{ path: string; label: string }>>([]);
const selectedHistoryFile = ref('');
const showAiResponse = ref(false);
const showDeleteConfirmModal = ref(false);
const deleteTargetPath = ref('');

let isComponentMounted = true;

// 从 localStorage 加载上次选择的本地路径
onMounted(() => {
  const savedLocalPath = localStorage.getItem('compare-local-path');
  if (savedLocalPath) {
    localPath.value = savedLocalPath;
  }
  loadCacheFiles();
});

onUnmounted(() => {
  isComponentMounted = false;
  cleanup(); // 清理事件监听和状态
});

// 保存本地路径到 localStorage
function saveLocalPath() {
  if (localPath.value) {
    localStorage.setItem('compare-local-path', localPath.value);
  }
}

// 清理 HTML 实体和多余空格（保留前缀）
function cleanHtmlEntities(title: string): string {
  let cleaned = title
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#124;/g, '|')
    .replace(/<\/?em>/gi, '');

  return cleaned.replace(/\s+/g, ' ').trim();
}

// 清理漫画名：去除 HTML 实体 + 多余空格 + [], (), 【】等前缀
function cleanTitle(title: string): string {
  const cleaned = cleanHtmlEntities(title);
  // 匹配开头的 [], (), 【】, 以及它们的组合（允许括号间有空格）
  const re = /^(?:\s*(?:\[.*?\]|\(.*?\)|【.*?】))*\s*/g;
  return cleaned.replace(re, '').trim();
}

// 高亮两个字符串中匹配的部分
function highlightMatch(text1: string, text2: string): { html1: string; html2: string } {
  const clean1 = cleanTitle(text1);
  const clean2 = cleanTitle(text2);
  
  if (!clean1 || !clean2) {
    return { html1: escapeHtml(clean1), html2: escapeHtml(clean2) };
  }
  
  // 使用最长公共子序列算法找出匹配部分
  const lcs = getLongestCommonSubsequence(clean1.toLowerCase(), clean2.toLowerCase());
  
  // 高亮 text1 中的匹配字符
  let html1 = '';
  let lcsIndex = 0;
  for (let i = 0; i < clean1.length; i++) {
    const char = escapeHtml(clean1[i]);
    if (lcsIndex < lcs.length && clean1[i].toLowerCase() === lcs[lcsIndex]) {
      html1 += `<span class="match-highlight">${char}</span>`;
      lcsIndex++;
    } else {
      html1 += `<span class="no-match">${char}</span>`;
    }
  }
  
  // 高亮 text2 中的匹配字符
  let html2 = '';
  lcsIndex = 0;
  for (let i = 0; i < clean2.length; i++) {
    const char = escapeHtml(clean2[i]);
    if (lcsIndex < lcs.length && clean2[i].toLowerCase() === lcs[lcsIndex]) {
      html2 += `<span class="match-highlight">${char}</span>`;
      lcsIndex++;
    } else {
      html2 += `<span class="no-match">${char}</span>`;
    }
  }
  
  return { html1, html2 };
}

// 获取最长公共子序列
function getLongestCommonSubsequence(s1: string, s2: string): string {
  const m = s1.length;
  const n = s2.length;
  
  // 创建 DP 表
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // 回溯找出 LCS
  let result = '';
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) {
      result = s1[i - 1] + result;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return result;
}

// HTML 转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const compareResult = computed(() => result.value as CompareResult | null);

const hasSearchResult = computed(() => !!compareResult.value);

const isViewingHistory = computed(() => !!selectedHistoryFile.value && !!compareResult.value);

const needDownload = computed(() => {
  if (!compareResult.value) return [];
  return compareResult.value.match_details
    .filter((d: MatchDetail) => d.match_type === 'need_download')
    .sort((a: MatchDetail, b: MatchDetail) => a.confidence - b.confidence);
});

const alreadyHave = computed(() => {
  if (!compareResult.value) return [];
  return compareResult.value.match_details
    .filter((d: MatchDetail) => d.match_type === 'already_have')
    .sort((a: MatchDetail, b: MatchDetail) => b.confidence - a.confidence);
});

const selectedNeedDownload = computed(() => {
  return needDownload.value.filter((d: MatchDetail) =>
    selectedForDownload.value.includes(d.website.aid)
  );
});

const isAllSelected = computed(() => {
  return (
    needDownload.value.length > 0 &&
    selectedForDownload.value.length === needDownload.value.length
  );
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedForDownload.value = [];
  } else {
    selectedForDownload.value = needDownload.value.map(
      (d: MatchDetail) => d.website.aid
    );
  }
}

async function loadCacheFiles() {
  try {
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      const resourceDirPath = await resourceDir();
      const possibleCacheDirs = [
        'cache',
        'src-tauri/target/debug/cache',
        'target/debug/cache',
      ];

      for (const dir of possibleCacheDirs) {
        try {
          const cacheDir = await join(resourceDirPath, dir);
          const files = await readDir(cacheDir);

          const file_list: Array<{ path: string; label: string }> = [];
          const history_list: Array<{ path: string; label: string }> = [];

          for (const file of files) {
            if (
              file.name.endsWith('.json') &&
              file.name.startsWith('search_')
            ) {
              const filePath = await join(cacheDir, file.name);
              const keywordMatch = file.name.match(/search_(.+?)\.json/);
              const keyword = keywordMatch
                ? keywordMatch[1].replace(/_/g, ' ')
                : '未知';

              try {
                const content = await readTextFile(filePath);
                const comics = JSON.parse(content);
                const count = comics.length;

                file_list.push({
                  path: filePath,
                  label: `${keyword} (${count} 部)`,
                });
              } catch (e) {
                console.error('读取缓存文件失败：', e);
              }
            } else if (
              file.name.endsWith('.json') &&
              file.name.startsWith('compare_')
            ) {
              const filePath = await join(cacheDir, file.name);
              const match = file.name.match(/compare_(.+)_(\d{8}_\d{6})\.json/);
              const keyword = match ? match[1].replace(/_/g, ' ') : '未知';
              const timestamp = match ? match[2] : '';

              try {
                const content = await readTextFile(filePath);
                const entry: CompareHistoryEntry = JSON.parse(content);
                const formattedTime = formatCompareTimestamp(timestamp);
                const r = entry.result;

                // 统计本地/AI 匹配的已拥有数量
                const alreadyHaveDetails = r.match_details.filter(
                  (d: MatchDetail) => d.match_type === 'already_have'
                );
                const localMatched = alreadyHaveDetails.filter(
                  (d: MatchDetail) => d.algorithm === '本地'
                ).length;
                const aiMatched = alreadyHaveDetails.filter(
                  (d: MatchDetail) => d.algorithm === 'AI'
                ).length;

                history_list.push({
                  path: filePath,
                  label: `${keyword} - ${formattedTime} | 网站 ${r.website_comics} ,本地 ${r.local_comics} ,需下载 ${r.to_download} ,已拥有 ${r.already_have}（本地 ${localMatched} + AI ${aiMatched}）`,
                });
              } catch (e) {
                console.error('读取对比历史文件失败：', e);
              }
            }
          }

          if (isComponentMounted) {
            cacheFiles.value = file_list;
            compareHistoryFiles.value = history_list.sort((a, b) => b.path.localeCompare(a.path));
          }
          return;
        } catch (e) {
          continue;
        }
      }
    }
  } catch (e: any) {
    if (isComponentMounted) {
      error.value = `加载缓存文件失败：${e.message}`;
    }
  }
}

async function browseLocalPath() {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      const result = await open({
        multiple: false,
        directory: true,
      });
      if (result && isComponentMounted) {
        localPath.value = result as string;
        saveLocalPath(); // 保存选择的本地路径
      }
    } else {
      console.log('非 Tauri 环境，跳过文件夹选择');
    }
  } catch (e: any) {
    if (isComponentMounted) {
      error.value = `选择文件夹失败：${e.message}`;
    }
  }
}

async function handleCompare() {
  if (!searchFile.value || !localPath.value) return;
  saveLocalPath(); // 保存本地路径
  selectedHistoryFile.value = ''; // 清除历史选择
  await compare(searchFile.value, localPath.value);
}

// 格式化对比历史时间戳
function formatCompareTimestamp(ts: string): string {
  if (ts.length === 15) {
    return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(9, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}`;
  }
  return ts;
}

// 选择历史文件并加载
async function selectHistoryFile(filePath: string) {
  selectedHistoryFile.value = filePath;
  try {
    const content = await readTextFile(filePath);
    const entry: CompareHistoryEntry = JSON.parse(content);
    result.value = entry.result;
    localPath.value = entry.local_path;
    saveLocalPath();
    selectedForDownload.value = [];
  } catch (e: any) {
    error.value = `加载历史对比结果失败：${e.message}`;
  }
}

// 显示删除确认
function showDeleteConfirm(filePath: string) {
  deleteTargetPath.value = filePath;
  showDeleteConfirmModal.value = true;
}

// 取消删除
function cancelDelete() {
  deleteTargetPath.value = '';
  showDeleteConfirmModal.value = false;
}

// 执行删除
async function executeDelete() {
  if (deleteTargetPath.value) {
    await deleteCompareHistory(deleteTargetPath.value);
  }
  cancelDelete();
}

// 删除对比历史
async function deleteCompareHistory(filePath: string) {
  try {
    if (typeof window !== 'undefined' && window.__TAURI__ !== undefined) {
      await remove(filePath);
      // 如果删除的是当前选中的历史，清除结果
      if (selectedHistoryFile.value === filePath) {
        selectedHistoryFile.value = '';
        result.value = null;
      }
      // 重新加载历史
      await loadCacheFiles();
    } else {
      console.log('非 Tauri 环境，跳过删除对比历史');
    }
  } catch (e: any) {
    error.value = `删除对比历史失败：${e.message}`;
  }
}

function toggleSelect(aid: string) {
  const index = selectedForDownload.value.indexOf(aid);
  if (index === -1) {
    selectedForDownload.value.push(aid);
  } else {
    selectedForDownload.value.splice(index, 1);
  }
}

function addSelectedToDownload() {
  const toDownload = selectedNeedDownload.value.map((d: MatchDetail) => {
    return {
      aid: d.website.aid,
      title: d.website.title,
      url: d.website.url,
      cover_url: d.website.cover_url,
      save_path: localPath.value,
      pages: d.website.pages,
    } as DownloadTask;
  });

  const addedCount = addToQueue(toDownload);
  console.log(`添加了 ${addedCount} 个任务到下载队列`);

  if (addedCount > 0) {
    alert(`已添加 ${addedCount} 个漫画到下载队列`);
  }
}

function addAllToDownload() {
  const toDownload = needDownload.value.map((d: MatchDetail) => {
    return {
      aid: d.website.aid,
      title: d.website.title,
      url: d.website.url,
      cover_url: d.website.cover_url,
      save_path: localPath.value,
      pages: d.website.pages,
    } as DownloadTask;
  });

  const addedCount = addToQueue(toDownload);
  console.log(`添加了 ${addedCount} 个任务到下载队列`);

  if (addedCount > 0) {
    alert(`已添加 ${addedCount} 个漫画到下载队列`);
  }
}

function resetCompare() {
  result.value = null;
  searchFile.value = '';
  localPath.value = '';
  selectedForDownload.value = [];
  selectedHistoryFile.value = '';
}

async function handleRetry() {
  error.value = '';
  await handleCompare();
}

onMounted(() => {
  loadCacheFiles();
});
</script>

<style scoped>
.compare-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

h2 {
  margin-bottom: 24px;
  color: var(--text-primary);
}

h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.setup-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-group .btn-sm {
  align-self: flex-start;
  margin-top: 4px;
}

.select-input {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  width: 100%;
}

.select-input:focus {
  outline: none;
  border-color: #667eea;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
}

.btn-primary {
  padding: 12px 24px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  padding: 12px 20px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-secondary:hover {
  background: var(--border-color);
}

.ai-streaming-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.ai-streaming-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.ai-streaming-header .ai-icon {
  font-size: 18px;
}

.ai-streaming-header .ai-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.ai-log {
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: 6px;
}

.ai-log-line {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.ai-streaming-content {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--bg-primary);
}

.streaming-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.streaming-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
}

.ai-waiting {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 13px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  padding: 16px;
  background: #fee;
  color: #f56c6c;
  border-radius: 8px;
  margin-bottom: 16px;
}

.error-message > p {
  margin: 0 0 12px 0;
}

.error-message .btn-primary {
  padding: 8px 16px;
  font-size: 13px;
  white-space: nowrap;
}

.smb-help {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.smb-help p {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 13px;
}

.smb-help ol {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
}

.smb-help li {
  margin-bottom: 4px;
}

.smb-help kbd {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 12px;
  font-family: monospace;
}

.smb-help code {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 12px;
  font-family: monospace;
  color: #667eea;
}

.results-section {
  margin-top: 24px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-warning {
  border-left: 4px solid var(--warning);
}

.stat-success {
  border-left: 4px solid var(--success);
}

.result-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.select-all-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.comic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.comic-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: transform 0.2s;
}

.comic-card:hover {
  transform: translateY(-4px);
}

.comic-card.owned {
  opacity: 0.7;
}

.card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.card-checkbox input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.comic-cover-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.comic-cover-wrapper img {
  width: 100%;
  height: 260px;
  object-fit: cover;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.comic-cover-wrapper:hover img {
  opacity: 0.85;
}

.category-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comic-card h4 {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.comic-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comic-pages {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.comic-date {
  font-size: 11px;
  color: var(--text-secondary);
}

.local-path {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
}

.match-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confidence {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.algorithm-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--primary-gradient);
  color: #fff;
  font-weight: 600;
}

.match-reason {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-bottom: 0;
}

.matched-local {
  font-size: 11px;
  color: var(--success);
  margin-top: 4px;
  margin-bottom: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.local-title {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-bottom: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.cleaned-names {
  font-size: 11px;
  color: var(--primary);
  display: block;
  margin-top: 2px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.match-highlight {
  background: rgba(102, 126, 234, 0.3);
  color: var(--primary);
  font-weight: 600;
  border-radius: 2px;
  padding: 0 1px;
}

.no-match {
  color: var(--text-secondary);
  opacity: 0.6;
}

:deep(.match-highlight) {
  background: rgba(102, 126, 234, 0.3);
  color: var(--primary);
  font-weight: 600;
  border-radius: 2px;
  padding: 0 1px;
}

:deep(.no-match) {
  color: var(--text-secondary);
  opacity: 0.6;
}

.ai-response-section {
  margin-bottom: 16px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 12px;
  max-width: 90vw;
  max-height: 80vh;
  width: 800px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: var(--border-color);
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.ai-response-content {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--bg-primary);
  padding: 16px;
  border-radius: 8px;
  color: var(--text-primary);
  max-height: 60vh;
  overflow-y: auto;
  margin: 0;
}

.actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid transparent;
}

.history-item:hover {
  background: var(--border-color);
}

.history-item.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.history-keyword {
  font-size: 13px;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-delete {
  padding: 4px 10px;
  font-size: 12px;
  color: #f56c6c;
  background: transparent;
  border: 1px solid #f56c6c;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
}

.btn-delete:hover {
  background: #f56c6c;
  color: #fff;
}

.history-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.confirm-dialog {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.confirm-dialog h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.confirm-dialog p {
  margin: 0 0 20px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 8px 20px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: var(--border-color);
}

.btn-confirm-delete {
  padding: 8px 20px;
  background: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-confirm-delete:hover {
  opacity: 0.9;
}
</style>
