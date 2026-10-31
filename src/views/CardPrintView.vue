<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db/dexie'
import type { Cow } from '../types'
import { downloadPdf } from '../utils/pdf'
import { showToast, formatError } from '../composables/useToast'
import { CARD_COMPONENTS, CARD_LAYOUT, cardLabel, resolveCardType } from '../cards/registry'
import { makeQrDataUrl, renderCowCardPdf } from '../utils/renderCard'

const route = useRoute()
const router = useRouter()
const cow = ref<Cow | undefined>(undefined)
const loading = ref(true)
const exporting = ref(false)
const qrDataUrl = ref('')

const cardType = computed(() => (cow.value ? resolveCardType(cow.value) : 'cow'))
const cardLayout = computed(() => CARD_LAYOUT[cardType.value])
const currentCardComponent = computed(() => CARD_COMPONENTS[cardType.value])
const title = computed(() => cardLabel(cardType.value))

onMounted(async () => {
  const id = route.params.id as string
  cow.value = await db.cows.get(id)
  if (cow.value) qrDataUrl.value = await makeQrDataUrl(cow.value)
  loading.value = false
})

function printCard() {
  const container = document.querySelector('.print-card-container') as HTMLElement | null
  const card = container?.firstElementChild as HTMLElement | null
  if (!container || !card) {
    window.print()
    return
  }

  const pageWidthPx = (297 / 25.4) * 96
  const pageHeightPx = (210 / 25.4) * 96
  const cardWidth = card.offsetWidth
  const cardHeight = card.offsetHeight
  const scale = Math.min(pageWidthPx / cardWidth, pageHeightPx / cardHeight)
  const offsetX = Math.max(0, (pageWidthPx - cardWidth * scale) / 2)

  container.style.setProperty('--print-scale', String(scale))
  container.style.setProperty('--print-offset-x', `${offsetX}px`)
  container.classList.add('print-a4')

  const cleanup = () => {
    container.classList.remove('print-a4')
    container.style.removeProperty('--print-scale')
    container.style.removeProperty('--print-offset-x')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
  setTimeout(cleanup, 2000)
}

async function downloadCardPdf() {
  if (!cow.value || exporting.value) return
  exporting.value = true
  try {
    const doc = await renderCowCardPdf(cow.value)
    const label = cardType.value
    const cowId = cow.value.id_no || cow.value.id
    downloadPdf(doc, `${label}_card_${cowId}.pdf`)
    showToast(`${label} card PDF downloaded`, 'success')
  } catch (e) {
    showToast(formatError(e, 'Failed to generate card PDF'), 'error')
  } finally {
    setTimeout(() => { exporting.value = false }, 1500)
  }
}
</script>

<template>
  <div class="print-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/cows')">← All Cows</button>
        <h1>{{ title }}</h1>
        <p class="type-note">{{ cardType }} · A4</p>
      </div>
      <div class="header-actions">
        <button class="btn-pdf" :disabled="exporting" @click="downloadCardPdf">
          {{ exporting ? '⏳ Downloading...' : 'Download A4 PDF' }}
        </button>
        <button class="btn-print" @click="printCard">Print</button>
        <button class="btn-back" @click="router.push(`/cows/${cow?.id}`)">Back to Cow</button>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading card...</div>

    <div v-else-if="!cow" class="empty">Cow not found.</div>

    <div v-else class="print-card-container" :style="{ '--card-width': cardLayout.width + 'px' }">
      <component :is="currentCardComponent" :cow="cow" :qr-data-url="qrDataUrl" />
    </div>
  </div>
</template>

<style scoped>
.print-page { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.page-header { background: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.page-header h1 { margin: 0; font-size: 1.4rem; color: #333; }
.type-note { margin: 4px 0 0; font-size: 0.85rem; color: #777; }
.btn-back { background: none; border: none; color: #1a5276; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.btn-pdf, .btn-print { padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 600; border: none; }
.btn-pdf { background: #14452f; color: #fff; }
.btn-pdf:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-print { background: #6c3483; color: #fff; }
.header-actions { display: flex; gap: 8px; align-items: center; }
    .print-card-container {
      width: var(--card-width, 794px);
      margin: 24px auto;
      background: #fff;
    }
.loading, .empty { text-align: center; padding: 60px; color: #999; }
    @media print {
      @page { size: A4 landscape; margin: 0; }
      .page-header, .header-actions { display: none !important; }
      .print-page { background: #fff; padding: 0; }
      .print-card-container.print-a4 {
        width: 297mm;
        height: 210mm;
        margin: 0;
        overflow: hidden;
        background: #fff;
      }
      .print-card-container.print-a4 :deep(.card) {
        transform: translateX(var(--print-offset-x, 0px)) scale(var(--print-scale, 1));
        transform-origin: top left;
        box-shadow: none;
        border: none;
      }
    }
</style>
