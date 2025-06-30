/*
  # Sistema completo de ventas con códigos de barras

  1. Nuevas Tablas
    - `stores` - Tiendas
    - `employees` - Empleados con login
    - `suppliers` - Proveedores
    - `products` - Productos base
    - `store_products` - Productos asignados a tiendas
    - `product_barcodes` - Códigos de barras por producto en tienda
    - `sales` - Ventas registradas
    - `sale_products` - Productos vendidos (por código de barras)
    - `exchange_rates` - Tipos de cambio

  2. Características
    - Ventas basadas en códigos de barras únicos
    - Productos asignados por tienda
    - Precios redondeados sin decimales
    - Registro del empleado que realiza la venta
    - Códigos MEI por producto
    - Sistema de impresión y actualización de ventas

  3. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas para usuarios autenticados
*/

-- Crear tabla de tiendas
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de empleados con sistema de login
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  position text NOT NULL DEFAULT 'ventas',
  phone text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de productos base
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mei_code1 text,
  mei_code2 text,
  color text NOT NULL,
  ram integer DEFAULT 0,
  rom integer DEFAULT 0,
  processor text,
  image text,
  cost_price_usd numeric NOT NULL DEFAULT 0,
  profit_bob integer NOT NULL DEFAULT 0, -- Ganancia en bolivianos (sin decimales)
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de productos por tienda
CREATE TABLE IF NOT EXISTS store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, product_id)
);

-- Crear tabla de códigos de barras por producto en tienda
CREATE TABLE IF NOT EXISTS product_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id uuid NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  barcode text UNIQUE NOT NULL,
  mei_code text, -- Código MEI específico para este código de barras
  is_sold boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  sold_at timestamptz
);

-- Crear tabla de tipos de cambio
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  total_sale integer NOT NULL DEFAULT 0, -- Total en bolivianos sin decimales
  client_name text DEFAULT '',
  client_phone text DEFAULT '',
  sale_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de productos vendidos (por código de barras)
CREATE TABLE IF NOT EXISTS sale_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_barcode_id uuid NOT NULL REFERENCES product_barcodes(id),
  product_id uuid NOT NULL REFERENCES products(id),
  price_bob integer NOT NULL DEFAULT 0, -- Precio en bolivianos sin decimales
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de transferencias
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_store_id uuid NOT NULL REFERENCES stores(id),
  to_store_id uuid NOT NULL REFERENCES stores(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  transfer_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de items de transferencia
CREATE TABLE IF NOT EXISTS transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas para todas las tablas (permitir todo para usuarios autenticados)
CREATE POLICY "Allow all for authenticated users" ON stores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON store_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON product_barcodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON sale_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON transfer_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insertar datos de prueba
INSERT INTO stores (id, name, address) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Tienda Central', 'Av. Principal 123'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Sucursal Norte', 'Calle Norte 456')
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, first_name, last_name, username, password, position, phone) VALUES 
  ('550e8400-e29b-41d4-a716-446655440003', 'Admin', 'Sistema', 'admin', 'admin123', 'administrador', '70000000'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Juan', 'Pérez', 'juan', 'juan123', 'ventas', '70000001')
ON CONFLICT (username) DO NOTHING;

INSERT INTO exchange_rates (rate) VALUES (6.96) ON CONFLICT DO NOTHING;

-- Insertar productos de prueba
INSERT INTO products (id, name, mei_code1, mei_code2, color, ram, rom, processor, cost_price_usd, profit_bob) VALUES 
  ('550e8400-e29b-41d4-a716-446655440005', 'iPhone 14', 'MEI001', 'MEI002', 'Azul', 6, 128, 'A15 Bionic', 800, 500),
  ('550e8400-e29b-41d4-a716-446655440006', 'Samsung Galaxy S23', 'MEI003', 'MEI004', 'Negro', 8, 256, 'Snapdragon 8 Gen 2', 700, 400)
ON CONFLICT (id) DO NOTHING;

-- Asignar productos a tiendas
INSERT INTO store_products (store_id, product_id, stock_quantity) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', 5),
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440006', 3),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 2)
ON CONFLICT (store_id, product_id) DO NOTHING;

-- Crear función para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar timestamps
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_products_updated_at BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();