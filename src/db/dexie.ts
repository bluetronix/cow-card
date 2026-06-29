import Dexie, { type Table } from 'dexie'
import type { Cow, DailyRecord } from '../types'

export class CowDatabase extends Dexie {
  cows!: Table<Cow, string>
  dailyRecords!: Table<DailyRecord, string>

  constructor() {
    super('CowCardDB')
    this.version(1).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
      dailyRecords: 'id, cow_id, date, synced, created_at'
    })
  }
}

export const db = new CowDatabase()
