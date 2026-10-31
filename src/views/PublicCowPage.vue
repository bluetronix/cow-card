<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch } from '../db/api'
import { FARM } from '../config/farm'
import { calculateAge, formatDate } from '../utils/age'
import logoPath from '../assets/logo.png'

interface PublicCow {
  id: string
  id_no: string
  tag: string
  name: string
  sex: string
  breed: string
  colour: string
  birth_date: string
  category: string
  cull_status: string
  current_health_status: string
  last_checkup_date: string
  image_url: string
  front_image_url: string
  side_image_url: string
  rear_image_url: string
  head_image_url: string
}

const route = useRoute()
const router = useRouter()
const cow = ref<PublicCow | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const id = route.params.id as string
    const data = await apiFetch<{ cow?: PublicCow }>(`/cows/public/${encodeURIComponent(id)}`)
    cow.value = data?.cow || null
  } catch (e: any) {
    error.value = e?.status === 404 ? 'Cow not found' : 'Unable to load this record'
  } finally {
    loading.value = false
  }
})

function photo(c: PublicCow): string {
  return c.side_image_url || c.image_url || c.front_image_url || ''
}
</script>

<template>
  <div class="public-page">
    <div class="public-card">
      <header class="public-header">
        <img :src="logoPath" :alt="FARM.name" class="logo" />
        <div>
          <h1>{{ FARM.name }}</h1>
          <p>Public animal summary</p>
        </div>
      </header>

      <div v-if="loading" class="state">Loading...</div>
      <div v-else-if="error || !cow" class="state">{{ error || 'Cow not found' }}</div>

      <div v-else class="public-body">
        <div class="photo-box">
          <img v-if="photo(cow)" :src="photo(cow)" :alt="cow.name || cow.id_no" />
          <div v-else class="no-photo">No photo</div>
        </div>

        <div class="info">
          <div class="identity">
            <strong>{{ cow.id_no || cow.tag || '—' }}</strong>
            <span>{{ cow.name || 'Unnamed' }}</span>
          </div>

          <table>
            <tr><td>Breed</td><td>{{ cow.breed || '—' }}</td></tr>
            <tr><td>Sex</td><td>{{ cow.sex || '—' }}</td></tr>
            <tr><td>Colour</td><td>{{ cow.colour || '—' }}</td></tr>
            <tr><td>Age</td><td>{{ cow.birth_date ? calculateAge(cow.birth_date) : '—' }}</td></tr>
            <tr><td>Category</td><td>{{ cow.category || 'Cow' }}</td></tr>
            <tr><td>Health</td><td>{{ cow.current_health_status || '—' }}</td></tr>
            <tr><td>Last checkup</td><td>{{ formatDate(cow.last_checkup_date) || '—' }}</td></tr>
            <tr><td>Cull status</td><td>{{ cow.cull_status || '—' }}</td></tr>
          </table>
        </div>
      </div>

      <footer class="public-footer">
        <span>This is a limited public record. Medical and breeding details require sign-in.</span>
        <button @click="router.push('/login')">Sign in</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.public-page {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  justify-content: center;
  padding: 24px;
}
.public-card {
  width: 100%;
  max-width: 760px;
  height: fit-content;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
.public-header {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #14452f;
  color: #fff;
  padding: 18px 24px;
}
.logo { height: 52px; width: auto; max-width: 190px; object-fit: contain; }
.public-header h1 { margin: 0; font-size: 1.2rem; }
.public-header p { margin: 2px 0 0; font-size: 0.8rem; opacity: 0.8; }
.state { padding: 60px 20px; text-align: center; color: #888; }
.public-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  padding: 24px;
}
.photo-box {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.photo-box img { width: 100%; height: 100%; object-fit: contain; }
.no-photo { color: #9ca3af; font-size: 0.9rem; }
.identity { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; }
.identity strong { font-size: 1.4rem; color: #14452f; }
.identity span { color: #666; }
table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
td:first-child { color: #777; width: 42%; }
td:last-child { color: #333; font-weight: 600; }
.public-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 24px;
  border-top: 1px solid #eee;
  background: #fafafa;
  font-size: 0.8rem;
  color: #777;
}
.public-footer button {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: #14452f;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
@media (max-width: 600px) {
  .public-body { grid-template-columns: 1fr; }
  .photo-box { max-width: 300px; margin: 0 auto; }
}
</style>
