<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import type { Cow } from '../types'
import { calculateAge } from '../utils/age'
import { showToast, formatError, showConfirm } from '../composables/useToast'

const router = useRouter()
const cows = ref<Cow[]>([])
const search = ref('')
const pregnancyFilter = ref('')
const imageFilter = ref('')
const sortField = ref('tag')
const sortDir = ref<'asc' | 'desc'>('asc')

onMounted(async () => {
  cows.value = await db.cows.toArray()
})

const filteredCows = () => {
  return cows.value.filter(c => {
    if (search.value) {
      const q = search.value.toLowerCase()
      if (
        !c.id_no?.toLowerCase().includes(q) &&
        !c.tag?.toLowerCase().includes(q) &&
        !c.collar_no?.toLowerCase().includes(q) &&
        !c.breed?.toLowerCase().includes(q)
      ) return false
    }
    if (pregnancyFilter.value && c.pregnancy_result !== pregnancyFilter.value) return false
    if (imageFilter.value === 'with' && !c.image_url) return false
    if (imageFilter.value === 'without' && c.image_url) return false
    return true
  })
}

const sortedCows = computed(() => {
  const list = filteredCows()
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const field = sortField.value as keyof Cow
    let va = a[field]
    let vb = b[field]
    if (va == null || va === '') va = field === 'birth_date' ? '0000' : ''
    if (vb == null || vb === '') vb = field === 'birth_date' ? '0000' : ''
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir
  })
})

function toggleSort(field: string) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

async function deleteCow(id: string) {
  const cow = cows.value.find(c => c.id === id)
  const label = cow?.id_no || cow?.tag || cow?.collar_no || id
  showConfirm(
    'Delete Cow',
    `Permanently delete "${label}"? This action cannot be undone.`,
    async () => {
      try {
        await db.cows.delete(id)
        cows.value = cows.value.filter(c => c.id !== id)
        showToast(`Deleted "${label}"`, 'success')
      } catch (e) {
        showToast(formatError(e, 'Failed to delete cow'), 'error')
      }
    },
    'Delete',
  )
}
</script>

