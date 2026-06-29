<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { syncPendingRecords, getPendingCount } from '../utils/sync'

const pending = ref(0)
const syncing = ref(false)
const result = ref('')

onMounted(async () => {
  pending.value = await getPendingCount()
})

async function handleSync() {
  syncing.value = true
  result.value = ''
  try {
    const res = await syncPendingRecords()
    result.value = `Synced: ${res.cows} cows, ${res.daily} records`
    pending.value = await getPendingCount()
  } catch {
    result.value = 'Sync failed. Check connection.'
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="sync-status" :class="{ hasPending: pending > 0 }">
    <div class="sync-info">
      <span class="sync-icon">{{ pending > 0 ? '🔄' : '✅' }}</span>
      <span>{{ pending > 0 ? `${pending} pending` : 'All synced' }}</span>
    </div>
    <button v-if="pending > 0" class="sync-btn" :disabled="syncing" @click="handleSync">
      {{ syncing ? 'Syncing...' : 'Sync Now' }}
    </button>
    <p v-if="result" class="sync-result">{{ result }}</p>
  </div>
</template>

<style scoped>
.sync-status {
  background: #f0f2f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
}

.sync-status.hasPending {
  background: #fff8e1;
  border-color: #f9a825;
}

.sync-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #555;
}

.sync-btn {
  padding: 4px 14px;
  background: #1a5276;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

.sync-btn:disabled {
  opacity: 0.6;
}

.sync-result {
  margin: 0;
  font-size: 0.8rem;
  color: #0e6655;
}
</style>
