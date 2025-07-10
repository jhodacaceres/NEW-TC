import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import {
  Plus,
  Trash2,
  Scan,
  ShoppingCart,
  Edit,
  Save,
  X,
  ArrowLeftIcon,
  ArrowRightIcon,
  Printer,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const STORE_LOGO = `
  █████╗ ██╗  ██╗ ██████╗███████╗██╗     
 ██╔══██╗╚██╗██╔╝██╔════╝██╔════╝██║     
 ███████║ ╚███╔╝ ██║     █████╗  ██║     
 ██╔══██║ ██╔██╗ ██║     ██╔══╝  ██║     
 ██║  ██║██╔╝ ██╗╚██████╗███████╗███████╗
 ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝
   Cellulares homologados
`;

interface Product {
  id: string;
  name: string;
  color: string;
  image?: string;
  cost_price: number;
  profit_bob: number;
  ram: number;
  rom: number;
  processor: string;
}

interface ProductBarcode {
  id: string;
  barcode: string;
  product_id: string;
  store_id: string;
  is_sold: boolean;
  products: Product;
}

interface SelectedProduct {
  barcode_id: string;
  barcode: string;
  product: Product;
  imei_codes: string[];
}

interface Sale {
  id: string;
  sale_date: string;
  total_sale: number;
  type_of_payment: string;
  quantity_products: number;
  customer_name?: string;
  customer_ci?: string;
  customer_phone?: string;
  store_id: string;
  employee_id: string;
  employees?: {
    first_name: string;
    last_name: string;
  };
  stores?: {
    name: string;
  };
}

interface SalesProps {
  exchangeRate: number;
}

export const Sales: React.FC<SalesProps> = ({ exchangeRate }) => {
  // Estados principales
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductBarcode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCI, setCustomerCI] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentType, setPaymentType] = useState("efectivo");
  const [totalAmount, setTotalAmount] = useState(0);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [stores, setStores] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [editingSale, setEditingSale] = useState<string | null>(null);
  const [editPaymentType, setEditPaymentType] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState(0);
  const [isScannerInput, setIsScannerInput] = useState(false);
  
  // Estados de paginación
  const [offset, setOffset] = useState(0);
  const [limitItems] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      const employeeData = localStorage.getItem("currentEmployee");
      if (employeeData) {
        const employee = JSON.parse(employeeData);
        setCurrentEmployee(employee);

        // Cargar tiendas
        const { data: storesData } = await supabase.from("stores").select("*");
        setStores(storesData || []);

        if (employee.position === "administrador") {
          setSelectedStore("");
        } else {
          setSelectedStore(employee.store_id);
        }
      }
    };

    fetchInitialData();
  }, []);

  // Cargar productos cuando cambie la tienda
  useEffect(() => {
    if (selectedStore) {
      fetchAvailableProducts();
    }
  }, [selectedStore]);

  // Cargar historial de ventas
  useEffect(() => {
    fetchSalesHistory();
  }, [offset, currentEmployee]);

  // Calcular total automáticamente
  useEffect(() => {
    const total = selectedProducts.reduce((sum, item) => {
      const finalPrice = item.product.cost_price * exchangeRate + item.product.profit_bob;
      return sum + finalPrice;
    }, 0);
    setTotalAmount(Math.round(total));
  }, [selectedProducts, exchangeRate]);

  const fetchAvailableProducts = async () => {
    if (!selectedStore) return;

    try {
      const { data, error } = await supabase
        .from("product_barcodes_store")
        .select(`
          id,
          barcode,
          product_id,
          store_id,
          is_sold,
          products!product_id (
            id,
            name,
            color,
            image,
            cost_price,
            profit_bob,
            ram,
            rom,
            processor
          )
        `)
        .eq("store_id", selectedStore)
        .eq("is_sold", false);

      if (error) throw error;
      setAvailableProducts(data || []);
    } catch (error) {
      console.error("Error fetching available products:", error);
      toast.error("Error al cargar productos disponibles");
    }
  };

  const fetchSalesHistory = async () => {
    if (!currentEmployee) return;

    try {
      let salesQuery = supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false })
        .range(offset, offset + limitItems - 1);

      if (currentEmployee.position !== "administrador") {
        salesQuery = salesQuery.eq("store_id", currentEmployee.store_id);
      }

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) throw salesError;

      if (salesData && salesData.length > 0) {
        const enrichedSales = await Promise.all(
          salesData.map(async (sale) => {
            const { data: employeeData } = await supabase
              .from("employees")
              .select("first_name, last_name")
              .eq("id", sale.employee_id)
              .single();

            const { data: storeData } = await supabase
              .from("stores")
              .select("name")
              .eq("id", sale.store_id)
              .single();

            return {
              ...sale,
              employees: employeeData,
              stores: storeData,
            };
          })
        );

        setSalesHistory(enrichedSales);
        setHasMore(salesData.length === limitItems);
      } else {
        setSalesHistory([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching sales history:", error);
      toast.error("Error al cargar historial de ventas");
      setSalesHistory([]);
      setHasMore(false);
    }
  };

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

  const handleProductSelect = (productBarcode: ProductBarcode) => {
    if (selectedProducts.find(p => p.barcode_id === productBarcode.id)) {
      toast.error("Este producto ya está agregado");
      return;
    }

    const newProduct: SelectedProduct = {
      barcode_id: productBarcode.id,
      barcode: productBarcode.barcode,
      product: productBarcode.products,
      imei_codes: [],
    };

    setSelectedProducts([...selectedProducts, newProduct]);
    setSearchTerm("");
  };

  const handleIMEIChange = (barcodeId: string, index: number, value: string) => {
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.barcode_id === barcodeId) {
          const newImeiCodes = [...item.imei_codes];
          newImeiCodes[index] = value;
          return { ...item, imei_codes: newImeiCodes };
        }
        return item;
      })
    );
  };

  const addIMEIField = (barcodeId: string) => {
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.barcode_id === barcodeId) {
          return { ...item, imei_codes: [...item.imei_codes, ""] };
        }
        return item;
      })
    );
  };

  const removeIMEIField = (barcodeId: string, index: number) => {
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.barcode_id === barcodeId) {
          const newImeiCodes = item.imei_codes.filter((_, i) => i !== index);
          return { ...item, imei_codes: newImeiCodes };
        }
        return item;
      })
    );
  };

  const removeProduct = (barcodeId: string) => {
    setSelectedProducts(prev => prev.filter(item => item.barcode_id !== barcodeId));
  };

  const validateIMEICodes = () => {
    for (const item of selectedProducts) {
      if (item.imei_codes.length === 0 || item.imei_codes.some(imei => !imei.trim())) {
        return false;
      }
    }
    return true;
  };

  const handleSaleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Debe agregar al menos un producto");
      return;
    }

    if (!selectedStore) {
      toast.error("Debe seleccionar una tienda");
      return;
    }

    if (!validateIMEICodes()) {
      toast.error("Todos los productos deben tener al menos un código IMEI");
      return;
    }

    try {
      const saleId = crypto.randomUUID();

      const { error: saleError } = await supabase.from("sales").insert([
        {
          id: saleId,
          employee_id: currentEmployee.id,
          store_id: selectedStore,
          total_sale: totalAmount,
          type_of_payment: paymentType,
          quantity_products: selectedProducts.length,
          customer_name: customerName || null,
          customer_ci: customerCI || null,
          customer_phone: customerPhone || null,
          sale_date: new Date().toISOString(),
        },
      ]);

      if (saleError) throw saleError;

      for (const item of selectedProducts) {
        const { error: itemError } = await supabase.from("sale_product").insert([
          {
            sale_id: saleId,
            product_id: item.product.id,
            barcode_id: item.barcode_id,
            mei_codes: item.imei_codes.filter(imei => imei.trim() !== ""),
          },
        ]);

        if (itemError) throw itemError;

        const { error: barcodeError } = await supabase
          .from("product_barcodes_store")
          .update({
            is_sold: true,
            sold_at: new Date().toISOString(),
          })
          .eq("id", item.barcode_id);

        if (barcodeError) throw barcodeError;
      }

      toast.success("¡Venta registrada exitosamente!");
      
      setSelectedProducts([]);
      setCustomerName("");
      setCustomerCI("");
      setCustomerPhone("");
      setPaymentType("efectivo");
      setSearchTerm("");
      
      fetchAvailableProducts();
      fetchSalesHistory();
    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Error al registrar la venta");
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale.id);
          let storeData = null;
          if (sale.store_id && sale.store_id !== 'null' && sale.store_id.trim() !== '') {
            const { data } = await supabase
              .from("stores")
              .select("name")
              .eq("id", sale.store_id)
              .single();
            storeData = data;
          }
    try {
      const { error } = await supabase
        .from("sales")
        .update({
          type_of_payment: editPaymentType,
          total_sale: editTotalAmount,
        })
        .eq("id", saleId);

      if (error) throw error;

      toast.success("Venta actualizada exitosamente");
      setEditingSale(null);
      fetchSalesHistory();
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error("Error al actualizar la venta");
    }
  };

  const printTXTContent = (content: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                margin: 0;
                padding: 20px;
                white-space: pre-wrap;
              }
              @media print {
                body { margin: 0; padding: 10px; }
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const generateTXTInvoice = async (sale: Sale) => {
    try {
      // Obtener información completa de la tienda y empleado
      const { data: storeData } = await supabase
        .from("stores")
        .select("name, address")
        .eq("id", sale.store_id)
        .single();

      const { data: employeeData } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", sale.employee_id)
        .single();

      const { data: saleProducts } = await supabase
        .from("sale_product")
        .select(`
          mei_codes,
          products!product_id (name, color, cost_price, profit_bob),
          product_barcodes_store!barcode_id (barcode)
        `)
        .eq("sale_id", sale.id);

      let txtContent = "";
      
      const centerText = (text: string) => {
        const width = 42;
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return " ".repeat(padding) + text + "\n";
      };
      
      const justifyText = (left: string, right: string) => {
        const width = 42;
        const totalLength = left.length + right.length;
        const spaces = Math.max(1, width - totalLength);
        return left + " ".repeat(spaces) + right + "\n";
      };
      
      const line = "==========================================\n";
      const doubleLine = "==========================================\n";
      
      // LOGO ASCII
      txtContent += STORE_LOGO + "\n";
      
      // Información de la tienda
      if (storeData) {
        txtContent += centerText(storeData.name.toUpperCase());
        txtContent += centerText(storeData.address);
      }
      txtContent += centerText("TEL: 422003");
      txtContent += centerText("COCHABAMBA - BOLIVIA");
      txtContent += centerText("NIT: 7255039");
      txtContent += "\n";
      txtContent += doubleLine;
      
      // INFORMACIÓN DE LA FACTURA
      txtContent += centerText("FACTURA DE VENTA");
      txtContent += centerText(`Nº ${sale.id.slice(-8).toUpperCase()}`);
      txtContent += centerText(format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm:ss"));
      txtContent += "\n";
      
      txtContent += `LUGAR Y FECHA: Cochabamba, ${format(new Date(sale.sale_date), "dd/MM/yyyy")}\n`;
      txtContent += `CODIGO: ${sale.id.slice(-8).toUpperCase()} / NIT: 7255039\n`;
      if (employeeData) {
        txtContent += `VENDEDOR: ${employeeData.first_name} ${employeeData.last_name}\n`;
      }
      txtContent += "\n";
      
      // INFORMACIÓN DEL CLIENTE
      if (sale.customer_name || sale.customer_ci || sale.customer_phone) {
        txtContent += line;
        txtContent += "DATOS DEL CLIENTE:\n";
        
        if (sale.customer_name) {
          txtContent += `SEÑOR(ES): ${sale.customer_name.toUpperCase()}\n`;
        }
        if (sale.customer_ci) {
          txtContent += `C.I.: ${sale.customer_ci}\n`;
        }
        if (sale.customer_phone) {
          txtContent += `CELULAR: ${sale.customer_phone}\n`;
        }
        txtContent += "\n";
      }
      
      txtContent += doubleLine;
      
      // TABLA DE PRODUCTOS
      txtContent += centerText("INFORMACIÓN DEL PRODUCTO");
      txtContent += "\n";
      txtContent += "┌────┬─────────────────────┬────┬─────────┐\n";
      txtContent += "│ITEM│    DESCRIPCIÓN      │CANT│  PRECIO │\n";
      txtContent += "├────┼─────────────────────┼────┼─────────┤\n";
      
      (saleProducts || []).forEach((item: any, index: number) => {
        const finalPrice = item.products.cost_price * exchangeRate + item.products.profit_bob;
        const itemNum = (index + 1).toString().padStart(2, '0');
        const description = `${item.products.name} ${item.products.color}`.substring(0, 19);
        const price = `${Math.round(finalPrice)} Bs.`;
        
        txtContent += `│ ${itemNum} │ ${description.padEnd(19)} │ 1  │${price.padStart(8)} │\n`;
        txtContent += `│    │ COD: ${(item.product_barcodes_store?.barcode || "N/A").padEnd(15)} │    │         │\n`;
        
        if (item.mei_codes && item.mei_codes.length > 0) {
          item.mei_codes.forEach((imei: string, idx: number) => {
            const imeiText = `IMEI${idx + 1}: ${imei}`.substring(0, 19);
            txtContent += `│    │ ${imeiText.padEnd(19)} │    │         │\n`;
          });
        }
      });
      
      txtContent += "└────┴─────────────────────┴────┴─────────┘\n";
      txtContent += "\n";
      
      // TOTALES
      txtContent += doubleLine;
      txtContent += justifyText("TOTAL A PAGAR:", `${sale.total_sale} Bs.`);
      txtContent += "\n";
      txtContent += justifyText("FORMA DE PAGO:", sale.type_of_payment.toUpperCase());
      txtContent += "\n";
      txtContent += doubleLine;
      
      // PIE DE PÁGINA
      txtContent += centerText("¡GRACIAS POR SU COMPRA!");
      txtContent += "\n";
      txtContent += centerText("GARANTÍA DE 12 MESES");
      txtContent += centerText("SOLO DEFECTOS DE FÁBRICA");
      txtContent += "\n";
      txtContent += centerText("CONSERVE ESTE DOCUMENTO");
      txtContent += centerText("PARA CUALQUIER RECLAMO");
      txtContent += "\n";
      txtContent += centerText(`Impreso: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`);
      txtContent += "\n\n\n";
      
      printTXTContent(txtContent, `Factura ${sale.id.slice(-8)}`);
      toast.success("Factura enviada a impresión");
    } catch (error) {
      console.error("Error generating TXT invoice:", error);
      toast.error("Error al generar la factura");
    }
  };

  const generateTXTWarranty = async (sale: Sale) => {
    try {
      // Obtener información completa de la tienda y empleado
      const { data: storeData } = await supabase
        .from("stores")
        .select("name, address")
        .eq("id", sale.store_id)
        .single();

      const { data: employeeData } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", sale.employee_id)
        .single();

      const { data: saleProducts } = await supabase
        .from("sale_product")
        .select(`
          mei_codes,
          products!product_id (name, color, ram, rom, processor),
          product_barcodes_store!barcode_id (barcode)
        `)
        .eq("sale_id", sale.id);

      let txtContent = "";
      
      const centerText = (text: string) => {
        const width = 42;
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return " ".repeat(padding) + text + "\n";
      };
      
      const justifyText = (left: string, right: string) => {
        const width = 42;
        const totalLength = left.length + right.length;
        const spaces = Math.max(1, width - totalLength);
        return left + " ".repeat(spaces) + right + "\n";
      };
      
      const line = "==========================================\n";
      const doubleLine = "==========================================\n";
      
      // LOGO ASCII
      txtContent += STORE_LOGO + "\n";
      
      // Información de la tienda
      if (storeData) {
        txtContent += centerText(storeData.name.toUpperCase());
        txtContent += centerText(storeData.address);
      }
      txtContent += centerText("TEL 422003");
      txtContent += centerText("COCHABAMBA");
      txtContent += centerText("BOLIVIA");
      txtContent += centerText("NIT: 7255039");
      txtContent += "\n";
      
      txtContent += centerText("CERTIFICADO");
      txtContent += centerText("DE GARANTIA");
      txtContent += centerText(`Nº ${sale.id.slice(-8).toUpperCase()}`);
      txtContent += centerText(format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm:ss"));
      txtContent += "\n";
      
      txtContent += doubleLine;
      
      txtContent += `LUGAR Y FECHA: Cochabamba, ${format(new Date(sale.sale_date), "dd/MM/yyyy")}\n`;
      txtContent += `CODIGO: ${sale.id.slice(-8).toUpperCase()} / NIT: 7255039\n`;
      
      if (sale.customer_name || sale.customer_ci) {
        txtContent += `SEÑOR(ES): ${(sale.customer_name || 'CLIENTE').toUpperCase()}\n`;
        if (sale.customer_ci) {
          txtContent += `C.I.: ${sale.customer_ci}\n`;
        }
        if (sale.customer_phone) {
          txtContent += `CELULAR: ${sale.customer_phone}\n`;
        }
      }
      
      if (employeeData) {
        txtContent += `VENDEDOR: ${employeeData.first_name} ${employeeData.last_name}\n`;
      }
      
      txtContent += "\n";
      
      // ADVERTENCIA IMPORTANTE
      txtContent += "Recuerde que no habrá ningun tipo de garantia si\n";
      txtContent += "el dispositivo presenta problemas tecnicos\n";
      txtContent += "producidos por instalación de programas,\n";
      txtContent += "actualizaciones, archivos y/o virus que afecte a su\n";
      txtContent += "normal funcionamiento.\n";
      txtContent += "\n";
      
      txtContent += doubleLine;
      
      // TABLA DE PRODUCTOS
      txtContent += centerText("INFORMACIÓN DEL PRODUCTO");
      txtContent += "\n";
      txtContent += "┌────┬─────────────────────┬────┬─────────┐\n";
      txtContent += "│ITEM│    DESCRIPCIÓN      │CANT│ SERIE(S)│\n";
      txtContent += "├────┼─────────────────────┼────┼─────────┤\n";
      
      (saleProducts || []).forEach((item: any, index: number) => {
        const itemNum = (index + 1).toString();
        const description = `${item.products.name} ${item.products.color}`.substring(0, 19);
        const barcode = (item.product_barcodes_store?.barcode || "N/A").substring(0, 7);
        
        txtContent += `│ ${itemNum}  │ ${description.padEnd(19)} │1.00│${barcode.padStart(8)} │\n`;
        
        if (item.mei_codes && item.mei_codes.length > 0) {
          item.mei_codes.forEach((imei: string, idx: number) => {
            const imeiCode = `IMEI${idx + 1}:${imei}`.substring(0, 7);
            txtContent += `│    │                     │    │${imeiCode.padStart(8)} │\n`;
          });
        }
      });
      
      txtContent += "└────┴─────────────────────┴────┴─────────┘\n";
      txtContent += "\n";
      
      txtContent += doubleLine;
      
      // IMPORTANTE
      txtContent += centerText("IMPORTANTE");
      txtContent += "\n";
      txtContent += "En caso de presentar alguna falla en el\n";
      txtContent += "lapso de 24 hrs. al cliente tiene que\n";
      txtContent += "hacer conocer a la tienda llamando al\n";
      txtContent += "78333903.\n";
      txtContent += "\n";
      
      txtContent += centerText("CONSERVE ESTE DOCUMENTO,");
      txtContent += centerText("SIN CUALQUIER RECLAMO SIN LA");
      txtContent += centerText("PRESENTACION DEL MISMO NO");
      txtContent += centerText("HABRA NINGUNO.");
      
      txtContent += "\n";
      
      // FIRMA DEL CLIENTE
      txtContent += doubleLine;
      txtContent += "FIRMA DEL CLIENTE:\n\n";
      txtContent += "________________________________________\n\n";
      
      // PIE DE PÁGINA
      txtContent += centerText("GARANTÍA VÁLIDA POR 12 MESES");
      txtContent += centerText("SOLO DEFECTOS DE FÁBRICA");
      txtContent += centerText(`Impreso: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`);
      txtContent += "\n\n\n";
      
      printTXTContent(txtContent, `Garantía ${sale.id.slice(-8)}`);
      toast.success("Garantía enviada a impresión");
    } catch (error) {
      console.error("Error generating TXT warranty:", error);
      toast.error("Error al generar la garantía");
    }
  };

  // Filtrar productos por búsqueda
  const filteredProducts = searchTerm
    ? availableProducts.filter(product => {
        const term = searchTerm.toLowerCase();
        return (
          product.barcode?.toLowerCase().includes(term) ||
          product.products.name.toLowerCase().includes(term) ||
          product.products.color.toLowerCase().includes(term)
        );
      })
    : [];

  // Auto-seleccionar producto escaneado
  useEffect(() => {
    if (searchTerm && isScannerInput) {
      const scannedProduct = availableProducts.find(
        product => product.barcode === searchTerm
      );
      if (scannedProduct) {
        handleProductSelect(scannedProduct);
        setIsScannerInput(false);
      }
    }
  }, [searchTerm, availableProducts, isScannerInput]);

  return (
    <div className="space-y-6">
      <Toaster />
      
      {/* Información del empleado */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Nueva Venta</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Empleado:</p>
            <p className="font-medium">
              {currentEmployee ? `${currentEmployee.first_name} ${currentEmployee.last_name || ''}` : 'No identificado'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tienda:
            </label>
            {currentEmployee?.position === "administrador" ? (
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar tienda</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-medium">
                {stores.find(s => s.id === selectedStore)?.name || 'Cargando...'}
              </p>
            )}
          </div>
        </div>

        {/* Búsqueda de productos */}
        <div className="relative mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="search"
              value={searchTerm}
              ref={searchRef}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escanear código de barras o buscar producto..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  key={product.id}
                  type="button"
                  onClick={() => handleProductSelect(product)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-4"
                >
                  <img
                    src={product.products.image || "https://placehold.co/48x48?text=No+Image"}
                    alt={product.products.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{product.products.name}</p>
                    <p className="text-sm text-gray-600">Código: {product.barcode}</p>
                    <p className="text-sm text-gray-500">Color: {product.products.color}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Productos seleccionados */}
        {selectedProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">
              Productos Seleccionados ({selectedProducts.length})
            </h3>
            <div className="space-y-4">
              {selectedProducts.map((item) => {
                const finalPrice = item.product.cost_price * exchangeRate + item.product.profit_bob;
                return (
                  <div key={item.barcode_id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <img
                          src={item.product.image || "https://placehold.co/64x64?text=No+Image"}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div>
                          <h4 className="font-medium">{item.product.name}</h4>
                          <p className="text-sm text-gray-600">Color: {item.product.color}</p>
                          <p className="text-sm text-gray-500">Código: {item.barcode}</p>
                          <p className="text-sm font-medium text-green-600">
                            Precio: {Math.round(finalPrice)} Bs.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(item.barcode_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    {/* Códigos IMEI */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Códigos IMEI: <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => addIMEIField(item.barcode_id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Plus size={16} className="inline mr-1" />
                          Agregar IMEI
                        </button>
                      </div>
                      
                      {item.imei_codes.map((imei, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 w-16">IMEI{index + 1}:</span>
                          <input
                            type="text"
                            value={imei}
                            onChange={(e) => handleIMEIChange(item.barcode_id, index, e.target.value)}
                            placeholder={`Ingrese IMEI ${index + 1}`}
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => removeIMEIField(item.barcode_id, index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      
                      {item.imei_codes.length === 0 && (
                        <p className="text-sm text-red-500">
                          Debe agregar al menos un código IMEI para este producto
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Información del cliente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Cliente (Opcional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ingrese el nombre del cliente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              C.I. del Cliente (Opcional)
            </label>
            <input
              type="text"
              value={customerCI}
              onChange={(e) => setCustomerCI(e.target.value)}
              placeholder="Ingrese el C.I. del cliente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Celular del Cliente (Opcional)
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Ingrese el celular del cliente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Información de pago */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Pago
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="qr">QR</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total a Pagar (Bs.)
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleSaleSubmit}
              disabled={selectedProducts.length === 0 || !validateIMEICodes()}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart size={20} />
              Registrar Venta
            </button>
          </div>
        </div>
      </div>

      {/* Historial de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              Historial de Ventas
              {currentEmployee?.position === "administrador" && " (Todas las tiendas)"}
            </h2>
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
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tienda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesHistory.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer_name || "Sin nombre"}
                      {sale.customer_ci && (
                        <div className="text-xs text-gray-500">C.I.: {sale.customer_ci}</div>
                      )}
                      {sale.customer_phone && (
                        <div className="text-xs text-gray-500">Cel.: {sale.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity_products} productos
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSale === sale.id ? (
                        <input
                          type="number"
                          value={editTotalAmount}
                          onChange={(e) => setEditTotalAmount(Number(e.target.value))}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        `${sale.total_sale} Bs.`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSale === sale.id ? (
                        <select
                          value={editPaymentType}
                          onChange={(e) => setEditPaymentType(e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="qr">QR</option>
                        </select>
                      ) : (
                        sale.type_of_payment
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.stores?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.employees?.first_name} {sale.employees?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {currentEmployee?.position === "administrador" && (
                          <>
                            {editingSale === sale.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(sale.id)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Guardar"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingSale(null)}
                                  className="text-gray-600 hover:text-gray-800"
                                  title="Cancelar"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditSale(sale)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => generateTXTInvoice(sale)}
                          className="text-green-600 hover:text-green-800"
                          title="Imprimir Factura"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => generateTXTWarranty(sale)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Imprimir Garantía"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {salesHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
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
                    {currentEmployee?.position === "administrador" && (
                      <button
                        onClick={() => handleEditSale(sale)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => generateTXTInvoice(sale)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => generateTXTWarranty(sale)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-600">Cliente:</span> {sale.customer_name || "Sin nombre"}
                    {sale.customer_ci && <span className="text-gray-500"> (C.I.: {sale.customer_ci})</span>}
                    {sale.customer_phone && <span className="text-gray-500"> (Cel.: {sale.customer_phone})</span>}
                  </div>
                  <div>
                    <span className="text-gray-600">Productos:</span> {sale.quantity_products}
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span> {sale.total_sale} Bs.
                  </div>
                  <div>
                    <span className="text-gray-600">Pago:</span> {sale.type_of_payment}
                  </div>
                  <div>
                    <span className="text-gray-600">Tienda:</span> {sale.stores?.name || "N/A"}
                  </div>
                  <div>
                    <span className="text-gray-600">Vendedor:</span> {sale.employees?.first_name} {sale.employees?.last_name}
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
      </div>
    </div>
  );
};