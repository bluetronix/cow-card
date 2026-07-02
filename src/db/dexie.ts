import Dexie, { type Table } from 'dexie'
import type { Cow, DailyRecord } from '../types'
import { showToast, formatError } from '../composables/useToast'

export class CowDatabase extends Dexie {
  cows!: Table<Cow, string>
  dailyRecords!: Table<DailyRecord, string>

  constructor() {
    super('CowCardDB')
    this.version(1).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
    })
    this.version(2).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
      dailyRecords: 'id, cow_id, date, synced, created_at',
    })
  }

  isReady(): Promise<boolean> {
    return this.open().then(() => true).catch(e => {
      console.error('[Dexie] open failed:', e)
      showToast(formatError(e, 'Local database failed to open.'), 'error')
      return false
    })
  }
}

export const db = new CowDatabase()
