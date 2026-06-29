import { db } from '../db/dexie'
import { syncCow, fetchCows } from '../db/turso'

export async function syncPendingRecords(): Promise<number> {
  let cowsSynced = 0

  const unsyncedCows = await db.cows.where('synced').equals(0).toArray()
  for (const cow of unsyncedCows) {
    const ok = await syncCow(cow)
    if (ok) {
      await db.cows.update(cow.id, { synced: 1 })
      cowsSynced++
    }
  }

  return cowsSynced
}

export async function pullFromTurso(): Promise<number> {
  let cowsImported = 0

  const remoteCows = await fetchCows()
  console.log('[pullFromTurso] remote cows:', remoteCows.length)
  for (const cow of remoteCows) {
    const local = await db.cows.get(cow.id)
    if (local && local.synced === 0) continue
    await db.cows.put({ ...cow, synced: 1 })
    cowsImported++
  }

  console.log('[pullFromTurso] imported:', cowsImported, 'cows')
  return cowsImported
}

export async function getPendingCount(): Promise<number> {
  return await db.cows.where('synced').equals(0).count()
}
