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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Logo from "../assets/LOGO.png";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
  mei_codes: string[];
}

interface Sale {
  id: string;
  sale_date: string;
  total_sale: number;
  type_of_payment: string;
  quantity_products: number;
  customer_name?: string;
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
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCellphone, setCustomerCellphone] = useState("");
  const [customerCellphone, setCustomerCellphone] = useState("");
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
          // Para admin: no seleccionar tienda automáticamente, mostrar todas las ventas
          setSelectedStore(""); // Esto permitirá ver ventas de todas las tiendas
        } else {
          // Para empleados de ventas: seleccionar su tienda automáticamente
          setSelectedStore(employee.store_id);
        }
      }
    };

    fetchInitialData();
  }, []);

  // Cargar productos cuando cambie la tienda (solo para formulario de venta)
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
      // Primero obtener las ventas básicas
      let salesQuery = supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false })
        .range(offset, offset + limitItems - 1);

      // Solo filtrar por tienda si es empleado de ventas
      if (currentEmployee.position !== "administrador") {
        salesQuery = salesQuery.eq("store_id", currentEmployee.store_id);
      }

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) throw salesError;

      if (salesData && salesData.length > 0) {
        // Obtener información adicional para cada venta
        const enrichedSales = await Promise.all(
          salesData.map(async (sale) => {
            // Obtener información del empleado
            const { data: employeeData } = await supabase
              .from("employees")
              .select("first_name, last_name")
              .eq("id", sale.employee_id)
              .single();

            // Obtener información de la tienda
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
      mei_codes: [],
    };

    setSelectedProducts([...selectedProducts, newProduct]);
    setSearchTerm("");
  };

  const handleMEIChange = (barcodeId: string, index: number, value: string) => {
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.barcode_id === barcodeId) {
          const newMeiCodes = [...item.mei_codes];
          newMeiCodes[index] = value;
          return { ...item, mei_codes: newMeiCodes };
        }
        return item;
      })
    );
  };

  const addMEIField = (barcodeId: string) => {
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.barcode_id === barcodeId) {
          return { ...item, mei_codes: [...item.mei_codes, ""] };
        }
        return item;
      })
    );
  };

  const removeMEIField = (barcodeId: string, index: number) => {
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.barcode_id === barcodeId) {
          const newMeiCodes = item.mei_codes.filter((_, i) => i !== index);
          return { ...item, mei_codes: newMeiCodes };
        }
        return item;
      })
    );
  };

  const removeProduct = (barcodeId: string) => {
    setSelectedProducts(prev => prev.filter(item => item.barcode_id !== barcodeId));
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

    try {
      const saleId = crypto.randomUUID();

      // Crear la venta
      const { error: saleError } = await supabase.from("sales").insert([
        {
          id: saleId,
          employee_id: currentEmployee.id,
          store_id: selectedStore,
          total_sale: totalAmount,
          type_of_payment: paymentType,
          quantity_products: selectedProducts.length,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_cellphone: customerCellphone || null,
          customer_cellphone: customerCellphone || null,
          sale_date: new Date().toISOString(),
        },
      ]);

      if (saleError) throw saleError;

      // Crear los items de venta
      for (const item of selectedProducts) {
        const { error: itemError } = await supabase.from("sale_product").insert([
          {
            sale_id: saleId,
            product_id: item.product.id,
            barcode_id: item.barcode_id,
            mei_codes: item.mei_codes.filter(mei => mei.trim() !== ""),
          },
        ]);

        if (itemError) throw itemError;

        // Marcar código de barras como vendido
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
      
      // Limpiar formulario
      setSelectedProducts([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerCellphone("");
      setCustomerCellphone("");
      setPaymentType("efectivo");
      setSearchTerm("");
      
      // Recargar datos
      fetchAvailableProducts();
      fetchSalesHistory();
    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Error al registrar la venta");
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale.id);
    setEditPaymentType(sale.type_of_payment);
    setEditTotalAmount(sale.total_sale);
  };

  const handleSaveEdit = async (saleId: string) => {
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

  // Función para generar factura POS térmica
  const generateTXTInvoice = async (sale: Sale) => {
    try {
      // Obtener información de la tienda
      const { data: storeData } = await supabase
        .from("stores")
        .select("name, address")
        .eq("id", sale.store_id)
        .single();

      // Obtener productos de la venta
      const { data: saleProducts } = await supabase
        .from("sale_product")
        .select(`
          mei_codes,
          products!product_id (name, color, cost_price, profit_bob),
          product_barcodes_store!barcode_id (barcode)
        `)
        .eq("sale_id", sale.id);

      // Generar contenido TXT para impresora POS LR1100U
      let txtContent = "";
      
      // Función para centrar texto (42 caracteres de ancho para mejor formato)
      const centerText = (text: string) => {
        const width = 42;
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return " ".repeat(padding) + text + "\n";
      };
      
      // Función para justificar texto
      const justifyText = (left: string, right: string) => {
        const width = 42;
        const totalLength = left.length + right.length;
        const spaces = Math.max(1, width - totalLength);
        return left + " ".repeat(spaces) + right + "\n";
      };
      
      // Función para texto en negrita (usando caracteres especiales)
      const boldText = (text: string) => {
        return `**${text}**`;
      };
      
      // Línea divisoria
      const line = "==========================================\n";
      const doubleLine = "==========================================\n";
      
      // ENCABEZADO CON LOGO (representado con texto)
      txtContent += centerText("╔══════════════════════════════════════╗");
      txtContent += centerText("║        TIENDAS MOVIL AXCEL           ║");
      txtContent += centerText("║      Venta de equipos móviles        ║");
      txtContent += centerText("╚══════════════════════════════════════╝");
      txtContent += "\n";
      
      // Información de la tienda
      if (storeData) {
        txtContent += centerText(storeData.name.toUpperCase());
        txtContent += centerText(storeData.address);
      }
      txtContent += centerText("TEL: 422003");
      txtContent += centerText("COCHABAMBA - BOLIVIA");
      txtContent += centerText("NIT: 123456789");
      txtContent += "\n";
      txtContent += doubleLine;
      
      // INFORMACIÓN DE LA FACTURA
      txtContent += centerText(boldText("FACTURA DE VENTA"));
      txtContent += centerText(`Nº ${sale.id.slice(-8).toUpperCase()}`);
      txtContent += centerText(format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm:ss"));
      txtContent += "\n";
      
      txtContent += `LUGAR Y FECHA: Cochabamba, ${format(new Date(sale.sale_date), "dd/MM/yyyy")}\n`;
      txtContent += `CODIGO: ${sale.id.slice(-8).toUpperCase()} / NIT: 123456789\n`;
      txtContent += `VENDEDOR: ${sale.employees?.first_name} ${sale.employees?.last_name}\n`;
      txtContent += "\n";
      
      // INFORMACIÓN DEL CLIENTE (si existe)
      if (sale.customer_name || sale.customer_phone || sale.customer_cellphone) {
        txtContent += line;
        txtContent += boldText("DATOS DEL CLIENTE:") + "\n";
        
        if (sale.customer_name) {
          txtContent += `SEÑOR(ES): ${sale.customer_name.toUpperCase()}\n`;
        }
        if (sale.customer_phone) {
          txtContent += `TELÉFONO: ${sale.customer_phone}\n`;
        }
        if (sale.customer_cellphone) {
          txtContent += `CELULAR: ${sale.customer_cellphone}\n`;
        }
        txtContent += "\n";
      }
      
      txtContent += doubleLine;
      
      // TABLA DE PRODUCTOS
      txtContent += centerText(boldText("INFORMACIÓN DEL PRODUCTO"));
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
        
        // Información adicional del producto
        txtContent += `│    │ COD: ${(item.product_barcodes_store?.barcode || "N/A").padEnd(15)} │    │         │\n`;
        
        // Códigos MEI (si existen)
        if (item.mei_codes && item.mei_codes.length > 0) {
          item.mei_codes.forEach((mei: string, idx: number) => {
            const meiText = `MEI${idx + 1}: ${mei}`.substring(0, 19);
            txtContent += `│    │ ${meiText.padEnd(19)} │    │         │\n`;
          });
        }
      });
      
      txtContent += "└────┴─────────────────────┴────┴─────────┘\n";
      txtContent += "\n";
      
      // TOTALES
      txtContent += doubleLine;
      txtContent += justifyText(boldText("TOTAL A PAGAR:"), boldText(`${sale.total_sale} Bs.`));
      txtContent += "\n";
      txtContent += justifyText("FORMA DE PAGO:", sale.type_of_payment.toUpperCase());
      txtContent += "\n";
      txtContent += doubleLine;
      
      // PIE DE PÁGINA
      txtContent += centerText(boldText("¡GRACIAS POR SU COMPRA!"));
      txtContent += "\n";
      txtContent += centerText("GARANTÍA DE 12 MESES");
      txtContent += centerText("SOLO DEFECTOS DE FÁBRICA");
      txtContent += "\n";
      txtContent += centerText("CONSERVE ESTE DOCUMENTO");
      txtContent += centerText("PARA CUALQUIER RECLAMO");
      txtContent += "\n";
      txtContent += centerText(`Impreso: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`);
      txtContent += "\n\n\n"; // Espacios finales para corte de papel
      
      // Crear y descargar archivo TXT
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `factura_${sale.id.slice(-8)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Factura TXT generada exitosamente");
    } catch (error) {
      console.error("Error generating TXT invoice:", error);
      toast.error("Error al generar la factura TXT");
    }
  };

  // Función para generar garantía POS térmica
  const generateTXTWarranty = async (sale: Sale) => {
    try {
      // Obtener información de la tienda
      const { data: storeData } = await supabase
        .from("stores")
        .select("name, address")
        .eq("id", sale.store_id)
        .single();

      // Obtener productos de la venta
      const { data: saleProducts } = await supabase
        .from("sale_product")
        .select(`
          mei_codes,
          products!product_id (name, color, ram, rom, processor),
          product_barcodes_store!barcode_id (barcode)
        `)
        .eq("sale_id", sale.id);

      // Generar contenido TXT para garantía
      let txtContent = "";
      
      // Función para centrar texto (42 caracteres de ancho)
      const centerText = (text: string) => {
        const width = 42;
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return " ".repeat(padding) + text + "\n";
      };
      
      // Función para justificar texto
      const justifyText = (left: string, right: string) => {
        const width = 42;
        const totalLength = left.length + right.length;
        const spaces = Math.max(1, width - totalLength);
        return left + " ".repeat(spaces) + right + "\n";
      };
      
      // Función para texto en negrita
      const boldText = (text: string) => {
        return `**${text}**`;
      };
      
      // Línea divisoria
      const line = "==========================================\n";
      const doubleLine = "==========================================\n";
      
      // ENCABEZADO ESTILO ARELIZCELL
      txtContent += centerText("TIENDAS MOVIL AXCEL");
      txtContent += "\n";
      
      // Información de la tienda
      if (storeData) {
        const addressLines = storeData.address.split(',');
        addressLines.forEach(line => {
          txtContent += centerText(line.trim().toUpperCase());
        });
      }
      txtContent += centerText("TEL 422003");
      txtContent += centerText("COCHABAMBA");
      txtContent += centerText("BOLIVIA");
      txtContent += "\n";
      
      txtContent += centerText(boldText("CERTIFICADO"));
      txtContent += centerText(boldText("DE GARANTIA"));
      txtContent += centerText(`Nº ${sale.id.slice(-8).toUpperCase()}`);
      txtContent += centerText(format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm:ss"));
      txtContent += "\n";
      
      txtContent += doubleLine;
      
      // INFORMACIÓN DE LA GARANTÍA
      txtContent += `LUGAR Y FECHA: Cochabamba, ${format(new Date(sale.sale_date), "dd/MM/yyyy")}\n`;
      txtContent += `CODIGO: ${sale.id.slice(-8).toUpperCase()} / NIT: 7255039\n`;
      
      if (sale.customer_name || sale.customer_phone || sale.customer_cellphone) {
        txtContent += `SEÑOR(ES): ${(sale.customer_name || 'CLIENTE').toUpperCase()}\n`;
      }
      
      txtContent += "\n";
      
      // ADVERTENCIA IMPORTANTE
      txtContent += "Recuerde que no habrá ningun tipo de garantia si\n";
      txtContent += "el dispositivo presenta problemas tecnicos\n";
      txtContent += "producidos por instalación de programas,\n";
      txtContent += "actualizaciones, archivos y/o virus que afecte a su\n";
      txtContent += "normal funcionamiento. Dir. Garantias. OP.\n";
      txtContent += "CENTRAL: C. Ecuador #174 entre Ayacucho y\n";
      txtContent += "Junin; CENTRO SAMSUNG A. Pando esq.\n";
      txtContent += "Portales, Hupermall piso 2 Su equipo celular es\n";
      txtContent += "un terminal HOMOLOGADO para Bolivia, cuenta\n";
      txtContent += "con garantia oficial del fabricante de 1 AÑO. La\n";
      txtContent += "garantia no es cubierta por el distribuidor\n";
      txtContent += "autorizado donde adquirió el equipo en ningun\n";
      txtContent += "caso, por ningun periodo de tiempo, pieza, pieza\n";
      txtContent += "accesorio o cualquier mala funcion del equipo.\n";
      txtContent += "Tampoco es responsable por cualquier campaña,\n";
      txtContent += "promoción o beneficio ofrecido antes o despues\n";
      txtContent += "de la compra. Los términos y condiciones de la\n";
      txtContent += "garantia son establecidos por el fabricante. No se\n";
      txtContent += "aceptan cambios ni devoluciones\n";
      txtContent += "\n";
      
      txtContent += doubleLine;
      
      // TABLA DE PRODUCTOS ESTILO FORMAL
      txtContent += centerText(boldText("INFORMACIÓN DEL PRODUCTO"));
      txtContent += "\n";
      txtContent += "┌────┬─────────────────────┬────┬─────────┐\n";
      txtContent += "│ITEM│    DESCRIPCIÓN      │CANT│ SERIE(S)│\n";
      txtContent += "├────┼─────────────────────┼────┼─────────┤\n";
      
      (saleProducts || []).forEach((item: any, index: number) => {
        const itemNum = (index + 1).toString();
        const description = `${item.products.name} ${item.products.color}`.substring(0, 19);
        const barcode = (item.product_barcodes_store?.barcode || "N/A").substring(0, 7);
        
        txtContent += `│ ${itemNum}  │ ${description.padEnd(19)} │1.00│${barcode.padStart(8)} │\n`;
        
        // Códigos MEI
        if (item.mei_codes && item.mei_codes.length > 0) {
          item.mei_codes.forEach((mei: string, idx: number) => {
            const meiCode = mei.substring(0, 7);
            txtContent += `│    │                     │    │${meiCode.padStart(8)} │\n`;
          });
        }
      });
      
      txtContent += "└────┴─────────────────────┴────┴─────────┘\n";
      txtContent += "\n";
      
      txtContent += doubleLine;
      
      // IMPORTANTE
      txtContent += centerText(boldText("IMPORTANTE"));
      txtContent += "\n";
      txtContent += "En caso de presentar alguna falla en el\n";
      txtContent += "lapso de 24 hrs. al cliente tiene que\n";
      txtContent += "hacer conocer a la tienda llamando al\n";
      txtContent += "78333903.\n";
      txtContent += "\n";
      
      txtContent += centerText(boldText("CONSERVE ESTE DOCUMENTO,"));
      txtContent += centerText(boldText("SIN CUALQUIER RECLAMO SIN LA"));
      txtContent += centerText(boldText("PRESENTACION DEL MISMO NO"));
      txtContent += centerText(boldText("HABRA NINGUNO."));
      
      txtContent += "\n";
      
      // FIRMA DEL CLIENTE
      txtContent += doubleLine;
      txtContent += boldText("FIRMA DEL CLIENTE:") + "\n\n";
      txtContent += "________________________________________\n\n";
      
      // PIE DE PÁGINA
      txtContent += centerText("GARANTÍA VÁLIDA POR 12 MESES");
      txtContent += centerText("SOLO DEFECTOS DE FÁBRICA");
      txtContent += centerText(`Impreso: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`);
      txtContent += "\n\n\n"; // Espacios finales para corte de papel
      
      // Crear y descargar archivo TXT
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `garantia_${sale.id.slice(-8)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Garantía TXT generada exitosamente");
    } catch (error) {
      console.error("Error generating TXT warranty:", error);
      toast.error("Error al generar la garantía TXT");
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

                    {/* Códigos MEI */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Códigos MEI:
                        </label>
                        <button
                          type="button"
                          onClick={() => addMEIField(item.barcode_id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Plus size={16} className="inline mr-1" />
                          Agregar MEI
                        </button>
                      </div>
                      
                      {item.mei_codes.map((mei, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 w-12">MEI{index + 1}:</span>
                          <input
                            type="text"
                            value={mei}
                            onChange={(e) => handleMEIChange(item.barcode_id, index, e.target.value)}
                            placeholder={`Ingrese MEI ${index + 1}`}
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeMEIField(item.barcode_id, index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Información del cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              Celular del Cliente (Opcional)
            </label>
            <input
              type="tel"
              value={customerCellphone}
              onChange={(e) => setCustomerCellphone(e.target.value)}
              placeholder="Ingrese el celular del cliente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono del Cliente (Opcional)
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Ingrese el teléfono del cliente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Celular del Cliente (Opcional)
            </label>
            <input
              type="tel"
              value={customerCellphone}
              onChange={(e) => setCustomerCellphone(e.target.value)}
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
              disabled={selectedProducts.length === 0}
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
                      {sale.customer_phone && (
                        <div className="text-xs text-gray-500">Tel: {sale.customer_phone}</div>
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
                          title="Factura TXT"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => generateTXTWarranty(sale)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Garantía TXT"
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
                    {sale.customer_phone && <span className="text-gray-500"> (Tel: {sale.customer_phone})</span>}
                    {sale.customer_cellphone && <span className="text-gray-500"> (Cel: {sale.customer_cellphone})</span>}
                    {sale.customer_cellphone && <span className="text-gray-500"> (Cel: {sale.customer_cellphone})</span>}
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