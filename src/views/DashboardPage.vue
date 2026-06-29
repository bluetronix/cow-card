<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { getPendingCount } from '../utils/sync'

const router = useRouter()
const { currentUser, fullName, logout } = useAuth()
const pendingCount = ref(0)

onMounted(async () => {
  pendingCount.value = await getPendingCount()
})

function handleLogout() {
  logout()
  router.push('/login')
}

const tiles = [
  {
    title: 'New Cow Registration',
    description: 'Register a new cow with full details',
    icon: '🐄',
    color: '#1a5276',
    route: '/cows/new',
  },
  {
    title: 'All Cows',
    description: 'View and manage all registered cows',
    icon: '🐮',
    color: '#0e6655',
    route: '/cows',
  },
  {
    title: 'Daily Recording',
    description: 'Quick daily data entry by cow ID',
    icon: '📋',
    color: '#b7950b',
    route: '/daily',
  },
  {
    title: 'Exports',
    description: 'Download PDF cards and CSV data',
    icon: '📊',
    color: '#6c3483',
    route: '/exports',
  },
  {
    title: 'Sync Status',
    description: 'View and sync pending offline records',
    icon: '🔄',
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
        <span v-if="pendingCount > 0" class="pending-badge">
          {{ pendingCount }} pending
        </span>
        <button class="btn-logout" @click="handleLogout">Logout</button>
      </div>
    </header>

    <div class="tiles-grid">
      <div
        v-for="tile in tiles"
        :key="tile.title"
        class="dashboard-tile"
        :style="{ '--tile-color': tile.color }"
        @click="tile.route ? router.push(tile.route) : null"
      >
        <div class="tile-icon">{{ tile.icon }}</div>
        <h3>{{ tile.title }}</h3>
        <p>{{ tile.description }}</p>
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

.pending-badge {
  background: #e74c3c;
  color: #fff;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
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
</style>
