/*
  # Add customer information to sales table

  1. Changes
    - Add `customer_name` column to sales table (optional text field)
    - Add `customer_phone` column to sales table (optional text field)
    
  2. Security
    - No changes to RLS policies needed as these are just additional optional fields
*/

-- Add customer_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE sales ADD COLUMN customer_name text;
  END IF;
END $$;

-- Add customer_phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE sales ADD COLUMN customer_phone text;
  END IF;
END $$;