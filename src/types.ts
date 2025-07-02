export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  phone?: string;
  username: string;
  password: string;
  ci?: number;
  store_id?: string; // Nueva columna para asignar empleado a tienda
  active?: boolean;
}

export interface Product {
  id: string;
  name: string;
  color: string;
  image?: string;
  cost_price: number;
  profit_bob: number;
  ram?: number;
  rom?: number;
  processor?: string;
  store_id?: string;
  employee_id?: string;
  active?: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  barcode?: string; // Para productos con código de barras asignado
}

export interface Store {
  id: string;
  name: string;
  address: string;
}

export interface Supplier {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  employee_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  employee_id: string;
  total_sale: number;
  type_of_payment?: string;
  quantity_products?: number;
  sale_date: string;
}

export interface SaleProduct {
  id: string;
  sale_id: string;
  product_id: string;
  meis?: string[]; // Array de MEIs
}

export interface Transfer {
  id: string;
  store_origin_id: string;
  store_destiny_id: string;
  employee_id: string;
  transfer_date: string;
}

export interface TransferProduct {
  id: string;
  transfer_id: string;
  product_id: string;
}

export interface ExchangeRate {
  id: string;
  rate: number;
  employee_id?: string;
  created_at: string;
}

export interface DashboardStats {
  totalSales: number;
  totalProducts: number;
  totalEmployees: number;
  totalSuppliers: number;
  recentSales: Sale[];
  recentTransfers: Transfer[];
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  employee_id?: string;
  order_date: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  price_unit: number;
}

export interface PurchaseOrderPayment {
  id: string;
  order_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  employee_id?: string;
}

export interface StoreInventory {
  id: string;
  store_id: string;
  product_id: string;
  Barcode: string; // Cambiado a string para manejar códigos alfanuméricos
}

// Nueva interfaz para códigos de barras por tienda
export interface ProductBarcodeStore {
  id: string;
  store_id: string;
  product_id: string;
  barcode: string;
  is_sold: boolean;
  created_at: string;
  sold_at?: string;
}