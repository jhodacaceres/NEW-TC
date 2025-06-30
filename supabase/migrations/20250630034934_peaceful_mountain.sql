/*
  # Apply transfers table schema

  This migration ensures the transfers and transfer_items tables exist with the correct schema.
  
  1. Tables
    - `transfers` - Transfer records between stores
    - `transfer_items` - Items included in each transfer
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create transfers table if it doesn't exist
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_store_id uuid NOT NULL REFERENCES stores(id),
  to_store_id uuid NOT NULL REFERENCES stores(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  transfer_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create transfer_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transfers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transfer_items;

CREATE POLICY "Allow all for authenticated users" ON transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON transfer_items FOR ALL TO authenticated USING (true) WITH CHECK (true);