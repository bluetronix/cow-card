import Dexie, { type Table } from 'dexie'
import type { Cow, DailyRecord, VetVisit, HealthIncident, Treatment, LamenessSession, VaccinationRecord } from '../types'

export class CowDatabase extends Dexie {
  cows!: Table<Cow, string>
  dailyRecords!: Table<DailyRecord, string>
  vetVisits!: Table<VetVisit, string>
  healthIncidents!: Table<HealthIncident, string>
  treatments!: Table<Treatment, string>
  lamenessSessions!: Table<LamenessSession, string>
  vaccinationRecords!: Table<VaccinationRecord, string>

  constructor() {
    super('CowCardDB')
    this.version(1).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
    })
    this.version(2).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
      dailyRecords: 'id, cow_id, date, synced, created_at',
    })
    this.version(3).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
      dailyRecords: 'id, cow_id, date, synced, created_at',
      vetVisits: 'id, cow_id, visit_date, synced, created_at',
      healthIncidents: 'id, cow_id, incident_date, incident_type, status, synced, created_at',
      treatments: 'id, cow_id, incident_id, treatment_date, synced, created_at',
      lamenessSessions: 'id, cow_id, session_date, synced, created_at',
      vaccinationRecords: 'id, cow_id, vaccine_name, scheduled_date, synced, created_at',
    })
  }
}

export const db = new CowDatabase()