<template>
  <div class="list-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>All Cows</h1>
      </div>
      <div class="header-actions">
        <input
          v-model="search"
          type="text"
          placeholder="Search by ID, tag, collar..."
          class="search-input"
        />
        <button class="btn-primary" @click="router.push('/cows/new')">
          + New Cow
        </button>
      </div>
    </header>

    <div class="filter-bar">
      <select v-model="pregnancyFilter" class="filter-select">
        <option value="">Pregnancy: All</option>
        <option value="Pregnant">Pregnant</option>
        <option value="Open">Open</option>
      </select>
      <select v-model="imageFilter" class="filter-select">
        <option value="">Images: All</option>
        <option value="with">With Image</option>
        <option value="without">Without Image</option>
      </select>
    </div>

    <div class="table-container">
      <table v-if="sortedCows.length > 0" class="cow-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('id_no')">
              Card No
              <span v-if="sortField === 'id_no'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th class="sortable" @click="toggleSort('tag')">
              Tag
              <span v-if="sortField === 'tag'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th class="sortable" @click="toggleSort('collar_no')">
              Collar
              <span v-if="sortField === 'collar_no'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th class="sortable" @click="toggleSort('sex')">
              Sex
              <span v-if="sortField === 'sex'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th class="sortable" @click="toggleSort('breed')">
              Breed
              <span v-if="sortField === 'breed'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th class="sortable" @click="toggleSort('birth_date')">
              Age
              <span v-if="sortField === 'birth_date'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th class="sortable" @click="toggleSort('cull_status')">
              Cull
              <span v-if="sortField === 'cull_status'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th class="sortable" @click="toggleSort('pregnancy_result')">
              Pregnancy
              <span v-if="sortField === 'pregnancy_result'" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cow in sortedCows" :key="cow.id">
            <td>{{ cow.id_no }}</td>
            <td>{{ cow.tag }}</td>
            <td>{{ cow.collar_no || '—' }}</td>
            <td>{{ cow.sex || '—' }}</td>
            <td>{{ cow.breed }}</td>
            <td>{{ cow.birth_date ? calculateAge(cow.birth_date) : '—' }}</td>
            <td>
              <span
                :class="['badge', cow.cull_status === '+' ? 'badge-cull' : 'badge-ok']"
              >{{ cow.cull_status || '-' }}</span>
            </td>
            <td>
              <span
                :class="['badge', cow.pregnancy_result === 'Pregnant' ? 'badge-pregnant' : 'badge-open']"
              >
                {{ cow.pregnancy_result || 'Open' }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-sm" @click="router.push(`/cows/${cow.id}`)">View</button>
              <button class="btn-sm btn-edit" @click="router.push(`/cows/${cow.id}/edit`)">Edit</button>
              <button class="btn-sm btn-danger" @click="deleteCow(cow.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="sortedCows.length > 0" class="cow-cards">
        <div v-for="cow in sortedCows" :key="cow.id" class="cow-card">
          <div class="card-header">
            <strong class="card-id">#{{ cow.id_no }}</strong>
            <span class="card-sex">{{ cow.sex || '—' }}</span>
          </div>
          <div class="card-body">
            <div class="card-row"><span class="card-label">Tag:</span><span>{{ cow.tag }}</span></div>
            <div class="card-row"><span class="card-label">Collar:</span><span>{{ cow.collar_no || '—' }}</span></div>
            <div class="card-row"><span class="card-label">Breed:</span><span>{{ cow.breed }}</span></div>
            <div class="card-row"><span class="card-label">Age:</span><span>{{ cow.birth_date ? calculateAge(cow.birth_date) : '—' }}</span></div>
            <div class="card-row">
              <span class="card-label">Cull:</span>
              <span
                :class="['badge', cow.cull_status === '+' ? 'badge-cull' : 'badge-ok']"
              >{{ cow.cull_status || '-' }}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Pregnancy:</span>
              <span
                :class="['badge', cow.pregnancy_result === 'Pregnant' ? 'badge-pregnant' : 'badge-open']"
              >{{ cow.pregnancy_result || 'Open' }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-sm" @click="router.push(`/cows/${cow.id}`)">View</button>
            <button class="btn-sm btn-edit" @click="router.push(`/cows/${cow.id}/edit`)">Edit</button>
            <button class="btn-sm btn-danger" @click="deleteCow(cow.id)">Delete</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>No cows registered yet.</p>
        <button class="btn-primary" @click="router.push('/cows/new')">Register First Cow</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.page-header {
  background: #fff;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 8px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.9rem;
  width: 240px;
}

.search-input:focus {
  border-color: #1a5276;
  outline: none;
}

.filter-bar {
  display: flex;
  gap: 10px;
  padding: 12px 32px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  align-items: center;
}

.filter-input,
.filter-select {
  padding: 6px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.85rem;
  background: #fff;
  min-width: 110px;
}

.filter-input:focus,
.filter-select:focus {
  border-color: #1a5276;
  outline: none;
}

.table-container {
  padding: 24px 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.cow-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.cow-table th {
  background: #1a5276;
  color: #fff;
  padding: 12px 16px;
  text-align: left;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
}

.cow-table th.sortable {
  cursor: pointer;
}

.cow-table th.sortable:hover {
  background: #1e6a99;
}

.sort-arrow {
  font-size: 0.7rem;
}

.cow-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
  color: #444;
}

.cow-table tr:hover td {
  background: #f8f9fa;
}

.badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge-pregnant {
  background: #d4edda;
  color: #155724;
}

.badge-open {
  background: #f8d7da;
  color: #721c24;
}

.badge-cull {
  background: #f8d7da;
  color: #721c24;
}

.badge-ok {
  background: #d4edda;
  color: #155724;
}

.actions {
  display: flex;
  gap: 6px;
}

.btn-sm {
  padding: 5px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-sm:hover {
  background: #f0f0f0;
}

.btn-edit {
  border-color: #1a5276;
  color: #1a5276;
}

.btn-danger {
  border-color: #e74c3c;
  color: #e74c3c;
}

.btn-danger:hover {
  background: #fdecea;
}

.btn-primary {
  padding: 8px 20px;
  background: #1a5276;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state .btn-primary {
  margin-top: 16px;
}

.cow-cards {
  display: none;
}

@media (max-width: 640px) {
  .page-header {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .page-header h1 {
    font-size: 1.1rem;
  }
  .header-actions {
    width: 100%;
    gap: 8px;
  }
  .search-input {
    flex: 1;
    width: auto;
    min-width: 0;
    font-size: 16px;
    padding: 10px 12px;
  }
  .filter-bar {
    padding: 10px 16px;
    gap: 6px;
  }
  .filter-input,
  .filter-select {
    flex: 1;
    min-width: 80px;
    font-size: 16px;
    padding: 8px 10px;
  }
  .table-container {
    padding: 12px;
  }
  .cow-table {
    display: none;
  }
  .cow-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cow-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #1a5276;
    color: #fff;
  }
  .card-id {
    font-size: 1.05rem;
  }
  .card-sex {
    font-size: 0.85rem;
    opacity: 0.9;
  }
  .card-body {
    padding: 10px 16px;
  }
  .card-row {
    display: flex;
    gap: 8px;
    padding: 4px 0;
    font-size: 0.9rem;
    color: #444;
    border-bottom: 1px solid #f5f5f5;
  }
  .card-row:last-child {
    border-bottom: none;
  }
  .card-label {
    font-weight: 600;
    color: #888;
    min-width: 80px;
    font-size: 0.8rem;
    text-transform: uppercase;
  }
  .card-actions {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid #f0f0f0;
  }
  .card-actions .btn-sm {
    flex: 1;
    text-align: center;
    padding: 8px;
    font-size: 0.85rem;
  }
}
</style>
