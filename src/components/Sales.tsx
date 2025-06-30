import React, { useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { Printer, Edit } from "lucide-react";

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
  products: {
    product_name: string;
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
        }

        await fetchAvailableProducts();
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

  // Obtener productos disponibles
  const fetchAvailableProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .gt("stock_quantity", 0);

      if (error) throw error;
      setAvailableProducts(data || []);
    } catch (error) {
      console.error("Error fetching available products:", error);
    }
  };

  // Filtrar productos
  const filteredProducts = searchTerm
    ? availableProducts.filter((product) => {
        const term = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(term) ||
          product.color.toLowerCase().includes(term)
        );
      })
    : [];

  // Calcular precio final en bolivianos (redondeado)
  const calculateFinalPrice = (costPrice: number, profitBob: number) => {
    return Math.round(costPrice * exchangeRate + profitBob);
  };

  // Calcular total
  const calculateTotal = (products: any[]) => {
    const total = products.reduce(
      (total, item) => total + calculateFinalPrice(item.cost_price, item.profit_bob) * item.quantity,
      0
    );
    setTotalSale(total);
  };

  // Manejar selección de producto
  const handleProductSelect = (product: any) => {
    const existingProduct = selectedProducts.find((p) => p.id === product.id);
    if (existingProduct) {
      // Incrementar cantidad si ya existe
      const updatedProducts = selectedProducts.map((p) =>
        p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      );
      setSelectedProducts(updatedProducts);
      calculateTotal(updatedProducts);
    } else {
      // Agregar nuevo producto
      const updatedProducts = [...selectedProducts, { ...product, quantity: 1 }];
      setSelectedProducts(updatedProducts);
      calculateTotal(updatedProducts);
    }
    setSearchTerm("");
  };

  // Eliminar producto de la venta
  const removeProductFromSale = (productId: string) => {
    const updatedProducts = selectedProducts.filter((item) => item.id !== productId);
    setSelectedProducts(updatedProducts);
    calculateTotal(updatedProducts);
  };

  // Actualizar cantidad de producto
  const updateProductQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedProducts = selectedProducts.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setSelectedProducts(updatedProducts);
    calculateTotal(updatedProducts);
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

    try {
      // Crear la venta
      const saleId = crypto.randomUUID();
      const { error: saleError } = await supabase
        .from("sales")
        .insert([
          {
            id: saleId,
            employee_id: currentEmployee.id,
            total_sale: totalSale,
            type_of_payment: paymentType,
            quantity_products: selectedProducts.reduce((sum, p) => sum + p.quantity, 0),
            sale_date: new Date().toISOString(),
          },
        ]);

      if (saleError) throw saleError;

      // Crear los productos vendidos
      for (const product of selectedProducts) {
        for (let i = 0; i < product.quantity; i++) {
          const { error: saleProductError } = await supabase
            .from("sale_product")
            .insert([
              {
                sale_id: saleId,
                product_id: product.id,
              },
            ]);

          if (saleProductError) throw saleProductError;
        }

        // Actualizar stock del producto
        const { error: stockUpdateError } = await supabase
          .from("products")
          .update({
            stock_quantity: product.stock_quantity - product.quantity,
          })
          .eq("id", product.id);

        if (stockUpdateError) throw stockUpdateError;
      }

      // Limpiar formulario
      setSelectedProducts([]);
      setTotalSale(0);
      setPaymentType("efectivo");

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

  // Obtener historial de ventas
  const fetchSalesHistory = async () => {
    try {
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          total_sale,
          type_of_payment,
          quantity_products,
          employees!employee_id (first_name, last_name)
        `)
        .order("sale_date", { ascending: false })
        .limit(10);

      if (salesError) throw salesError;

      if (salesData) {
        const enrichedSales = await Promise.all(
          salesData.map(async (sale: any) => {
            // Obtener productos vendidos
            const { data: saleProducts } = await supabase
              .from("sale_product")
              .select(`
                products!product_id (name)
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
              products: saleProducts?.map((sp: any) => ({
                product_name: sp.products?.name || "Producto no encontrado",
              })) || [],
            };
          })
        );

        setSalesHistory(enrichedSales);
      }
    } catch (error) {
      console.error("Error fetching sales history:", error);
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
            </div>
            <table class="products">
              <thead>
                <tr>
                  <th>Producto</th>
                </tr>
              </thead>
              <tbody>
                ${sale.products.map(product => `
                  <tr>
                    <td>${product.product_name}</td>
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Nueva Venta</h2>
        <Toaster />
        
        {/* Información del empleado */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        <div className="space-y-6">
          {/* Búsqueda de productos */}
          <div className="relative">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="search"
                value={searchTerm}
                ref={searchRef}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar producto por nombre o color..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleScanner}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
              >
                Buscar
              </button>
            </div>

            {/* Lista de productos filtrados */}
            {searchTerm && filteredProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-4"
                  >
                    <img
                      src={product.image || "https://placehold.co/48x48?text=No+Image"}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        Color: {product.color}
                      </p>
                      <p className="text-sm text-blue-600 font-medium">
                        {calculateFinalPrice(product.cost_price, product.profit_bob)} Bs. | Stock: {product.stock_quantity}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de pago */}
          <div className="flex items-center space-x-4 mb-4">
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
                    key={product.id}
                    className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={product.image || "https://placehold.co/64x64?text=No+Image"}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-600">
                          Color: {product.color}
                        </p>
                        <p className="text-sm font-medium text-blue-600">
                          Precio: {calculateFinalPrice(product.cost_price, product.profit_bob)} Bs. c/u
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateProductQuantity(product.id, product.quantity - 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                          disabled={product.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{product.quantity}</span>
                        <button
                          onClick={() => updateProductQuantity(product.id, product.quantity + 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                          disabled={product.quantity >= product.stock_quantity}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeProductFromSale(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-xl font-medium">Total a pagar:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {totalSale} Bs.
                  </span>
                </div>
              </div>

              {/* Botón de venta */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaleSubmit}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Registrar Venta
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Historial de ventas */}
      <section className="bg-white rounded-lg shadow overflow-hidden sm:block my-8 p-6">
        <h2 className="text-xl font-semibold mb-6">Historial de Ventas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesHistory.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize">{sale.type_of_payment}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {sale.quantity_products} productos
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-green-600">
                      {sale.total_sale} Bs.
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {sale.employee_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handlePrintSale(sale)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Imprimir"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-900"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {salesHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};