import { apiFetch } from './api'
import { formatError } from '../composables/useToast'
import type {
  Cow,
  DailyRecord,
  VetVisit,
  HealthIncident,
  Treatment,
  LamenessSession,
  VaccinationRecord,
} from '../types'

export type AuthResult =
  | { success: true; id: string; username: string; full_name: string }
  | { success: false; error: string }

export function isConnected(): boolean {
  return true
}

async function pushRecord(table: string, record: unknown): Promise<boolean> {
  try {
    await apiFetch('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ table, record }),
    })
    return true
  } catch (e) {
    console.error(`Sync error (${table}):`, e)
    return false
  }
}

async function fetchRows(
  table: string,
  params: Record<string, string | undefined> = {},
): Promise<any[]> {
  const search = new URLSearchParams({ table })
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  }
  const data = await apiFetch(`/sync/pull?${search.toString()}`)
  return (data?.rows || []).map((row: any) => ({ ...row, synced: 1 }))
}

export async function loginUser(username: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    return {
      success: true,
      id: String(data.id),
      username: String(data.username),
      full_name: String(data.full_name || ''),
    }
  } catch (e: any) {
    if (e?.status) {
      return { success: false, error: e.message || 'Invalid username or password' }
    }
    return { success: false, error: formatError(e, 'Login failed. Check your connection.') }
  }
}

export async function registerUser(
  id: string,
  username: string,
  password: string,
  fullName: string = '',
): Promise<AuthResult> {
  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ id, username, password, full_name: fullName }),
    })
    return {
      success: true,
      id: String(data.id || id),
      username: String(data.username || username),
      full_name: String(data.full_name || fullName),
    }
  } catch (e: any) {
    if (e?.status) {
      return { success: false, error: e.message || 'Registration failed' }
    }
    return { success: false, error: formatError(e, 'Registration failed. Check your connection.') }
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Offline logout still clears local state.
  }
}

export function syncCow(cow: Cow): Promise<boolean> {
  return pushRecord('cows', cow)
}

export function syncDailyRecord(record: DailyRecord): Promise<boolean> {
  return pushRecord('daily_records', record)
}

export function syncVetVisit(record: VetVisit): Promise<boolean> {
  return pushRecord('vet_visits', record)
}

export function syncHealthIncident(record: HealthIncident): Promise<boolean> {
  return pushRecord('health_incidents', record)
}

export function syncTreatment(record: Treatment): Promise<boolean> {
  return pushRecord('treatments', record)
}

export function syncLamenessSession(record: LamenessSession): Promise<boolean> {
  return pushRecord('lameness_sessions', record)
}

export function syncVaccinationRecord(record: VaccinationRecord): Promise<boolean> {
  return pushRecord('vaccination_records', record)
}

export async function fetchCows(): Promise<Cow[]> {
  try {
    return (await fetchRows('cows')) as Cow[]
  } catch (e: any) {
    console.error('[fetchCows] error:', e?.message || e)
    return []
  }
}

export async function fetchCowById(id: string): Promise<Cow | null> {
  try {
    const rows = await fetchRows('cows', { id })
    return (rows[0] as Cow) || null
  } catch (e: any) {
    console.error('[fetchCowById] error:', e?.message || e)
    return null
  }
}

export async function fetchDailyRecordsFromTurso(cowId?: string): Promise<DailyRecord[]> {
  try {
    return (await fetchRows('daily_records', { cowId })) as DailyRecord[]
  } catch (e: any) {
    console.error('[fetchDailyRecordsFromTurso] error:', e?.message || e)
    return []
  }
}

export async function fetchVetVisitsFromTurso(cowId?: string): Promise<VetVisit[]> {
  try {
    return (await fetchRows('vet_visits', { cowId })) as VetVisit[]
  } catch (e: any) {
    console.error('[fetchVetVisitsFromTurso] error:', e?.message || e)
    return []
  }
}

export async function fetchHealthIncidentsFromTurso(cowId?: string): Promise<HealthIncident[]> {
  try {
    return (await fetchRows('health_incidents', { cowId })) as HealthIncident[]
  } catch (e: any) {
    console.error('[fetchHealthIncidentsFromTurso] error:', e?.message || e)
    return []
  }
}

export async function fetchTreatmentsFromTurso(cowId?: string): Promise<Treatment[]> {
  try {
    return (await fetchRows('treatments', { cowId })) as Treatment[]
  } catch (e: any) {
    console.error('[fetchTreatmentsFromTurso] error:', e?.message || e)
    return []
  }
}

export async function fetchLamenessSessionsFromTurso(cowId?: string): Promise<LamenessSession[]> {
  try {
    return (await fetchRows('lameness_sessions', { cowId })) as LamenessSession[]
  } catch (e: any) {
    console.error('[fetchLamenessSessionsFromTurso] error:', e?.message || e)
    return []
  }
}

export async function fetchVaccinationRecordsFromTurso(cowId?: string): Promise<VaccinationRecord[]> {
  try {
    return (await fetchRows('vaccination_records', { cowId })) as VaccinationRecord[]
  } catch (e: any) {
    console.error('[fetchVaccinationRecordsFromTurso] error:', e?.message || e)
    return []
  }
}
