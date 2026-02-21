-- Add website and location fields to profiles
ALTER TABLE profiles ADD COLUMN website text;
ALTER TABLE profiles ADD COLUMN location text;
