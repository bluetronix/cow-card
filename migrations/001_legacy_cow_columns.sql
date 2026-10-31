-- Columns added to `cows` across earlier releases.
-- The runner ignores "duplicate column name" errors, so this file is safe
-- to run against fresh databases created from schema.sql.
--
-- Core columns (id, user_id, id_no, tag, sex, created_at) are assumed to
-- exist on any pre-migration database and are not re-added here.

ALTER TABLE cows ADD COLUMN name TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN breed TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN colour TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN origin TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN birth_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN group_name TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN collar_no TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN rfid_no TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN dam_id TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN dam_breed TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN sire_id TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN sire_breed TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN lactations INTEGER DEFAULT 0;
ALTER TABLE cows ADD COLUMN calving_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN pd_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN pd_group TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN pregnancy_result TEXT DEFAULT 'Open';
ALTER TABLE cows ADD COLUMN ai_service_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN expected_dry_off_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN expected_calving_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN days_in_milk INTEGER DEFAULT 0;
ALTER TABLE cows ADD COLUMN peak_milk_yield REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN current_daily_milk_yield REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN total_lactation_yield REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN fat_percent REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN protein_percent REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN projected_305d_milk_yield REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN vaccinations TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN deworming_dates TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN mastitis_history TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN body_condition_score REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN dead_qtr_teat TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN quarter_teat_status TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN medical_records TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN vet_recommendations TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN feeding_group TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN milking_group TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN barn_name TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN housing TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN cull_status TEXT DEFAULT '-';
ALTER TABLE cows ADD COLUMN abortion_count INTEGER DEFAULT 0;
ALTER TABLE cows ADD COLUMN remarks TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN issued_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN issued_by TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN image_url TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN lactation_history TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN current_health_status TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN last_checkup_date TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN front_image_url TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN side_image_url TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN rear_image_url TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN head_image_url TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN weight_kg REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN expected_mature_weight_kg REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN average_daily_gain REAL DEFAULT 0;
ALTER TABLE cows ADD COLUMN temperament TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN horn_status TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN category TEXT DEFAULT 'Cow';
