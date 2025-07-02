import React, { useState, useEffect } from 'react';
import { Product, Store, Employee, ProductMovement } from '../types';
import { supabase } from '../lib/supabase';

interface ProductMovementProps {
  products: Product[];
  stores: Store[];
  employees: Employee[];
  onSubmit: (movement: Partial<ProductMovement>) => void;
}

export const ProductMovementComponent: React.FC<ProductMovementProps> = ({
  products,
  employees,
}) => {
  const [movementType, setMovementType] = useState<'SALE' | 'TRANSFER' | 'STOCK_IN'>('SALE');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [fromStore, setFromStore] = useState('');
  const [toStore, setToStore] = useState('');
  const [employee, setEmployee] = useState('');
  const [stores, setStores] = useState<Store[]>([]);

useEffect(() => {
  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("*");
    if (error) {
      console.error("Error al cargar tiendas:", error.message);
    } else {
      setStores(data);
    }
  };

  fetchStores();
}, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const movement: Partial<ProductMovement> = {
      product_id: selectedProduct,
      quantity,
      movement_type: movementType,
      employee_id: employee,
      from_store_id: movementType === 'STOCK_IN' ? null : fromStore,
      to_store_id: movementType === 'SALE' ? null : toStore,
      created_at: new Date().toISOString(),
    };
  
    const { error } = await supabase.from('product_movements').insert(movement);
    if (error) {
      console.error("Error al registrar el movimiento:", error.message);
      return;
    }
  
    // Reset form
    setSelectedProduct('');
    setQuantity(1);
    setFromStore('');
    setToStore('');
    setEmployee('');
  };
  

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Registrar Movimiento de Producto</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Movimiento
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="SALE">Venta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="STOCK_IN">Entrada de Stock</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Producto
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar producto</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Empleado
            </label>
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar empleado</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {`${emp.first_name} ${emp.last_name}`}
                </option>
              ))}
            </select>
          </div>

          {movementType !== 'STOCK_IN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Desde Tienda
              </label>
              <select
                value={fromStore}
                onChange={(e) => setFromStore(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar tienda</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {movementType === 'TRANSFER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hacia Tienda
              </label>
              <select
                value={toStore}
                onChange={(e) => setToStore(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar tienda</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Registrar Movimiento
          </button>
        </div>
      </form>
    </div>
  );
};