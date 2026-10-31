import Dexie, { type Table } from 'dexie'
import type {
  Cow,
  DailyRecord,
  Group,
  PendingDelete,
  VetVisit,
  HealthIncident,
  Treatment,
  LamenessSession,
  VaccinationRecord,
} from '../types'

const cowStores = 'id, user_id, id_no, tag, sex, synced, created_at, updated_at, deleted_at'
const dailyStores = 'id, cow_id, date, synced, created_at, updated_at, deleted_at'
const vetVisitStores = 'id, cow_id, visit_date, synced, created_at, updated_at, deleted_at'
const incidentStores = 'id, cow_id, incident_date, incident_type, status, synced, created_at, updated_at, deleted_at'
const treatmentStores = 'id, cow_id, incident_id, treatment_date, synced, created_at, updated_at, deleted_at'
const lamenessStores = 'id, cow_id, session_date, synced, created_at, updated_at, deleted_at'
const vaccinationStores = 'id, cow_id, vaccine_name, scheduled_date, synced, created_at, updated_at, deleted_at'
const groupStores = 'id, name, type, created_at, updated_at, issued_by, issued_date, deleted_at'

export class CowDatabase extends Dexie {
  cows!: Table<Cow, string>
  dailyRecords!: Table<DailyRecord, string>
  vetVisits!: Table<VetVisit, string>
  healthIncidents!: Table<HealthIncident, string>
  treatments!: Table<Treatment, string>
  lamenessSessions!: Table<LamenessSession, string>
  vaccinationRecords!: Table<VaccinationRecord, string>
  groups!: Table<Group, string>
  pendingDeletes!: Table<PendingDelete, string>

  constructor() {
    super('CowCardDB')
    this.version(1).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
    })
    this.version(2).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
      dailyRecords: 'id, cow_id, date, synced, created_at',
    })
    this.version(4).stores({
      cows: 'id, user_id, id_no, tag, sex, synced, created_at',
      dailyRecords: 'id, cow_id, date, synced, created_at',
      vetVisits: 'id, cow_id, visit_date, synced, created_at',
      healthIncidents: 'id, cow_id, incident_date, incident_type, status, synced, created_at',
      treatments: 'id, cow_id, incident_id, treatment_date, synced, created_at',
      lamenessSessions: 'id, cow_id, session_date, synced, created_at',
      vaccinationRecords: 'id, cow_id, vaccine_name, scheduled_date, synced, created_at',
      groups: 'id, name, type, created_at, updated_at, issued_by, issued_date',
    })
    this.version(5).stores({
      cows: cowStores,
      dailyRecords: dailyStores,
      vetVisits: vetVisitStores,
      healthIncidents: incidentStores,
      treatments: treatmentStores,
      lamenessSessions: lamenessStores,
      vaccinationRecords: vaccinationStores,
      groups: groupStores,
    })
    this.version(6).stores({
      cows: cowStores,
      dailyRecords: dailyStores,
      vetVisits: vetVisitStores,
      healthIncidents: incidentStores,
      treatments: treatmentStores,
      lamenessSessions: lamenessStores,
      vaccinationRecords: vaccinationStores,
      groups: groupStores,
      pendingDeletes: 'id, table, record_id, created_at',
    })
  }
}

export const db = new CowDatabase()
