<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHerdSummary } from '../composables/useHerdSummary'
import { generateHerdSummaryPdf, downloadPdf } from '../utils/pdf'
import { showToast, formatError } from '../composables/useToast'
import { todayISO } from '../utils/dateOnly'
import HerdSummaryCard from '../components/HerdSummaryCard.vue'

const router = useRouter()
const { summary, loading, error, compute } = useHerdSummary()
const downloading = ref(false)

onMounted(compute)

async function handleDownloadPdf() {
  if (downloading.value) return
  downloading.value = true
  try {
    const doc = await generateHerdSummaryPdf()
    downloadPdf(doc, `herd_summary_${todayISO()}.pdf`)
    showToast('Herd summary PDF downloaded', 'success')
  } catch (e) {
    showToast(formatError(e, 'Failed to generate herd summary PDF'), 'error')
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="summary-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>Herd Summary</h1>
      </div>
      <button
        v-if="!loading && !error && summary.total > 0"
        class="btn-emerald"
        :disabled="downloading"
        @click="handleDownloadPdf"
      >
        {{ downloading ? '⏳ Downloading...' : 'Download PDF' }}
      </button>
    </header>

    <div v-if="loading" class="loading-state">Loading herd data...</div>
    <div v-else-if="error" class="loading-state"><p>{{ error }}</p></div>
    <div v-else-if="summary.total === 0" class="loading-state">
      <p>No cows registered yet.</p>
    </div>

    <div v-else class="page-content">
      <HerdSummaryCard :summary="summary" />
    </div>
  </div>
</template>

<style scoped>
.summary-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40px;
}

.page-header {
  background: #fff;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.page-header h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #333;
}

.btn-back {
  background: none;
  border: none;
  color: #1a5276;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;
  display: block;
}

.btn-emerald {
  padding: 8px 20px;
  background: #059669;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-emerald:hover {
  background: #047857;
}

.btn-emerald:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.page-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px;
}

.loading-state {
  text-align: center;
  padding: 60px;
  color: #999;
}

@media (max-width: 640px) {
  .page-header {
    padding: 12px 16px;
    flex-wrap: wrap;
  }

  .page-header h1 {
    font-size: 1.1rem;
  }

  .page-content {
    padding: 12px;
  }

  .btn-emerald {
    width: 100%;
    text-align: center;
  }
}
</style>
