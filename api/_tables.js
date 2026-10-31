export const TABLES = {
  cows: [
    'id', 'user_id', 'id_no', 'tag', 'collar_no', 'rfid_no', 'name', 'sex', 'breed',
    'colour', 'origin', 'birth_date', 'group_name', 'dam_id', 'dam_breed', 'sire_id',
    'sire_breed', 'lactations', 'calving_date', 'pd_date', 'pd_group', 'pregnancy_result',
    'ai_service_date', 'expected_dry_off_date', 'expected_calving_date', 'days_in_milk',
    'peak_milk_yield', 'current_daily_milk_yield', 'total_lactation_yield', 'fat_percent',
    'protein_percent', 'projected_305d_milk_yield', 'vaccinations', 'deworming_dates',
    'mastitis_history', 'body_condition_score', 'dead_qtr_teat', 'quarter_teat_status',
    'medical_records', 'vet_recommendations', 'feeding_group', 'milking_group', 'barn_name',
    'housing', 'cull_status', 'abortion_count', 'remarks', 'issued_date', 'issued_by',
    'image_url', 'lactation_history', 'current_health_status', 'last_checkup_date',
    'category', 'front_image_url', 'side_image_url', 'rear_image_url', 'head_image_url',
    'weight_kg', 'expected_mature_weight_kg', 'average_daily_gain', 'temperament',
    'horn_status', 'created_at', 'updated_at', 'deleted_at',
  ],
  daily_records: [
    'id', 'cow_id', 'date', 'milk_yield_morning', 'milk_yield_evening', 'milk_yield_total',
    'health_status', 'last_checkup_date', 'temperature', 'symptoms', 'treatment_given',
    'health_notes', 'notes', 'created_at', 'updated_at', 'deleted_at',
  ],
  vet_visits: [
    'id', 'cow_id', 'visit_date', 'vet_name', 'diagnosis', 'notes', 'temperature',
    'heart_rate', 'respiration_rate', 'weight', 'body_condition_score', 'created_at',
    'updated_at', 'deleted_at',
  ],
  health_incidents: [
    'id', 'cow_id', 'incident_date', 'incident_type', 'severity', 'status', 'affected_area',
    'description', 'treatment_given', 'resolved_date', 'created_at', 'updated_at', 'deleted_at',
  ],
  treatments: [
    'id', 'cow_id', 'incident_id', 'treatment_date', 'medication', 'dosage', 'route',
    'duration_days', 'withdrawal_days', 'administered_by', 'next_due_date', 'notes',
    'created_at', 'updated_at', 'deleted_at',
  ],
  lameness_sessions: [
    'id', 'cow_id', 'session_date', 'duration_seconds', 'gait_amplitude_avg',
    'gait_amplitude_max', 'limp_detected', 'confidence_score', 'waveform_data',
    'created_at', 'updated_at', 'deleted_at',
  ],
  vaccination_records: [
    'id', 'cow_id', 'vaccine_name', 'scheduled_date', 'administered_date',
    'administered_by', 'batch_no', 'next_due_date', 'notes', 'created_at',
    'updated_at', 'deleted_at',
  ],
}

export const PUBLIC_COW_COLUMNS = [
  'id', 'id_no', 'tag', 'name', 'sex', 'breed', 'colour', 'birth_date',
  'category', 'cull_status', 'current_health_status', 'last_checkup_date',
  'image_url', 'front_image_url', 'side_image_url', 'rear_image_url', 'head_image_url',
  'updated_at',
]
