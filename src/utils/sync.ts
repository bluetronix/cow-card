import { db } from '../db/dexie'
import { syncCow, syncDailyRecord } from '../db/turso'

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

export async function getPendingCount(): Promise<number> {
  const cows = await db.cows.where('synced').equals(0).count()
  const daily = await db.dailyRecords.where('synced').equals(0).count()
  return cows + daily
}
