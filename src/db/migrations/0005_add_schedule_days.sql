-- Migration: Add scheduleDays column for weekday-based scheduling
-- Date: 2026-02-09
-- Description: Adds scheduleDays as JSON array to replace intervalType with more flexible scheduling

-- Add scheduleDays column (defaults to every day for existing medications)
ALTER TABLE medications ADD COLUMN scheduleDays TEXT DEFAULT '[1,2,3,4,5,6,0]';

-- Update existing medications: DAILY → every day, WEEKLY → Monday only (as placeholder)
UPDATE medications SET scheduleDays = '[1,2,3,4,5,6,0]' WHERE intervalType = 'DAILY';
UPDATE medications SET scheduleDays = '[1]' WHERE intervalType = 'WEEKLY';
