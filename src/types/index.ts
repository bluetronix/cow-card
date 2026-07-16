export type HealthStatus = 'Healthy' | 'On Treatment' | 'Sick' | 'Frequently Sick' | ''

export interface DailyRecord {
  id: string
  cow_id: string
  date: string
  milk_yield_morning: number
  milk_yield_evening: number
  milk_yield_total: number
  health_status: HealthStatus
  last_checkup_date: string
  temperature: number
  symptoms: string
  treatment_given: string
  health_notes: string
  notes: string
  created_at: string
  synced: number
}

export interface LactationEntry {
  number: number
  calving_date: string
  yield_305d: number
  peak_yield: number
  total_yield: number
  remarks: string
}

export interface User {
  id: string
  username: string
  full_name: string
  password_hash: string
  created_at: string
}

export interface Cow {
  id: string
  user_id: string
  id_no: string
  tag: string
  collar_no: string
  rfid_no: string
  name: string
  sex: 'Male' | 'Female' | ''
  breed: string
  colour: string
  origin: string
  birth_date: string
  group_name: string
  dam_id: string
  dam_breed: string
  sire_id: string
  sire_breed: string
  lactations: number
  calving_date: string
  pd_date: string
  pd_group: string
  pregnancy_result: 'Pregnant' | 'Open' | ''
  ai_service_date: string
  expected_dry_off_date: string
  expected_calving_date: string
  days_in_milk: number
  peak_milk_yield: number
  current_daily_milk_yield: number
  total_lactation_yield: number
  fat_percent: number
  protein_percent: number
  projected_305d_milk_yield: number
  vaccinations: string
  deworming_dates: string
  mastitis_history: string
  body_condition_score: number
  dead_qtr_teat: string
  quarter_teat_status: string
  medical_records: string
  vet_recommendations: string
  feeding_group: string
  milking_group: string
  barn_name: string
  housing: string
  cull_status: '+' | '-' | ''
  abortion_count: number
  remarks: string
  issued_date: string
  issued_by: string
  image_url: string
  created_at: string
  updated_at: string
  synced: number
  lactation_history: string
  current_health_status: HealthStatus
  last_checkup_date: string
}

export const BREEDS = ['Holstein Friesian', 'Ayrshire', 'Jersey', 'Cross', 'Boran', 'Other'] as const
export const COLOURS = ['Black and White', 'Brown and White', 'Brown', 'Black and Brown', 'Black', 'White', 'Red', 'Grey', 'Other'] as const
export const LACTATION_OPTIONS = [1,2,3,4,5,6,7,8,9,10] as const
export const PD_GROUP_OPTIONS = ['Late', 'Early'] as const
export const MASTITIS_OPTIONS = ['None', 'Regularly recovers', 'Chronic (Never Recovers)'] as const
export const HEALTH_STATUS_OPTIONS = ['Healthy', 'On Treatment', 'Sick', 'Frequently Sick'] as const
export const FEEDING_GROUPS = ['1', '2', '3', '4'] as const
export const MILKING_GROUPS = ['High Prod', 'Med Prod', 'Low Prod', 'Recovery'] as const
export const MILKING_MAP: Record<string, string> = { '1': 'High Prod', '2': 'Med Prod', '3': 'Low Prod', '4': 'Recovery' }
export const BARN_NAMES = ['Bulunde A', 'Bulunde B', 'Tezengwa A', 'Tezengwa B', 'Ushirika A', 'Ushirika B', 'Mwalesela A', 'Mwalesela B', 'Kashishi A', 'Kashishi B', 'Maisela A'] as const
export type PregnancyResult = 'Pregnant' | 'Open' | ''

export type IncidentType = 'lameness' | 'mastitis' | 'injury' | 'respiratory' | 'metabolic' | 'other'
export type Severity = 'mild' | 'moderate' | 'severe'
export type IncidentStatus = 'open' | 'resolved' | 'ongoing'

export interface VetVisit {
  id: string; cow_id: string; visit_date: string; vet_name: string
  diagnosis: string; notes: string; temperature: number
  heart_rate: number; respiration_rate: number; weight: number
  body_condition_score: number; created_at: string; synced: number
}

export interface HealthIncident {
  id: string; cow_id: string; incident_date: string
  incident_type: IncidentType; severity: Severity; status: IncidentStatus
  affected_area: string; description: string; treatment_given: string
  resolved_date: string; created_at: string; synced: number
}

export interface Treatment {
  id: string; cow_id: string; incident_id: string
  treatment_date: string; medication: string; dosage: string
  route: string; duration_days: number; withdrawal_days: number
  administered_by: string
  next_due_date: string; notes: string; created_at: string; synced: number
}

export interface LamenessSession {
  id: string; cow_id: string; session_date: string
  duration_seconds: number; gait_amplitude_avg: number
  gait_amplitude_max: number; limp_detected: boolean
  confidence_score: number; waveform_data: string
  created_at: string; synced: number
}

export interface VaccinationRecord {
  id: string; cow_id: string; vaccine_name: string
  scheduled_date: string; administered_date: string
  administered_by: string; batch_no: string; next_due_date: string
  notes: string; created_at: string; synced: number
}
