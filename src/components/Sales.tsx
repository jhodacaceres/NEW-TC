import React, { useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { Printer, Edit, ArrowLeftIcon, ArrowRightIcon, Save, X, Plus, Minus } from "lucide-react";

interface SalesProps {
  exchangeRate: number;
}

interface SaleHistoryItem {
  id: string;
  sale_date: string;
  total_sale: number;
  type_of_payment: string;
  quantity_products: number;
  employee_name: string;
  store_name: string;
  products: {
    product_name: string;
    barcode: string;
    mei_codes: string[];
  }[];
}

export const Sales: React.FC<SalesProps> = ({ exchangeRate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleHistoryItem[]>([]);
  const [totalSale, setTotalSale] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>("efectivo");
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [editingSale, setEditingSale] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isScannerInput, setIsScannerInput] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [meiCodes, setMeiCodes] = useState<Record<string, string[]>>({});
  const [showMeiInput, setShowMeiInput] = useState<Record<string, boolean>>({});
  
  // Pagination states
  const [offset, setOffset] = useState(0);
  const [limitItems] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener empleado actual del localStorage
        const employeeData = localStorage.getItem('currentEmployee');
        if (employeeData) {
          const employee = JSON.parse(employeeData);
          setCurrentEmployee(employee);
          
          // Si es admin, cargar todas las tiendas
          if (employee.position === 'administrador') {
            await fetchStores();
          } else {
            // Si es empleado de ventas, usar su tienda asignada
            setSelectedStoreId(employee.store_id || '');
          }
        }

        await fetchSalesHistory();

      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar los datos", {
          duration: 3000,
          position: "top-right",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cargar productos cuando cambie la tienda seleccionada
  useEffect(() => {
    if (selectedStoreId) {
      fetchAvailableProducts();
    }
  }, [selectedStoreId]);

  // Recargar historial cuando cambie la paginación
  useEffect(() => {
    fetchSalesHistory();
  }, [offset]);

  // Obtener tiendas (solo para admin)
  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  // Obtener productos disponibles de la tienda seleccionada
  const fetchAvailableProducts = async () => {
    try {
      if (!selectedStoreId) {
        console.warn("No store selected");
        setAvailableProducts([]);
        return;
      }

      const { data, error } = await supabase
        .from("product_barcodes_store")
        .select(`
          id,
          barcode,
          product_id,
          store_id,
          products!product_id (
            id,
            name,
            color,
            image,
            cost_price,
            profit_bob
          )
        `)
        .eq("store_id", selectedStoreId)
        .eq("is_sold", false);

      if (error) throw error;

      // Formatear los datos para incluir el código de barras con el producto
      const formattedProducts = data?.map((item: any) => ({
        barcode_id: item.id,
        barcode: item.barcode,
        store_id: item.store_id,
        ...item.products,
      })) || [];

      setAvailableProducts(formattedProducts);
    } catch (error) {
      console.error("Error fetching available products:", error);
      setAvailableProducts([]);
    }
  };

  // Filtrar productos
  const filteredProducts = searchTerm
    ? availableProducts.filter((product) => {
        const term = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(term) ||
          product.color.toLowerCase().includes(term) ||
          product.barcode.toLowerCase().includes(term)
        );
      })
    : [];

  // Calcular precio final en bolivianos (redondeado)
  const calculateFinalPrice = (costPrice: number, profitBob: number) => {
    return Math.round(costPrice * exchangeRate + profitBob);
  };

  // Calcular total automáticamente
  const calculateTotal = (products: any[]) => {
    const total = products.reduce(
      (total, item) => total + calculateFinalPrice(item.cost_price, item.profit_bob),
      0
    );
    setTotalSale(total);
  };

  // Manejar selección de producto
  const handleProductSelect = (product: any) => {
    const existingProduct = selectedProducts.find((p) => p.barcode_id === product.barcode_id);
    if (existingProduct) {
      toast.error("Este código de barras ya fue escaneado");
      return;
    }

    const updatedProducts = [...selectedProducts, product];
    setSelectedProducts(updatedProducts);
    calculateTotal(updatedProducts);
    setSearchTerm("");
    setIsScannerInput(false);
    
    // Inicializar MEI codes para este producto
    setMeiCodes(prev => ({
      ...prev,
      [product.barcode_id]: []
    }));
  };

  // Eliminar producto de la venta
  const removeProductFromSale = (barcodeId: string) => {
    const updatedProducts = selectedProducts.filter((item) => item.barcode_id !== barcodeId);
    setSelectedProducts(updatedProducts);
    calculateTotal(updatedProducts);
    
    // Limpiar MEI codes
    setMeiCodes(prev => {
      const newMeiCodes = { ...prev };
      delete newMeiCodes[barcodeId];
      return newMeiCodes;
    });
    setShowMeiInput(prev => {
      const newShowMei = { ...prev };
      delete newShowMei[barcodeId];
      return newShowMei;
    });
  };

  // Manejar cambio manual del total
  const handleTotalChange = (newTotal: number) => {
    setTotalSale(newTotal);
  };

  // Agregar código MEI
  const addMeiCode = (barcodeId: string, meiCode: string) => {
    if (!meiCode.trim()) return;
    
    setMeiCodes(prev => ({
      ...prev,
      [barcodeId]: [...(prev[barcodeId] || []), meiCode.trim()]
    }));
  };

  // Eliminar código MEI
  const removeMeiCode = (barcodeId: string, index: number) => {
    setMeiCodes(prev => ({
      ...prev,
      [barcodeId]: prev[barcodeId].filter((_, i) => i !== index)
    }));
  };

  // Manejar envío de venta
  const handleSaleSubmit = async () => {
    if (selectedProducts.length === 0) {
      return toast.error("Debe seleccionar al menos un producto", {
        duration: 3000,
        position: "top-right",
      });
    }

    if (!currentEmployee) {
      return toast.error("Error: No se pudo identificar el empleado", {
        duration: 3000,
        position: "top-right",
      });
    }

    if (!selectedStoreId) {
      return toast.error("Error: Debe seleccionar una tienda", {
        duration: 3000,
        position: "top-right",
      });
    }

    // Verificar que todos los productos tengan al menos un código MEI
    for (const product of selectedProducts) {
      const productMeiCodes = meiCodes[product.barcode_id] || [];
      if (productMeiCodes.length === 0) {
        return toast.error(`Debe agregar al menos un código MEI para ${product.name}`, {
          duration: 3000,
          position: "top-right",
        });
      }
    }

    try {
      // Crear la venta
      const saleId = crypto.randomUUID();
      const { error: saleError } = await supabase
        .from("sales")
        .insert([
          {
            id: saleId,
            employee_id: currentEmployee.id,
            store_id: selectedStoreId,
            total_sale: totalSale,
            type_of_payment: paymentType,
            quantity_products: selectedProducts.length,
            sale_date: new Date().toISOString(),
          },
        ]);

      if (saleError) throw saleError;

      // Crear los productos vendidos y marcar códigos como vendidos
      for (const product of selectedProducts) {
        // Insertar en sale_product con MEI codes
        const { error: saleProductError } = await supabase
          .from("sale_product")
          .insert([
            {
              sale_id: saleId,
              product_id: product.id,
              barcode_id: product.barcode_id,
              mei_codes: meiCodes[product.barcode_id] || [],
            },
          ]);

        if (saleProductError) throw saleProductError;

        // Marcar código de barras como vendido
        const { error: barcodeUpdateError } = await supabase
          .from("product_barcodes_store")
          .update({
            is_sold: true,
            sold_at: new Date().toISOString(),
          })
          .eq("id", product.barcode_id);

        if (barcodeUpdateError) throw barcodeUpdateError;
      }

      // Limpiar formulario
      setSelectedProducts([]);
      setTotalSale(0);
      setPaymentType("efectivo");
      setMeiCodes({});
      setShowMeiInput({});

      // Recargar datos
      await fetchAvailableProducts();
      await fetchSalesHistory();

      toast.success("¡Venta registrada exitosamente!", {
        duration: 3000,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Error al registrar la venta", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  // Obtener historial de ventas con paginación
  const fetchSalesHistory = async () => {
    try {
      const employeeData = localStorage.getItem('currentEmployee');
      if (!employeeData) {
        console.warn("No employee data found in localStorage");
        setSalesHistory([]);
        return;
      }

      const employee = JSON.parse(employeeData);
      
      let query = supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          total_sale,
          type_of_payment,
          quantity_products,
          store_id,
          employees!employee_id (first_name, last_name),
          stores!store_id (name)
        `)
        .order("sale_date", { ascending: false })
        .range(offset, offset + limitItems - 1);

      // Si no es administrador, filtrar por tienda
      if (employee.position !== 'administrador') {
        if (!employee.store_id) {
          console.warn("Employee store_id is missing or undefined for non-admin:", employee);
          setSalesHistory([]);
          toast.error("Error: El empleado no tiene una tienda asignada");
          return;
        }
        query = query.eq('store_id', employee.store_id);
      }

      const { data: salesData, error: salesError } = await query;

      if (salesError) throw salesError;

      if (salesData) {
        const enrichedSales = await Promise.all(
          salesData.map(async (sale: any) => {
            // Obtener productos vendidos con códigos de barras y MEI
            const { data: saleProducts } = await supabase
              .from("sale_product")
              .select(`
                barcode_id,
                mei_codes,
                products!product_id (name),
                product_barcodes_store!barcode_id (barcode)
              `)
              .eq("sale_id", sale.id);

            return {
              id: sale.id,
              sale_date: sale.sale_date,
              total_sale: sale.total_sale,
              type_of_payment: sale.type_of_payment || "",
              quantity_products: sale.quantity_products || 0,
              employee_name: sale.employees 
                ? `${sale.employees.first_name} ${sale.employees.last_name || ''}`
                : "Empleado no encontrado",
              store_name: sale.stores?.name || "Tienda no encontrada",
              products: saleProducts?.map((sp: any) => ({
                product_name: sp.products?.name || "Producto no encontrado",
                barcode: sp.product_barcodes_store?.barcode || "N/A",
                mei_codes: sp.mei_codes || [],
              })) || [],
            };
          })
        );

        setSalesHistory(enrichedSales);
        setHasMore(enrichedSales.length === limitItems);
      }
    } catch (error) {
      console.error("Error fetching sales history:", error);
      setSalesHistory([]);
    }
  };

  // Manejar escáner
  const handleScanner = () => {
    if (searchRef.current) {
      searchRef.current.focus();
      toast.success("Puede escanear el código", {
        duration: 3000,
        position: "top-right",
      });
      setIsScannerInput(true);
    }
  };

  // Función para imprimir venta
  const handlePrintSale = (sale: SaleHistoryItem) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura - ${sale.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .details { margin-bottom: 20px; }
              .products { width: 100%; border-collapse: collapse; }
              .products th, .products td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .products th { background-color: #f2f2f2; }
              .total { text-align: right; font-weight: bold; margin-top: 20px; }
              .mei-codes { font-size: 0.9em; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>FACTURA DE VENTA</h2>
              <p>Fecha: ${format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}</p>
            </div>
            <div class="details">
              <p><strong>Tipo de Pago:</strong> ${sale.type_of_payment}</p>
              <p><strong>Cantidad de Productos:</strong> ${sale.quantity_products}</p>
              <p><strong>Vendedor:</strong> ${sale.employee_name}</p>
              <p><strong>Tienda:</strong> ${sale.store_name}</p>
            </div>
            <table class="products">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código de Barras</th>
                  <th>Códigos MEI</th>
                </tr>
              </thead>
              <tbody>
                ${sale.products.map(product => `
                  <tr>
                    <td>${product.product_name}</td>
                    <td>${product.barcode}</td>
                    <td class="mei-codes">${product.mei_codes.join(', ')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              <h3>Total: ${sale.total_sale} Bs.</h3>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Iniciar edición de venta (solo administradores)
  const startEditSale = (sale: SaleHistoryItem) => {
    if (currentEmployee?.position !== 'administrador') {
      toast.error("Solo los administradores pueden editar ventas");
      return;
    }
    setEditingSale(sale.id);
    setEditFormData({
      type_of_payment: sale.type_of_payment,
      total_sale: sale.total_sale,
      products: sale.products,
    });
  };

  // Guardar edición de venta
  const saveEditSale = async () => {
    if (!editingSale) return;

    try {
      const { error } = await supabase
        .from("sales")
        .update({
          type_of_payment: editFormData.type_of_payment,
          total_sale: editFormData.total_sale,
          quantity_products: editFormData.products.length,
        })
        .eq("id", editingSale);

      if (error) throw error;

      toast.success("Venta actualizada exitosamente");
      setEditingSale(null);
      setEditFormData({});
      await fetchSalesHistory();
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error("Error al actualizar la venta");
    }
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingSale(null);
    setEditFormData({});
  };

  // Eliminar producto de venta registrada (solo admin)
  const removeProductFromRecordedSale = async (saleId: string, productIndex: number) => {
    if (currentEmployee?.position !== 'administrador') {
      toast.error("Solo los administradores pueden modificar ventas");
      return;
    }

    try {
      // Obtener el producto a eliminar
      const { data: saleProducts } = await supabase
        .from("sale_product")
        .select("id, barcode_id")
        .eq("sale_id", saleId);

      if (saleProducts && saleProducts[productIndex]) {
        const productToRemove = saleProducts[productIndex];

        // Eliminar el producto de la venta
        const { error: deleteError } = await supabase
          .from("sale_product")
          .delete()
          .eq("id", productToRemove.id);

        if (deleteError) throw deleteError;

        // Marcar el código de barras como no vendido
        const { error: updateError } = await supabase
          .from("product_barcodes_store")
          .update({
            is_sold: false,
            sold_at: null,
          })
          .eq("id", productToRemove.barcode_id);

        if (updateError) throw updateError;

        toast.success("Producto eliminado de la venta");
        await fetchSalesHistory();
      }
    } catch (error) {
      console.error("Error removing product from sale:", error);
      toast.error("Error al eliminar producto de la venta");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <section className="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-6">Nueva Venta</h2>
        <Toaster />
        
        {/* Información del empleado */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Vendedor:</p>
              <p className="font-medium">
                {currentEmployee ? `${currentEmployee.first_name} ${currentEmployee.last_name || ''}` : 'No identificado'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tipo de Cambio:</p>
              <p className="font-medium">{exchangeRate} Bs/USD</p>
            </div>
            {/* Selector de tienda para admin */}
            {currentEmployee?.position === 'administrador' && (
              <div>
                <p className="text-sm text-gray-600">Tienda:</p>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Seleccionar tienda</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Búsqueda de productos */}
          <div className="relative">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
              <input
                type="search"
                value={searchTerm}
                ref={searchRef}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar producto por nombre, color o código..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleScanner}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
              >
                Escanear Código
              </button>
            </div>

            {/* Lista de productos filtrados */}
            {searchTerm && filteredProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.barcode_id}
                    onClick={() => handleProductSelect(product)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-4"
                  >
                    <img
                      src={product.image || "https://placehold.co/48x48?text=No+Image"}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-gray-600 truncate">
                        Color: {product.color}
                      </p>
                      <p className="text-sm text-blue-600 font-medium">
                        {calculateFinalPrice(product.cost_price, product.profit_bob)} Bs.
                      </p>
                      <p className="text-xs text-gray-500">
                        Código: {product.barcode}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de pago */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
            <label className="text-sm font-medium text-gray-700">Tipo de Pago:</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          {/* Productos seleccionados */}
          {selectedProducts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">
                Productos Seleccionados ({selectedProducts.length})
              </h3>
              <div className="space-y-4">
                {selectedProducts.map((product) => (
                  <div
                    key={product.barcode_id}
                    className="bg-gray-50 p-4 rounded-lg space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        <img
                          src={product.image || "https://placehold.co/64x64?text=No+Image"}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.name}</h4>
                          <p className="text-sm text-gray-600 truncate">
                            Color: {product.color}
                          </p>
                          <p className="text-sm font-medium text-blue-600">
                            Precio: {calculateFinalPrice(product.cost_price, product.profit_bob)} Bs.
                          </p>
                          <p className="text-xs text-gray-500">
                            Código: {product.barcode}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeProductFromSale(product.barcode_id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Códigos MEI */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-700">
                          Códigos MEI ({(meiCodes[product.barcode_id] || []).length})
                        </h5>
                        <button
                          onClick={() => setShowMeiInput(prev => ({
                            ...prev,
                            [product.barcode_id]: !prev[product.barcode_id]
                          }))}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {showMeiInput[product.barcode_id] ? 'Ocultar' : 'Agregar MEI'}
                        </button>
                      </div>

                      {/* Lista de códigos MEI */}
                      <div className="space-y-1 mb-2">
                        {(meiCodes[product.barcode_id] || []).map((mei, index) => (
                          <div key={index} className="flex items-center justify-between bg-white px-2 py-1 rounded text-sm">
                            <span className="font-mono">{mei}</span>
                            <button
                              onClick={() => removeMeiCode(product.barcode_id, index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Input para nuevo código MEI */}
                      {showMeiInput[product.barcode_id] && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ingrese código MEI"
                            className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const input = e.target as HTMLInputElement;
                                addMeiCode(product.barcode_id, input.value);
                                input.value = '';
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                              addMeiCode(product.barcode_id, input.value);
                              input.value = '';
                            }}
                            className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}

                      {(meiCodes[product.barcode_id] || []).length === 0 && (
                        <p className="text-xs text-red-500 italic">
                          ⚠️ Debe agregar al menos un código MEI
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total editable */}
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                  <span className="text-xl font-medium">Total a pagar:</span>
                  <input
                    type="number"
                    value={totalSale}
                    onChange={(e) => handleTotalChange(Number(e.target.value))}
                    className="text-xl font-bold text-blue-600 bg-white border border-gray-300 rounded px-3 py-1 w-full sm:w-auto text-right"
                    min="0"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Puede modificar el total si es necesario
                </p>
              </div>

              {/* Botón de venta */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaleSubmit}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Registrar Venta
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Historial de ventas */}
      <section className="bg-white rounded-lg shadow overflow-hidden my-8">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Historial de Ventas</h2>
            <div>
              <span>Mostrando {salesHistory.length} Ventas</span>
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
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tienda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesHistory.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editingSale === sale.id ? (
                        <div className="space-y-2">
                          {editFormData.products.map((product: any, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div>
                                <div className="font-medium">{product.product_name}</div>
                                <div className="text-xs text-gray-500">Código: {product.barcode}</div>
                                <div className="text-xs text-gray-500">MEI: {product.mei_codes.join(', ')}</div>
                              </div>
                              {currentEmployee?.position === 'administrador' && (
                                <button
                                  onClick={() => removeProductFromRecordedSale(sale.id, index)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {sale.products.map((product, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">{product.product_name}</div>
                              <div className="text-xs text-gray-500">Código: {product.barcode}</div>
                              <div className="text-xs text-gray-500">MEI: {product.mei_codes.join(', ')}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingSale === sale.id ? (
                        <select
                          value={editFormData.type_of_payment}
                          onChange={(e) => setEditFormData({...editFormData, type_of_payment: e.target.value})}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="transferencia">Transferencia</option>
                        </select>
                      ) : (
                        <span className="capitalize">{sale.type_of_payment}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingSale === sale.id ? (
                        <input
                          type="number"
                          value={editFormData.total_sale}
                          onChange={(e) => setEditFormData({...editFormData, total_sale: parseInt(e.target.value)})}
                          className="border rounded px-2 py-1 text-sm w-20"
                        />
                      ) : (
                        <span className="font-medium text-green-600">
                          {sale.total_sale} Bs.
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.employee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.store_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingSale === sale.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEditSale}
                            className="text-green-600 hover:text-green-900"
                            title="Guardar"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePrintSale(sale)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Imprimir"
                          >
                            <Printer size={18} />
                          </button>
                          {currentEmployee?.position === 'administrador' && (
                            <button
                              onClick={() => startEditSale(sale)}
                              className="text-green-600 hover:text-green-900"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {salesHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No hay ventas registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="md:hidden space-y-4">
            {salesHistory.map((sale) => (
              <div key={sale.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium">
                    {format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}
                  </div>
                  <div className="flex space-x-2">
                    {editingSale === sale.id ? (
                      <>
                        <button
                          onClick={saveEditSale}
                          className="text-green-600 hover:text-green-900"
                          title="Guardar"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-600 hover:text-red-900"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePrintSale(sale)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Imprimir"
                        >
                          <Printer size={16} />
                        </button>
                        {currentEmployee?.position === 'administrador' && (
                          <button
                            onClick={() => startEditSale(sale)}
                            className="text-green-600 hover:text-green-900"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Productos:</span>
                    <div className="mt-1 space-y-1">
                      {sale.products.map((product, index) => (
                        <div key={index} className="bg-white p-2 rounded text-xs">
                          <div className="font-medium">{product.product_name}</div>
                          <div className="text-gray-500">Código: {product.barcode}</div>
                          <div className="text-gray-500">MEI: {product.mei_codes.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de Pago:</span>
                    {editingSale === sale.id ? (
                      <select
                        value={editFormData.type_of_payment}
                        onChange={(e) => setEditFormData({...editFormData, type_of_payment: e.target.value})}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    ) : (
                      <span className="capitalize">{sale.type_of_payment}</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    {editingSale === sale.id ? (
                      <input
                        type="number"
                        value={editFormData.total_sale}
                        onChange={(e) => setEditFormData({...editFormData, total_sale: parseInt(e.target.value)})}
                        className="border rounded px-2 py-1 text-xs w-20"
                      />
                    ) : (
                      <span className="font-medium text-green-600">
                        {sale.total_sale} Bs.
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vendedor:</span>
                    <span>{sale.employee_name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tienda:</span>
                    <span>{sale.store_name}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {salesHistory.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No hay ventas registradas
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};