<template>
  <div class="app">
    <Header 
      :active-tab="activeTab"
      @tab-change="activeTab = $event"
      @back="handleBack"
    />

    <main class="main">
      <SearchView
        v-show="activeTab === 'search'"
        @add-to-queue="handleAddToQueue"
        @switch-tab="activeTab = $event"
      />

      <CompareView
        v-show="activeTab === 'compare'"
        @download-comics="handleDownloadComics"
      />

      <DownloadView
        v-show="activeTab === 'download'"
        :queue="downloadQueue"
        @update:queue="downloadQueue = $event"
        @start-download="handleStartDownload"
      />

      <ConfigView
        v-show="activeTab === 'config'"
      />
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import SearchView from './views/SearchView.vue';
import CompareView from './views/CompareView.vue';
import DownloadView from './views/DownloadView.vue';
import ConfigView from './views/ConfigView.vue';
import { createClient } from './adapters';

const activeTab = ref('search');
const downloadQueue = ref([]);
const isDownloading = ref(false);

// 注入客户端实例（兼容直接导入）
const client = inject('client') || createClient();

const handleBack = () => {
};

const handleAddToQueue = (comics) => {
  comics.forEach(comic => {
    if (!downloadQueue.value.find(c => c.aid === comic.aid)) {
      downloadQueue.value.push(comic);
    }
  });
};

const handleDownloadComics = async (comics, storagePath) => {
  isDownloading.value = true;
  try {
    const response = await client.download(comics, { storagePath });
    alert(`下载完成！成功：${response.success.length}, 失败：${response.failed.length}`);
  } catch (error) {
    alert(`下载失败：${error.message}`);
  } finally {
    isDownloading.value = false;
  }
};

const handleStartDownload = async (comics) => {
  isDownloading.value = true;
  try {
    const response = await client.download(comics, { storagePath: '' });
    alert(`下载完成！成功：${response.success.length}, 失败：${response.failed.length}`);
    downloadQueue.value = [];
  } catch (error) {
    alert(`下载失败：${error.message}`);
  } finally {
    isDownloading.value = false;
  }
};
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .main {
    padding: 1rem;
  }
}
</style>
