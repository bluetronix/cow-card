<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { getPendingCount, syncPendingRecords, pullFromTurso } from '../utils/sync'

const router = useRouter()
const { currentUser, fullName, logout } = useAuth()
const pendingCount = ref(0)
const syncing = ref(false)
const pulling = ref(false)
const syncResult = ref('')
const pullResult = ref('')

const allSynced = computed(() => pendingCount.value === 0 && syncResult.value === '')

onMounted(async () => {
  pendingCount.value = await getPendingCount()
})

function handleLogout() {
  logout()
  router.push('/login')
}

function handleTileClick(tile: { action?: string; route?: string }) {
  if (tile.action === 'sync') {
    handleSync()
  } else if (tile.route) {
    router.push(tile.route)
  }
}

async function handleSync() {
  syncing.value = true
  syncResult.value = ''
  try {
    const res = await syncPendingRecords()
    syncResult.value = `Done: ${res.cows} cows, ${res.daily} records synced`
    pendingCount.value = await getPendingCount()
  } catch {
    syncResult.value = 'Sync failed'
  } finally {
    syncing.value = false
  }
}

async function handlePull() {
  pulling.value = true
  pullResult.value = ''
  try {
    const res = await pullFromTurso()
    console.log('[handlePull] result:', res)
    pullResult.value = `Imported: ${res.cows} cows, ${res.daily} records`
  } catch (e) {
    console.error('[handlePull] error:', e)
    pullResult.value = 'Import failed'
  } finally {
    pulling.value = false
  }
}

const tiles = [
  {
    title: 'New Cow Registration',
    description: 'Register a new cow with full details',
    icon: '\u{1F404}',
    color: '#1a5276',
    route: '/cows/new',
  },
  {
    title: 'All Cows',
    description: 'View and manage all registered cows',
    icon: '\u{1F42E}',
    color: '#0e6655',
    route: '/cows',
  },
  {
    title: 'Daily Recording',
    description: 'Quick daily data entry by cow ID',
    icon: '\u{1F4CB}',
    color: '#b7950b',
    route: '/daily',
  },
  {
    title: 'Exports',
    description: 'Download PDF cards and CSV data',
    icon: '\u{1F4CA}',
    color: '#6c3483',
    route: '/exports',
  },
  {
    title: 'Sync Status',
    description: 'View and sync pending offline records',
    icon: '\u{1F504}',
    color: '#cb4335',
    route: '',
    action: 'sync',
  },
]
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div>
        <h1>Bashe Dairy Farm</h1>
        <p class="user-greeting">Welcome, {{ fullName || currentUser }}</p>
      </div>
      <div class="header-actions">
        <button class="btn-logout" @click="handleLogout">Logout</button>
      </div>
    </header>

    <div class="tiles-grid">
      <div
        v-for="tile in tiles"
        :key="tile.title"
        class="dashboard-tile"
        :class="{ 'tile-sync': tile.action === 'sync' }"
        :style="{ '--tile-color': tile.color }"
        @click="handleTileClick(tile)"
      >
        <div class="tile-icon">{{ tile.icon }}</div>
        <h3>{{ tile.title }}</h3>
        <div class="tile-body">
          <p>{{ tile.description }}</p>
          <div v-if="tile.action === 'sync'" class="sync-actions">
            <div class="sync-row">
              <span v-if="pendingCount > 0" class="sync-count">{{ pendingCount }} pending</span>
              <button
                v-if="pendingCount > 0"
                class="sync-now-btn"
                :disabled="syncing"
                @click.stop="handleSync()"
              >
                {{ syncing ? 'Syncing...' : 'Sync Now' }}
              </button>
              <span v-if="syncResult" class="sync-result">{{ syncResult }}</span>
              <span v-if="allSynced" class="sync-ok">All synced</span>
            </div>
            <div class="sync-row">
              <button class="pull-btn" :disabled="pulling" @click.stop="handlePull()">
                {{ pulling ? 'Pulling...' : 'Pull from Cloud' }}
              </button>
              <span v-if="pullResult" class="pull-result">{{ pullResult }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #f0f2f5;
}
.dashboard-header {
  background: linear-gradient(135deg, #0b2b3e, #1a5276);
  color: #fff;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dashboard-header h1 {
  margin: 0;
  font-size: 1.6rem;
}
.user-greeting {
  margin: 4px 0 0;
  font-size: 0.9rem;
  opacity: 0.8;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn-logout {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}
.btn-logout:hover {
  background: rgba(255, 255, 255, 0.25);
}
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}
.dashboard-tile {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 5px solid var(--tile-color);
}
.dashboard-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.tile-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}
.dashboard-tile h3 {
  margin: 0 0 8px;
  color: #333;
  font-size: 1.1rem;
}
.dashboard-tile p {
  margin: 0;
  color: #777;
  font-size: 0.85rem;
  line-height: 1.4;
}
.tile-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.sync-count {
  font-weight: 700;
  color: #cb4335;
  font-size: 0.95rem;
}
.sync-now-btn {
  padding: 8px 16px;
  background: #cb4335;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.sync-now-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.sync-result {
  color: #0e6655;
  font-weight: 600;
  font-size: 0.8rem;
}
.sync-ok {
  color: #0e6655;
  font-weight: 600;
}
.tile-sync {
  cursor: default;
}
.sync-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.pull-btn {
  padding: 8px 16px;
  background: #1a5276;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.pull-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.pull-result {
  color: #1a5276;
  font-weight: 600;
  font-size: 0.8rem;
}
</style>
