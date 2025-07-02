import React from 'react';
import { format } from 'date-fns';
import { ProductMovement, Product, Store, Employee } from '../types';

interface MovementHistoryProps {
  movements: ProductMovement[];
  products: Product[];
  stores: Store[];
  employees: Employee[];
  selectedDate?: Date; 
  selectedProduct?: string;
}

export const MovementHistory: React.FC<MovementHistoryProps> = ({
  movements,
  products,
  stores,
  employees,
  selectedDate,
  selectedProduct
}) => {
  const getProductName = (id: string) => {
    const product = products.find(p => p.id === id);
    return product ? product.name : 'Producto no encontrado';
  };

  const getStoreName = (id: string) => {
    const store = stores.find(s => s.id === id);
    return store ? store.name : 'Tienda no encontrada';
  };

  const getEmployeeName = (id: string) => {
    const employee = employees.find(e => e.id === id);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Empleado no encontrado';
  };

  const filteredMovements = movements.filter(movement => {
    let include = true;
    
    if (selectedDate) {
      const movementDate = new Date(movement.created_at);
      include = include && 
        movementDate.getDate() === selectedDate.getDate() &&
        movementDate.getMonth() === selectedDate.getMonth() &&
        movementDate.getFullYear() === selectedDate.getFullYear();
    }
    
    if (selectedProduct) {
      include = include && movement.product_id === selectedProduct;
    }
    
    return include;
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Desde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hacia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empleado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMovements.map((movement) => (
              <tr key={movement.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getProductName(movement.product_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.movement_type === 'SALE' && 'Venta'}
                  {movement.movement_type === 'TRANSFER' && 'Transferencia'}
                  {movement.movement_type === 'STOCK_IN' && 'Entrada'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.from_store_id ? getStoreName(movement.from_store_id) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movement.to_store_id ? getStoreName(movement.to_store_id) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getEmployeeName(movement.employee_id)}
                </td>
              </tr>
            ))}
            {filteredMovements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No hay movimientos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};