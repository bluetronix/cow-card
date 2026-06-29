import { db } from '../db/dexie'
import { syncCow, syncDailyRecord, fetchCows, fetchDailyRecordsFromTurso } from '../db/turso'

export async function syncPendingRecords(): Promise<{ cows: number; daily: number }> {
  let cowsSynced = 0
  let dailySynced = 0

  const unsyncedCows = await db.cows.where('synced').equals(0).toArray()
  for (const cow of unsyncedCows) {
    const ok = await syncCow(cow)
    if (ok) {
      await db.cows.update(cow.id, { synced: 1 })
      cowsSynced++
    }
  }

  const unsyncedDaily = await db.dailyRecords.where('synced').equals(0).toArray()
  for (const rec of unsyncedDaily) {
    const ok = await syncDailyRecord(rec)
    if (ok) {
      await db.dailyRecords.update(rec.id, { synced: 1 })
      dailySynced++
    }
  }

  return { cows: cowsSynced, daily: dailySynced }
}

export async function pullFromTurso(): Promise<{ cows: number; daily: number }> {
  let cowsImported = 0
  let dailyImported = 0

  const remoteCows = await fetchCows()
  console.log('[pullFromTurso] remote cows:', remoteCows.length)
  for (const cow of remoteCows) {
    const local = await db.cows.get(cow.id)
    if (local && local.synced === 0) continue
    await db.cows.put({ ...cow, synced: 1 })
    cowsImported++
  }

  for (const cow of remoteCows) {
    const remoteDaily = await fetchDailyRecordsFromTurso(cow.id)
    for (const rec of remoteDaily) {
      const local = await db.dailyRecords.get(rec.id)
      if (local && local.synced === 0) continue
      await db.dailyRecords.put({ ...rec, synced: 1 })
      dailyImported++
    }
  }

  console.log('[pullFromTurso] imported:', cowsImported, 'cows,', dailyImported, 'daily')
  return { cows: cowsImported, daily: dailyImported }
}

export async function getPendingCount(): Promise<number> {
  const cows = await db.cows.where('synced').equals(0).count()
  const daily = await db.dailyRecords.where('synced').equals(0).count()
  return cows + daily
}
