import { db } from '../db/dexie'
import type { PendingDelete } from '../types'
import {
  syncCow,
  syncDailyRecord,
  syncVetVisit,
  syncHealthIncident,
  syncTreatment,
  syncLamenessSession,
  syncVaccinationRecord,
} from '../db/turso'

export type LocalTable =
  | 'cows'
  | 'dailyRecords'
  | 'vetVisits'
  | 'healthIncidents'
  | 'treatments'
  | 'lamenessSessions'
  | 'vaccinationRecords'

const CHILD_TABLES: LocalTable[] = [
  'dailyRecords',
  'vetVisits',
  'healthIncidents',
  'treatments',
  'lamenessSessions',
  'vaccinationRecords',
]

export async function queueDelete(table: LocalTable, record: Record<string, any>): Promise<void> {
  const now = new Date().toISOString()
  const tombstone: PendingDelete = {
    id: `${table}:${record.id}`,
    table,
    record_id: String(record.id),
    payload: { ...record, deleted_at: now, synced: 0 },
    created_at: now,
  }
  await db.pendingDeletes.put(tombstone)
  await (db as any)[table].delete(record.id)
}

export async function deleteLocalAndQueue(table: LocalTable, id: string): Promise<void> {
  const record = await (db as any)[table].get(id)
  if (record) await queueDelete(table, record)
}

export async function cascadeDeleteCow(cowId: string): Promise<void> {
  const cow = await db.cows.get(cowId)
  if (cow) await queueDelete('cows', cow)

  for (const table of CHILD_TABLES) {
    const rows = await (db as any)[table].where('cow_id').equals(cowId).toArray()
    for (const row of rows) await queueDelete(table, row)
  }
}

export async function hasPendingDelete(table: LocalTable, id: string): Promise<boolean> {
  return (await db.pendingDeletes.get(`${table}:${id}`)) !== undefined
}

async function pushTombstone(tombstone: PendingDelete): Promise<boolean> {
  const payload = tombstone.payload as any
  switch (tombstone.table) {
    case 'cows': return syncCow(payload)
    case 'dailyRecords': return syncDailyRecord(payload)
    case 'vetVisits': return syncVetVisit(payload)
    case 'healthIncidents': return syncHealthIncident(payload)
    case 'treatments': return syncTreatment(payload)
    case 'lamenessSessions': return syncLamenessSession(payload)
    case 'vaccinationRecords': return syncVaccinationRecord(payload)
    default: return false
  }
}

export async function pushPendingDeletes(): Promise<number> {
  let pushed = 0
  const tombstones = await db.pendingDeletes.toArray()
  for (const tombstone of tombstones) {
    const ok = await pushTombstone(tombstone)
    if (ok) {
      await db.pendingDeletes.delete(tombstone.id)
      pushed++
    }
  }
  return pushed
}
