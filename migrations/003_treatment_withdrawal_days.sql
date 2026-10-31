-- The treatment log records milk/meat withdrawal periods.
ALTER TABLE treatments ADD COLUMN withdrawal_days INTEGER DEFAULT 0;
