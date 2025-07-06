import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { Calendar, Download, ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Logo from "../assets/LOGO.png";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
  const [selectedType, setSelectedType] = useState<
    "all" | "sales" | "transfers" | "purchase_orders"
  >("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  
  // Estados de paginación
  const [offset, setOffset] = useState(0);
  const [limitItems] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Establecer fecha actual como predeterminada si no hay fechas seleccionadas
        const currentDate = format(new Date(), "yyyy-MM-dd");
        const effectiveStartDate = startDate || currentDate;
        const effectiveEndDate = endDate || currentDate;

        const [
          { data: salesData },
          { data: transfersData },
          { data: purchaseData },
          { data: purchaseItemsData },
          { data: productsData },
          { data: storesData },
          { data: employeesData },
          { data: saleItemsData },
          { data: transferItemsData },
        ] = await Promise.all([
          supabase
            .from("sales")
            .select("*")
            .gte("sale_date", `${effectiveStartDate}T00:00:00`)
            .lte("sale_date", `${effectiveEndDate}T23:59:59`)
            .order("sale_date", { ascending: false })
            .range(offset, offset + limitItems - 1),
          supabase
            .from("transfers")
            .select("*")
            .gte("transfer_date", `${effectiveStartDate}T00:00:00`)
            .lte("transfer_date", `${effectiveEndDate}T23:59:59`)
            .order("transfer_date", { ascending: false })
            .range(offset, offset + limitItems - 1),
          supabase
            .from("purchase_orders")
            .select("*")
            .gte("order_date", `${effectiveStartDate}T00:00:00`)
            .lte("order_date", `${effectiveEndDate}T23:59:59`)
            .order("order_date", { ascending: false })
            .range(offset, offset + limitItems - 1),
          supabase.from("purchase_order_items").select("*"),
          supabase.from("products").select("*"),
          supabase.from("stores").select("*"),
          supabase.from("employees").select("*"),
          supabase.from("sale_product").select(`
            *,
            product_barcodes_store!barcode_id (barcode)
          `),
          supabase.from("transfer_product").select(`
            *,
            product_barcodes_store!barcode_id (barcode)
          `),
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

        // Determinar si hay más datos
        const totalItems = (salesData?.length || 0) + (transfersData?.length || 0) + (purchaseData?.length || 0);
        setHasMore(totalItems === limitItems);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [offset, startDate, endDate]);

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
    return employee
      ? `${employee.first_name} ${employee.last_name}`
      : "Empleado no encontrado";
  };

  const getSaleItems = (saleId: string) => {
    return saleItems.filter((item) => item.sale_id === saleId);
  };

  const getTransferItems = (transferId: string) => {
    return transferItems.filter((item) => item.transfer_id === transferId);
  };

  const getPurchaseOrderItems = (orderId: string) => {
    return purchaseOrderItems.filter((item) => item.order_id === orderId);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Fecha no disponible";

    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? "Fecha inválida"
        : format(date, "dd/MM/yyyy HH:mm:ss");
    } catch (error) {
      console.error("Error al formatear fecha:", error);
      return "Fecha inválida";
    }
  };

  // Prepare movements data with proper filtering
  const allMovements = [
    // Sales
    ...sales.map((sale) => {
      const items = getSaleItems(sale.id);
      return {
        id: `sale-${sale.id}`,
        type: "sales" as const,
        date: sale.sale_date,
        product:
          items.length > 0
            ? getProductName(items[0].product_id)
            : "Sin productos",
        quantity: items.length,
        storeId: sale.store_id,
        store: getStoreName(sale.store_id),
        employee: getEmployeeName(sale.employee_id),
        items: items.map((item) => ({
          productId: item.product_id,
          productName: getProductName(item.product_id),
          barcode: item.product_barcodes_store?.barcode || "N/A",
          mei_codes: item.mei_codes || [],
        })),
        status: "Completado",
        total: sale.total_sale,
      };
    }),

    // Transfers
    ...transfers.map((transfer) => {
      const items = getTransferItems(transfer.id);
      return {
        id: `transfer-${transfer.id}`,
        type: "transfers" as const,
        date: transfer.transfer_date,
        product:
          items.length > 0
            ? getProductName(items[0].product_id)
            : "Sin productos",
        quantity: items.length,
        fromStoreId: transfer.store_origin_id,
        fromStore: getStoreName(transfer.store_origin_id),
        toStoreId: transfer.store_destiny_id,
        toStore: getStoreName(transfer.store_destiny_id),
        employee: getEmployeeName(transfer.employee_id),
        items: items.map((item) => ({
          productId: item.product_id,
          productName: getProductName(item.product_id),
          barcode: item.product_barcodes_store?.barcode || "N/A",
        })),
        status: `De ${getStoreName(transfer.store_origin_id)} a ${getStoreName(
          transfer.store_destiny_id
        )}`,
      };
    }),

    // Purchase Orders
    ...purchaseOrders.map((order) => {
      const items = getPurchaseOrderItems(order.id);
      return {
        id: `order-${order.id}`,
        type: "purchase_orders" as const,
        date: order.order_date,
        product:
          items.length > 0
            ? getProductName(items[0].product_id)
            : "Sin productos",
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        store: "-",
        employee: getEmployeeName(order.employee_id),
        items: items.map((item) => ({
          productId: item.product_id,
          productName: getProductName(item.product_id),
          quantity: item.quantity,
        })),
        status:
          order.status === "approved"
            ? "Aprobada"
            : order.status === "pending"
            ? "Pendiente"
            : "Rechazada",
        total: order.total_amount,
      };
    }),
  ];

  // Aplicar filtros
  const filteredMovements = allMovements
    .filter((movement) => {
      // Filtro por tipo
      if (selectedType !== "all" && movement.type !== selectedType)
        return false;

      // Filtro por tienda
      if (selectedStore) {
        if (movement.type === "sales") {
          return movement.storeId === selectedStore;
        }
        if (movement.type === "transfers") {
          return (
            movement.fromStoreId === selectedStore ||
            movement.toStoreId === selectedStore
          );
        }
      }
      return true;
    })
    // Ordenar por fecha descendente
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const generateDetails = (movement: any) => {
    switch (movement.type) {
      case "sales":
        return `Total: ${movement.total} Bs. | Tienda: ${movement.store}`;
      case "transfers":
        return `${movement.fromStore} → ${movement.toStore} | ${movement.quantity} productos`;
      case "purchase_orders":
        return `Estado: ${movement.status} | Total: ${movement.total}`;
      default:
        return "";
    }
  };

  // Función para generar PDF
  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
    });

    // 1. Configuración inicial
    const margin = 15; // Margen en mm
    const imageWidth = 30;
    const imageHeight = 20;
    let yPosition = 20; // Posición Y inicial

    // 2. Posición de la imagen (superior derecha)
    const pageWidth = doc.internal.pageSize.getWidth();
    const imageX = pageWidth - margin - imageWidth; // Derecha - margen - ancho imagen

    // Agregar imagen en esquina superior derecha
    doc.addImage(Logo, "PNG", imageX, yPosition, imageWidth, imageHeight);

    // 3. Posición del texto (debajo de la imagen, pero en margen izquierdo)
    yPosition += margin; // Espacio después de la imagen

    // Texto principal (izquierda)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Reporte de Movimientos", margin, yPosition);

    // Texto secundario (izquierda)
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Detalles del reporte:", margin, yPosition + 5);

    // 4. Ajustar posición Y para contenido siguiente
    yPosition += 15; // Espacio después del texto
    autoTable(doc, {
      startY: yPosition,
      head: [["Fecha", "Tipo", "Productos", "Códigos", "Detalles", "Empleado"]],
      body: filteredMovements.map((movement) => [
        formatDate(movement.date),
        movement.type === "sales" ? "Venta" : "Transferencia",
        movement.items.map((item) => item.productName).join(", "),
        movement.items
          .map((item, index) => {
            if (item.mei_codes && item.mei_codes.length > 0) {
              return item.mei_codes.map((mei, meiIndex) => `MEI${meiIndex + 1}: ${mei}`).join(", ");
            }
            return item.barcode;
          })
          .filter((b) => b !== "N/A")
          .join(", ") || "N/A",
        generateDetails(movement),
        movement.employee,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: "auto" },
        5: { cellWidth: 30 },
      },
    });
    const dateCurrent = new Date().getFullYear();
    const footerText = `© ${dateCurrent} Tiendas Móvil Axcel - Todos los derechos reservados`;
    const footerY = doc.internal.pageSize.height - 10; // 10mm desde abajo

    // Texto centrado
    doc.setFontSize(10);
    doc.text(
      footerText,
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
    // 5. Guardar el PDF
    doc.save(`movimientos_${new Date().toISOString()}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Cargando...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Filtros</h3>
          <button
            onClick={generatePDF}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Download size={16} />
            Descargar PDF
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Tienda
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-4 py-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="sales">Ventas</option>
              <option value="transfers">Transferencias</option>
              <option value="purchase_orders">Órdenes de Compra</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicial
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg px-4 py-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500 pl-10"
              />
              <Calendar
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Final
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 pl-10"
              />
              <Calendar
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
            </div>
          </div>
        </div>

        {/* Botón para limpiar filtros */}
        <div className="mt-4">
          <button
            onClick={() => {
              setSelectedStore("");
              setSelectedType("all");
              setStartDate("");
              setEndDate("");
              setOffset(0);
            }}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de movimientos - Vista escritorio */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              Movimientos ({filteredMovements.length})
            </h2>
            <div>
              <span>Mostrando {filteredMovements.length} Movimientos</span>
              <div className="flex items-center gap-4 justify-center mt-4">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(offset - limitItems)}
                  className={`p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors ${
                    offset === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <ArrowLeftIcon size={20} />
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => setOffset(offset + limitItems)}
                  className={`p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors ${
                    !hasMore
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <ArrowRightIcon size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Vista de tabla para escritorio */}
          <div className="hidden lg:block overflow-x-auto">
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
                    Producto Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Códigos de Barras/MEI
                  </th>
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
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              movement.type === "sales"
                                ? "bg-green-100 text-green-800"
                                : movement.type === "transfers"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {movement.type === "sales"
                              ? "Venta"
                              : movement.type === "transfers"
                              ? "Transferencia"
                              : "Orden de Compra"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {movement.items.length > 0
                            ? movement.items[0].productName
                            : "Sin productos"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {movement.items.length > 0 ? (
                            movement.items[0].mei_codes && movement.items[0].mei_codes.length > 0 ? (
                              movement.items[0].mei_codes.map((mei, index) => (
                                <div key={index}>MEI{index + 1}: {mei}</div>
                              ))
                            ) : (
                              movement.items[0].barcode
                            )
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {movement.type === "sales" && (
                            <div>
                              <div>Total: {movement.total} Bs.</div>
                              <div className="text-gray-500">
                                Tienda: {movement.store}
                              </div>
                            </div>
                          )}
                          {movement.type === "transfers" && (
                            <div>
                              <div>
                                {movement.fromStore} → {movement.toStore}
                              </div>
                              <div className="text-gray-500">
                                {movement.quantity} productos
                              </div>
                            </div>
                          )}
                          {movement.type === "purchase_orders" && (
                            <div>
                              <div>Estado: {movement.status}</div>
                              <div className="text-gray-500">
                                Total: {movement.total}
                              </div>
                            </div>
                          )}
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
                              <h4 className="font-medium mb-2">
                                Todos los productos:
                              </h4>
                              <div className="space-y-2">
                                {movement.items.map(
                                  (item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-3 rounded border"
                                    >
                                      <div className="font-medium">
                                        {item.productName}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        Código de barras: {item.barcode}
                                      </div>
                                      {item.mei_codes &&
                                        item.mei_codes.length > 0 && (
                                          <div className="text-sm text-gray-600">
                                            {item.mei_codes.map((mei: string, meiIndex: number) => (
                                              <div key={meiIndex}>MEI{meiIndex + 1}: {mei}</div>
                                            ))}
                                          </div>
                                        )}
                                      {item.quantity && (
                                        <div className="text-sm text-gray-600">
                                          Cantidad: {item.quantity}
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No hay movimientos que coincidan con los filtros
                      seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas para móvil y tablet */}
          <div className="lg:hidden space-y-4">
            {filteredMovements.length > 0 ? (
              filteredMovements.map((movement) => (
                <div key={movement.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        movement.type === "sales"
                          ? "bg-green-100 text-green-800"
                          : movement.type === "transfers"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {movement.type === "sales"
                        ? "Venta"
                        : movement.type === "transfers"
                        ? "Transferencia"
                        : "Orden de Compra"}
                    </span>
                    <button
                      onClick={() => toggleRowExpand(movement.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {expandedRows[movement.id] ? "Ocultar" : "Ver más"}
                    </button>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="font-medium">
                      {formatDate(movement.date)}
                    </div>

                    <div>
                      <span className="text-gray-600">Producto principal:</span>{" "}
                      {movement.items.length > 0
                        ? movement.items[0].productName
                        : "Sin productos"}
                    </div>

                    <div>
                      <span className="text-gray-600">Códigos:</span>{" "}
                      {movement.items.length > 0 ? (
                        movement.items[0].mei_codes && movement.items[0].mei_codes.length > 0 ? (
                          movement.items[0].mei_codes.map((mei, index) => (
                            <div key={index}>MEI{index + 1}: {mei}</div>
                          ))
                        ) : (
                          movement.items[0].barcode
                        )
                      ) : (
                        "N/A"
                      )}
                    </div>

                    {movement.type === "sales" && (
                      <>
                        <div>
                          <span className="text-gray-600">Total:</span>{" "}
                          {movement.total} Bs.
                        </div>
                        <div>
                          <span className="text-gray-600">Tienda:</span>{" "}
                          {movement.store}
                        </div>
                      </>
                    )}

                    {movement.type === "transfers" && (
                      <>
                        <div>
                          <span className="text-gray-600">Ruta:</span>{" "}
                          {movement.fromStore} → {movement.toStore}
                        </div>
                        <div>
                          <span className="text-gray-600">Productos:</span>{" "}
                          {movement.quantity}
                        </div>
                      </>
                    )}

                    {movement.type === "purchase_orders" && (
                      <>
                        <div>
                          <span className="text-gray-600">Estado:</span>{" "}
                          {movement.status}
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>{" "}
                          {movement.total}
                        </div>
                      </>
                    )}

                    <div>
                      <span className="text-gray-600">Empleado:</span>{" "}
                      {movement.employee}
                    </div>
                  </div>

                  {expandedRows[movement.id] && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="font-medium mb-2 text-sm">
                        Todos los productos:
                      </h4>
                      <div className="space-y-2">
                        {movement.items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white p-2 rounded border text-xs"
                          >
                            <div className="font-medium">
                              {item.productName}
                            </div>
                            <div className="text-gray-600">
                              Código de barras: {item.barcode}
                            </div>
                            {item.mei_codes && item.mei_codes.length > 0 && (
                              <div className="text-gray-600">
                                {item.mei_codes.map((mei: string, meiIndex: number) => (
                                  <div key={meiIndex}>MEI{meiIndex + 1}: {mei}</div>
                                ))}
                              </div>
                            )}
                            {item.quantity && (
                              <div className="text-gray-600">
                                Cantidad: {item.quantity}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No hay movimientos que coincidan con los filtros seleccionados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};