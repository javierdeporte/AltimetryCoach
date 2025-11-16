-- Add show_grade_labels column to shared_routes table
ALTER TABLE shared_routes 
ADD COLUMN show_grade_labels BOOLEAN NOT NULL DEFAULT false;