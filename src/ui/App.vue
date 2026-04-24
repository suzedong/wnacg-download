<template>
  <div class="app">
    <Header 
      :active-tab="activeTab"
      @tab-change="activeTab = $event"
      @back="handleBack"
    />

    <main class="main">
      <div class="main-content">
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
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, provide } from 'vue';
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

// 创建并提供客户端实例
const client = createClient();
provide('client', client);

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
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
}

.main {
  flex: 1;
  overflow-y: auto;
  width: 100%;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
}
</style>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
