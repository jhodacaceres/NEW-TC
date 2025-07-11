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
  Usb,
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

// Clase para manejar la impresora POS via WebUSB
class POSPrinter {
  private device: USBDevice | null = null;
  private interface: USBInterface | null = null;
  private endpoint: USBEndpoint | null = null;

  // ESC/POS Commands
  private readonly ESC = '\x1B';
  private readonly GS = '\x1D';
  
  // Comandos básicos
  private readonly INIT = this.ESC + '@';
  private readonly BOLD_ON = this.ESC + 'E' + '\x01';
  private readonly BOLD_OFF = this.ESC + 'E' + '\x00';
  private readonly ALIGN_LEFT = this.ESC + 'a' + '\x00';
  private readonly ALIGN_CENTER = this.ESC + 'a' + '\x01';
  private readonly ALIGN_RIGHT = this.ESC + 'a' + '\x02';
  private readonly CUT_PAPER = this.GS + 'V' + '\x00';
  private readonly LINE_FEED = '\n';
  private readonly DOUBLE_HEIGHT = this.ESC + '!' + '\x10';
  private readonly NORMAL_SIZE = this.ESC + '!' + '\x00';

  async connect(): Promise<boolean> {
    try {
      // Verificar soporte de WebUSB
      if (!navigator.usb) {
        throw new Error('WebUSB no está soportado en este navegador');
      }

      // Filtros para impresoras POS comunes (incluyendo Logic Controls)
      const filters = [
        { vendorId: 0x0DD4 }, // Logic Controls
        { vendorId: 0x04B8 }, // Epson
        { vendorId: 0x154F }, // Citizen
        { vendorId: 0x0519 }, // Star Micronics
      ];

      this.device = await navigator.usb.requestDevice({ filters });
      
      if (!this.device) {
        throw new Error('No se seleccionó ninguna impresora');
      }

      await this.device.open();
      
      // Seleccionar configuración
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Encontrar la interfaz correcta
      const interfaces = this.device.configuration?.interfaces || [];
      this.interface = interfaces.find(iface => 
        iface.alternates[0].interfaceClass === 7 // Printer class
      ) || interfaces[0];

      if (!this.interface) {
        throw new Error('No se encontró interfaz de impresora válida');
      }

      await this.device.claimInterface(this.interface.interfaceNumber);

      // Encontrar endpoint de salida
      const endpoints = this.interface.alternates[0].endpoints;
      this.endpoint = endpoints.find(ep => ep.direction === 'out');

      if (!this.endpoint) {
        throw new Error('No se encontró endpoint de salida');
      }

      toast.success('Impresora conectada exitosamente');
      return true;

    } catch (error) {
      console.error('Error conectando impresora:', error);
      toast.error(`Error al conectar impresora: ${error.message}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device && this.interface) {
        await this.device.releaseInterface(this.interface.interfaceNumber);
        await this.device.close();
      }
    } catch (error) {
      console.error('Error desconectando impresora:', error);
    } finally {
      this.device = null;
      this.interface = null;
      this.endpoint = null;
    }
  }

  async print(content: string): Promise<boolean> {
    if (!this.device || !this.endpoint) {
      toast.error('Impresora no conectada');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      
      await this.device.transferOut(this.endpoint.endpointNumber, data);
      toast.success('Documento enviado a impresora');
      return true;

    } catch (error) {
      console.error('Error imprimiendo:', error);
      toast.error(`Error al imprimir: ${error.message}`);
      return false;
    }
  }

  // Métodos para generar contenido ESC/POS
  centerText(text: string, width: number = 48): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  justifyText(left: string, right: string, width: number = 48): string {
    const totalLength = left.length + right.length;
    const spaces = Math.max(1, width - totalLength);
    return left + ' '.repeat(spaces) + right;
  }

  generateInvoice(sale: Sale, saleProducts: any[], storeData: any, employeeData: any): string {
    let content = this.INIT; // Inicializar impresora
    
    // LOGO ASCII centrado
    content += this.ALIGN_CENTER + this.BOLD_ON;
    const logoLines = STORE_LOGO.trim().split('\n');
    logoLines.forEach(line => {
      content += line + this.LINE_FEED;
    });
    content += this.BOLD_OFF + this.LINE_FEED;
    
    // Información de la tienda
    if (storeData) {
      content += this.BOLD_ON + storeData.name.toUpperCase() + this.BOLD_OFF + this.LINE_FEED;
      content += storeData.address + this.LINE_FEED;
    }
    content += 'TEL: 422003' + this.LINE_FEED;
    content += 'COCHABAMBA - BOLIVIA' + this.LINE_FEED;
    content += 'NIT: 7255039' + this.LINE_FEED + this.LINE_FEED;
    
    // Título de factura
    content += this.DOUBLE_HEIGHT + this.BOLD_ON;
    content += 'FACTURA DE VENTA' + this.LINE_FEED;
    content += `No ${sale.id.slice(-8).toUpperCase()}` + this.LINE_FEED;
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    content += format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm:ss") + this.LINE_FEED + this.LINE_FEED;
    
    // Información de la factura
    content += this.ALIGN_LEFT;
    content += `LUGAR Y FECHA: Cochabamba, ${format(new Date(sale.sale_date), "dd/MM/yyyy")}` + this.LINE_FEED;
    content += `CODIGO: ${sale.id.slice(-8).toUpperCase()} / NIT: 7255039` + this.LINE_FEED;
    if (employeeData) {
      content += `VENDEDOR: ${employeeData.first_name} ${employeeData.last_name}` + this.LINE_FEED;
    }
    content += this.LINE_FEED;
    
    // Información del cliente
    if (sale.customer_name || sale.customer_ci || sale.customer_phone) {
      content += '----------------------------------------' + this.LINE_FEED;
      content += 'DATOS DEL CLIENTE:' + this.LINE_FEED;
      
      if (sale.customer_name) {
        content += `SEÑOR(ES): ${sale.customer_name.toUpperCase()}` + this.LINE_FEED;
      }
      if (sale.customer_ci) {
        content += `C.I.: ${sale.customer_ci}` + this.LINE_FEED;
      }
      if (sale.customer_phone) {
        content += `CELULAR: ${sale.customer_phone}` + this.LINE_FEED;
      }
      content += this.LINE_FEED;
    }
    
    content += '========================================' + this.LINE_FEED;
    
    // Encabezado de productos
    content += this.ALIGN_CENTER + this.BOLD_ON;
    content += 'INFORMACION DEL PRODUCTO' + this.LINE_FEED;
    content += this.BOLD_OFF + this.ALIGN_LEFT + this.LINE_FEED;
    
    // Productos
    (saleProducts || []).forEach((item: any, index: number) => {
      const finalPrice = item.products.cost_price * this.exchangeRate + item.products.profit_bob;
      const itemNum = (index + 1).toString().padStart(2, '0');
      
      content += `ITEM ${itemNum}:` + this.LINE_FEED;
      content += `${item.products.name} ${item.products.color}` + this.LINE_FEED;
      content += `COD: ${item.product_barcodes_store?.barcode || "N/A"}` + this.LINE_FEED;
      content += `PRECIO: ${Math.round(finalPrice)} Bs.` + this.LINE_FEED;
      
      if (item.mei_codes && item.mei_codes.length > 0) {
        item.mei_codes.forEach((imei: string, idx: number) => {
          content += `IMEI${idx + 1}: ${imei}` + this.LINE_FEED;
        });
      }
      content += this.LINE_FEED;
    });
    
    content += '========================================' + this.LINE_FEED;
    
    // Totales
    content += this.ALIGN_RIGHT + this.BOLD_ON;
    content += `TOTAL A PAGAR: ${sale.total_sale} Bs.` + this.LINE_FEED;
    content += this.BOLD_OFF + this.LINE_FEED;
    content += `FORMA DE PAGO: ${sale.type_of_payment.toUpperCase()}` + this.LINE_FEED;
    content += this.LINE_FEED;
    
    // Pie de página
    content += this.ALIGN_CENTER;
    content += '¡GRACIAS POR SU COMPRA!' + this.LINE_FEED + this.LINE_FEED;
    content += 'GARANTIA DE 12 MESES' + this.LINE_FEED;
    content += 'SOLO DEFECTOS DE FABRICA' + this.LINE_FEED + this.LINE_FEED;
    content += 'CONSERVE ESTE DOCUMENTO' + this.LINE_FEED;
    content += 'PARA CUALQUIER RECLAMO' + this.LINE_FEED + this.LINE_FEED;
    content += `Impreso: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}` + this.LINE_FEED;
    content += this.LINE_FEED + this.LINE_FEED + this.LINE_FEED;
    
    // Cortar papel
    content += this.CUT_PAPER;
    
    return content;
  }

  generateWarranty(sale: Sale, saleProducts: any[], storeData: any, employeeData: any): string {
    let content = this.INIT; // Inicializar impresora
    
    // LOGO ASCII centrado
    content += this.ALIGN_CENTER + this.BOLD_ON;
    const logoLines = STORE_LOGO.trim().split('\n');
    logoLines.forEach(line => {
      content += line + this.LINE_FEED;
    });
    content += this.BOLD_OFF + this.LINE_FEED;
    
    // Información de la tienda
    if (storeData) {
      content += this.BOLD_ON + storeData.name.toUpperCase() + this.BOLD_OFF + this.LINE_FEED;
      content += storeData.address + this.LINE_FEED;
    }
    content += 'TEL 422003' + this.LINE_FEED;
    content += 'COCHABAMBA' + this.LINE_FEED;
    content += 'BOLIVIA' + this.LINE_FEED;
    content += 'NIT: 7255039' + this.LINE_FEED + this.LINE_FEED;
    
    // Título de garantía
    content += this.DOUBLE_HEIGHT + this.BOLD_ON;
    content += 'CERTIFICADO' + this.LINE_FEED;
    content += 'DE GARANTIA' + this.LINE_FEED;
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    content += `No ${sale.id.slice(-8).toUpperCase()}` + this.LINE_FEED;
    content += format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm:ss") + this.LINE_FEED + this.LINE_FEED;
    
    content += '========================================' + this.LINE_FEED;
    
    // Información
    content += this.ALIGN_LEFT;
    content += `LUGAR Y FECHA: Cochabamba, ${format(new Date(sale.sale_date), "dd/MM/yyyy")}` + this.LINE_FEED;
    content += `CODIGO: ${sale.id.slice(-8).toUpperCase()} / NIT: 7255039` + this.LINE_FEED;
    
    if (sale.customer_name || sale.customer_ci) {
      content += `SEÑOR(ES): ${(sale.customer_name || 'CLIENTE').toUpperCase()}` + this.LINE_FEED;
      if (sale.customer_ci) {
        content += `C.I.: ${sale.customer_ci}` + this.LINE_FEED;
      }
      if (sale.customer_phone) {
        content += `CELULAR: ${sale.customer_phone}` + this.LINE_FEED;
      }
    }
    
    if (employeeData) {
      content += `VENDEDOR: ${employeeData.first_name} ${employeeData.last_name}` + this.LINE_FEED;
    }
    
    content += this.LINE_FEED;
    
    // Advertencia importante
    content += 'Recuerde que no habra ningun tipo de garantia si' + this.LINE_FEED;
    content += 'el dispositivo presenta problemas tecnicos' + this.LINE_FEED;
    content += 'producidos por instalacion de programas,' + this.LINE_FEED;
    content += 'actualizaciones, archivos y/o virus que afecte a su' + this.LINE_FEED;
    content += 'normal funcionamiento.' + this.LINE_FEED + this.LINE_FEED;
    
    content += '========================================' + this.LINE_FEED;
    
    // Encabezado de productos
    content += this.ALIGN_CENTER + this.BOLD_ON;
    content += 'INFORMACION DEL PRODUCTO' + this.LINE_FEED;
    content += this.BOLD_OFF + this.ALIGN_LEFT + this.LINE_FEED;
    
    // Productos
    (saleProducts || []).forEach((item: any, index: number) => {
      const itemNum = (index + 1).toString();
      
      content += `ITEM ${itemNum}:` + this.LINE_FEED;
      content += `${item.products.name} ${item.products.color}` + this.LINE_FEED;
      content += `CANTIDAD: 1.00` + this.LINE_FEED;
      content += `SERIE: ${(item.product_barcodes_store?.barcode || "N/A").substring(0, 7)}` + this.LINE_FEED;
      
      if (item.mei_codes && item.mei_codes.length > 0) {
        item.mei_codes.forEach((imei: string, idx: number) => {
          content += `IMEI${idx + 1}: ${imei}` + this.LINE_FEED;
        });
      }
      content += this.LINE_FEED;
    });
    
    content += '========================================' + this.LINE_FEED;
    
    // Importante
    content += this.ALIGN_CENTER + this.BOLD_ON;
    content += 'IMPORTANTE' + this.LINE_FEED;
    content += this.BOLD_OFF + this.ALIGN_LEFT + this.LINE_FEED;
    
    content += 'En caso de presentar alguna falla en el' + this.LINE_FEED;
    content += 'lapso de 24 hrs. al cliente tiene que' + this.LINE_FEED;
    content += 'hacer conocer a la tienda llamando al' + this.LINE_FEED;
    content += '78333903.' + this.LINE_FEED + this.LINE_FEED;
    
    content += this.ALIGN_CENTER;
    content += 'CONSERVE ESTE DOCUMENTO,' + this.LINE_FEED;
    content += 'SIN CUALQUIER RECLAMO SIN LA' + this.LINE_FEED;
    content += 'PRESENTACION DEL MISMO NO' + this.LINE_FEED;
    content += 'HABRA NINGUNO.' + this.LINE_FEED + this.LINE_FEED;
    
    // Firma del cliente
    content += '========================================' + this.LINE_FEED;
    content += 'FIRMA DEL CLIENTE:' + this.LINE_FEED + this.LINE_FEED + this.LINE_FEED;
    content += '________________________________________' + this.LINE_FEED + this.LINE_FEED;
    
    // Pie de página
    content += this.ALIGN_CENTER;
    content += 'GARANTIA VALIDA POR 12 MESES' + this.LINE_FEED;
    content += 'SOLO DEFECTOS DE FABRICA' + this.LINE_FEED;
    content += `Impreso: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}` + this.LINE_FEED;
    content += this.LINE_FEED + this.LINE_FEED + this.LINE_FEED;
    
    // Cortar papel
    content += this.CUT_PAPER;
    
    return content;
  }

  private exchangeRate: number = 6.96;

  setExchangeRate(rate: number): void {
    this.exchangeRate = rate;
  }
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

  // Estados para impresora POS
  const [printer] = useState(new POSPrinter());
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);

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

  // Actualizar exchange rate en la impresora
  useEffect(() => {
    printer.setExchangeRate(exchangeRate);
  }, [exchangeRate, printer]);

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

            let storeData = null;
            if (sale.store_id && sale.store_id !== 'null' && sale.store_id.trim() !== '') {
              const { data } = await supabase
                .from("stores")
                .select("name")
                .eq("id", sale.store_id)
                .single();
              storeData = data;
            }

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

  const handleEditSale = async (sale: Sale) => {
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

  // Función para conectar impresora
  const handleConnectPrinter = async () => {
    const connected = await printer.connect();
    setIsPrinterConnected(connected);
  };

  // Función para desconectar impresora
  const handleDisconnectPrinter = async () => {
    await printer.disconnect();
    setIsPrinterConnected(false);
    toast.success("Impresora desconectada");
  };

  // Función para imprimir factura
  const handlePrintInvoice = async (sale: Sale) => {
    if (!isPrinterConnected) {
      toast.error("Primero debe conectar la impresora");
      return;
    }

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

      const invoiceContent = printer.generateInvoice(sale, saleProducts, storeData, employeeData);
      await printer.print(invoiceContent);

    } catch (error) {
      console.error("Error printing invoice:", error);
      toast.error("Error al imprimir la factura");
    }
  };

  // Función para imprimir garantía
  const handlePrintWarranty = async (sale: Sale) => {
    if (!isPrinterConnected) {
      toast.error("Primero debe conectar la impresora");
      return;
    }

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

      const warrantyContent = printer.generateWarranty(sale, saleProducts, storeData, employeeData);
      await printer.print(warrantyContent);

    } catch (error) {
      console.error("Error printing warranty:", error);
      toast.error("Error al imprimir la garantía");
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
      
      {/* Estado de la impresora */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Usb className={`w-6 h-6 ${isPrinterConnected ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="font-medium">
              Estado de Impresora: {isPrinterConnected ? 'Conectada' : 'Desconectada'}
            </span>
          </div>
          <div className="space-x-2">
            {!isPrinterConnected ? (
              <button
                onClick={handleConnectPrinter}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Usb size={16} />
                Conectar Impresora
              </button>
            ) : (
              <button
                onClick={handleDisconnectPrinter}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
        {!isPrinterConnected && (
          <p className="text-sm text-gray-600 mt-2">
            Nota: Asegúrese de que la impresora Logic Controls LR1100U esté conectada via USB y los drivers estén instalados.
          </p>
        )}
      </div>
      
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
                          onClick={() => handlePrintInvoice(sale)}
                          className="text-green-600 hover:text-green-800"
                          title="Imprimir Factura"
                          disabled={!isPrinterConnected}
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handlePrintWarranty(sale)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Imprimir Garantía"
                          disabled={!isPrinterConnected}
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
                      onClick={() => handlePrintInvoice(sale)}
                      className="text-green-600 hover:text-green-800"
                      disabled={!isPrinterConnected}
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => handlePrintWarranty(sale)}
                      className="text-purple-600 hover:text-purple-800"
                      disabled={!isPrinterConnected}
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