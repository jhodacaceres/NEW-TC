/*
  # Add customer_phone column to sales table

  1. Changes
    - Add `customer_phone` column to `sales` table
    - Column is nullable (optional) as customer phone is not required for all sales
    - Uses text data type to accommodate various phone number formats

  2. Notes
    - This resolves the database error where the application tries to query a non-existent column
    - The column is added as nullable since customer phone is optional in the sales process
*/

-- Add customer_phone column to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE sales ADD COLUMN customer_phone text;
  END IF;
END $$;