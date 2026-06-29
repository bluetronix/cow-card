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
  pregnancy_result: 'Pregnant' | 'Open' | ''
  expected_dry_off_date: string
  expected_calving_date: string
  days_in_milk: number
  peak_milk_yield: number
  current_daily_milk_yield: number
  total_lactation_yield: number
  vaccinations: string
  deworming_dates: string
  mastitis_history: string
  body_condition_score: number
  dead_qtr_teat: string
  medical_records: string
  issued_date: string
  issued_by: string
  image_url: string
  created_at: string
  updated_at: string
  synced: number
}

export interface DailyRecord {
  id: string
  cow_id: string
  date: string
  milk_yield: number
  body_condition_score: number
  notes: string
  created_at: string
  synced: number
}

export type PregnancyResult = 'Pregnant' | 'Open' | ''
