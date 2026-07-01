export type HealthStatus = 'Healthy' | 'Sick' | 'Under Treatment' | ''

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
  age?: string
  group_name: string
  dam_id: string
  bull_name: string
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
  feeding_group: string
  milking_group: string
  pen_barn_no: string
  housing: string
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
export type PregnancyResult = 'Pregnant' | 'Open' | ''
