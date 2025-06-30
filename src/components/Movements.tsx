import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";

export const Movements: React.FC = () => {
  // Estados
  const [sales, setSales] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [transferItems, setTransferItems] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"all" | "sales" | "transfers" | "purchase_orders">("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [
          { data: salesData },
          { data: transfersData },
          { data: purchaseData },
          { data: purchaseItemsData },
          { data: productsData },
          { data: storesData },
          { data: employeesData },
          { data: saleItemsData },
          { data: transferItemsData }
        ] = await Promise.all([
          supabase.from("sales").select("*"),
          supabase.from("transfers").select("*"),
          supabase.from("purchase_orders").select("*"),
          supabase.from("purchase_order_items").select("*"),
          supabase.from("products").select("*"),
          supabase.from("stores").select("*"),
          supabase.from("employees").select("*"),
          supabase.from("sale_items").select("*"),
          supabase.from("transfer_items").select("*")
        ]);

        setSales(salesData || []);
        setTransfers(transfersData || []);
        setPurchaseOrders(purchaseData || []);
        setProducts(productsData || []);
        setStores(storesData || []);
        setEmployees(employeesData || []);
        setPurchaseOrderItems(purchaseItemsData || []);
        setSaleItems(saleItemsData || []);
        setTransferItems(transferItemsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper functions
  const getProductName = (id: string) => {
    const product = products.find((p) => p.id === id);
    return product?.name || "Producto no encontrado";
  };

  const getStoreName = (id: string) => {
    const store = stores.find((s) => s.id === id);
    return store?.name || "Tienda no encontrada";
  };

  const getEmployeeName = (id: string) => {
    const employee = employees.find((e) => e.id === id);
    return employee ? `${employee.first_name} ${employee.last_name}` : "Empleado no encontrado";
  };

  const getSaleItems = (saleId: string) => {
    return saleItems.filter(item => item.sale_id === saleId);
  };

  const getTransferItems = (transferId: string) => {
    return transferItems.filter(item => item.transfer_id === transferId);
  };

  const getPurchaseOrderItems = (orderId: string) => {
    return purchaseOrderItems.filter(item => item.purchase_order_id === orderId);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Fecha no disponible";
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? "Fecha inválida" : format(date, "dd/MM/yyyy HH:mm:ss");
    } catch (error) {
      console.error("Error al formatear fecha:", error);
      return "Fecha inválida";
    }
  };

  // Prepare movements data with proper filtering
  const filteredMovements = [
    // Sales
    ...sales.map((sale) => {
      const items = getSaleItems(sale.id);
      return {
        id: `sale-${sale.id}`,
        type: "sale" as const,
        date: sale.created_at,
        product: items.length > 0 ? getProductName(items[0].product_id) : "Sin productos",
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        storeId: sale.store_id,
        store: getStoreName(sale.store_id),
        employee: getEmployeeName(sale.employee_id),
        items: items.map(item => ({
          productId: item.product_id,
          productName: getProductName(item.product_id),
          quantity: item.quantity,
          price: item.price
        })),
        status: "Completado"
      };
    }),
    
    // Transfers
    ...transfers.map((transfer) => {
      const items = getTransferItems(transfer.id);
      return {
        id: `transfer-${transfer.id}`,
        type: "transfer" as const,
        date: transfer.transfer_date,
        product: items.length > 0 ? getProductName(items[0].product_id) : "Sin productos",
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        fromStoreId: transfer.from_store_id,
        fromStore: getStoreName(transfer.from_store_id),
        toStoreId: transfer.to_store_id,
        toStore: getStoreName(transfer.to_store_id),
        employee: getEmployeeName(transfer.employee_id),
        items: items.map(item => ({
          productId: item.product_id,
          productName: getProductName(item.product_id),
          quantity: item.quantity
        })),
        status: `De ${getStoreName(transfer.from_store_id)} a ${getStoreName(transfer.to_store_id)}`
      };
    }),
    
    // Purchase Orders
    ...purchaseOrders.map((order) => {
      const items = getPurchaseOrderItems(order.id);
      return {
        id: `order-${order.id}`,
        type: "purchase_order" as const,
        date: order.order_date,
        product: items.length > 0 ? getProductName(items[0].product_id) : "Sin productos",
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        store: "-",
        employee: getEmployeeName(order.employee_id),
        items: items.map(item => ({
          productId: item.product_id,
          productName: getProductName(item.product_id),
          quantity: item.quantity,
          price: item.price
        })),
        status: order.status === 'approved' ? 'Aprobada' : order.status === 'pending' ? 'Pendiente' : 'Rechazada'
      };
    })
  ]
  // Filtrado correcto comparando IDs en lugar de nombres
  .filter((movement) => {
    // Filtro por tipo
    if (selectedType !== "all" && movement.type !== selectedType) return false;
    
    // Filtro por tienda
    if (selectedStore) {
      if (movement.type === "sale") {
        return movement.storeId === selectedStore;
      }
      if (movement.type === "transfer") {
        return movement.fromStoreId === selectedStore || movement.toStoreId === selectedStore;
      }
    }
    return true;
  })
  // Ordenar por fecha descendente
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Tienda
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las tiendas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Movimiento
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="sales">Ventas</option>
              <option value="transfers">Transferencias</option>
              <option value="purchase_orders">Órdenes de Compra</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
              {/*  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>*/} 
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovements.length > 0 ? (
                filteredMovements.map((movement) => (
                  <React.Fragment key={movement.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(movement.date)}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          movement.type === "sale" ? "bg-green-100 text-green-800" :
                          movement.type === "transfer" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {movement.type === "sale" ? "Venta" :
                           movement.type === "transfer" ? "Transferencia" :
                           "Orden de Compra"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {movement.items.length > 0 ? movement.items[0].productName : "Sin productos"}
                      </td>
                     {/*<td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        <select 
                          className="border rounded p-1 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {movement.items.map((item: any, idx: number) => (
                            <option key={idx} value={item.productId}>
                              {item.productName} - {item.quantity} unidades
                            </option>
                          ))}
                        </select>
                      </td> */} 
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {movement.type === "sale" ? "Completado" :
                         movement.type === "transfer" ? movement.status :
                         `Estado: ${movement.status}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {movement.employee}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        <button 
                          onClick={() => toggleRowExpand(movement.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {expandedRows[movement.id] ? "Ocultar" : "Ver más"}
                        </button>
                      </td>
                    </tr>
                    {expandedRows[movement.id] && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="ml-8">
                            <h4 className="font-medium mb-2">Detalles completos:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {movement.items.map((item: any, idx: number) => (
                                <li key={idx}>
                                  {item.productName} - Cantidad: {item.quantity}
                                  {item.price && ` - Precio: $${item.price}`}
                                </li>
                              ))}
                            </ul>
                            {movement.type === "transfer" && (
                              <p className="mt-2">
                                <strong>Origen:</strong> {movement.fromStore} → 
                                <strong> Destino:</strong> {movement.toStore}
                              </p>
                            )}
                            {movement.type === "purchase_order" && (
                              <p className="mt-2">
                                <strong>Estado:</strong> {movement.status}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No hay movimientos que coincidan con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};