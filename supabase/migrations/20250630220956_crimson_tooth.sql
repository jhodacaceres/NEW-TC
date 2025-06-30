/*
  # Fix Missing Database Tables

  1. New Tables
    - `product_barcodes_store` - Direct relationship between stores, products and barcodes
    - `transfer_product` - Items in transfers (referenced by Transfer.tsx)
    - Update employees table to include store_id column

  2. Changes
    - Add store_id column to employees table for store assignment
    - Update products table to use cost_price instead of cost_price_usd
    - Create the missing tables that the application expects

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Add store_id column to employees table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN store_id uuid REFERENCES stores(id);
  END IF;
END $$;

-- Update products table to use cost_price instead of cost_price_usd
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'cost_price_usd'
  ) THEN
    ALTER TABLE products RENAME COLUMN cost_price_usd TO cost_price;
  END IF;
END $$;

-- Create product_barcodes_store table (direct relationship)
CREATE TABLE IF NOT EXISTS product_barcodes_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  barcode text UNIQUE NOT NULL,
  is_sold boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  sold_at timestamptz
);

-- Create transfer_product table (referenced by Transfer.tsx)
CREATE TABLE IF NOT EXISTS transfer_product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE product_barcodes_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_product ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Allow all for authenticated users" ON product_barcodes_store FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON transfer_product FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Update employees with store assignments for testing
UPDATE employees 
SET store_id = '550e8400-e29b-41d4-a716-446655440001' 
WHERE username = 'admin';

UPDATE employees 
SET store_id = '550e8400-e29b-41d4-a716-446655440002' 
WHERE username = 'juan';

-- Add some sample barcodes for testing
INSERT INTO product_barcodes_store (store_id, product_id, barcode) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', '1234567890123'),
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', '1234567890124'),
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440006', '1234567890125'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', '1234567890126')
ON CONFLICT (barcode) DO NOTHING;