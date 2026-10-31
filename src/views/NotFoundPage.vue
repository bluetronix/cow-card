<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="card">
      <div class="icon">🐄</div>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <div class="actions">
        <button class="btn-primary" @click="router.push('/')">Dashboard</button>
        <button class="btn-secondary" @click="router.push('/cows')">All Cows</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  padding: 24px;
}
.card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  max-width: 420px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.icon { font-size: 3rem; }
h1 { margin: 12px 0 6px; color: #333; }
p { color: #777; margin: 0 0 24px; }
.actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}
.btn-primary { background: #1a5276; color: #fff; }
.btn-secondary { background: #eef2f5; color: #1a5276; }
</style>
