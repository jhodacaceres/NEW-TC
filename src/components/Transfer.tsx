import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Store, Employee, Product } from "../types";
import AlertDelete from "./ModalDelete";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
} from "lucide-react";

interface TransferProps {
  products: Product[];
  stores: Store[];
  employees: Employee[];
  onSubmit: (transferData: {
    products: { id: string; quantity: number }[];
    fromStoreId: string;
    toStoreId: string;
    employeeId: string;
  }) => void;
}

interface TransferHistoryItem {
  id: string;
  transfer_date: string;
  from_store_name: string;
  to_store_name: string;
  employee_name: string;
  items: {
    product_name: string;
    barcode: string;
  }[];
}

export const TransferComponent: React.FC<TransferProps> = ({
  products,
  stores,
  employees,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const fromStore = watch("store_origin_id");
  const toStore = watch("store_destiny_id");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; barcode_id: string; barcode: string }[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferHistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [productIdDelete, setProductIdDelete] = useState<string>();
  const [offset, setOffset] = useState(0);
  const [limitItems] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [employeeStore, setEmployeeStore] = useState<any>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // Cargar empleado actual y su tienda asignada
  useEffect(() => {
    const fetchCurrentEmployee = async () => {
      const employeeData = localStorage.getItem('currentEmployee');
      if (employeeData) {
        const employee = JSON.parse(employeeData);
        setCurrentEmployee(employee);
        
        // Obtener la tienda del empleado con información completa
        if (employee.store_id) {
          const { data: storeData } = await supabase
            .from('stores')
            .select('*')
            .eq('id', employee.store_id)
            .single();
          
          if (storeData) {
            setEmployeeStore(storeData);
            // Solo establecer automáticamente si no es admin
            if (employee.position !== 'administrador') {
              setValue("store_origin_id", storeData.id);
            }
          }
        }
      }
    };

    fetchCurrentEmployee();
  }, [setValue]);

  // Cargar productos disponibles cuando cambie la tienda de origen
  useEffect(() => {
    if (fromStore) {
      fetchAvailableProducts();
    }
  }, [fromStore]);

  const fetchAvailableProducts = async () => {
    if (!fromStore) return;

    try {
      // Obtener productos con códigos de barras disponibles en la tienda seleccionada
      const { data, error } = await supabase
        .from("product_barcodes_store")
        .select(`
          id,
          barcode,
          product_id,
          products!product_id (
            id,
            name,
            color,
            image,
            cost_price,
            profit_bob
          )
        `)
        .eq("store_id", fromStore)
        .eq("is_sold", false);

      if (error) throw error;

      // Formatear los datos para incluir el código de barras con el producto
      const formattedProducts = data?.map((item: any) => ({
        barcode_id: item.id,
        barcode: item.barcode,
        ...item.products,
      })) || [];

      setAvailableProducts(formattedProducts);
    } catch (error) {
      console.error("Error fetching available products:", error);
      toast.error("Error al cargar productos disponibles", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  // Filtrar productos disponibles por código de barras o nombre
  const filteredProducts = searchTerm
    ? availableProducts.filter((product) => {
        const term = searchTerm.toLowerCase();
        return (
          product.barcode?.toLowerCase().includes(term) ||
          product.name.toLowerCase().includes(term) ||
          product.color.toLowerCase().includes(term)
        );
      })
    : [];

  // Manejar selección de producto
  const handleProductSelect = (product: any) => {
    if (!selectedProducts.find((p) => p.barcode_id === product.barcode_id)) {
      setSelectedProducts([...selectedProducts, { 
        product, 
        barcode_id: product.barcode_id,
        barcode: product.barcode 
      }]);
    }
    setSearchTerm("");
  };

  // Manejar eliminación de producto
  const handleDelete = (barcodeId: string) => {
    setIsOpen(true);
    setProductIdDelete(barcodeId);
  };

  const removeProduct = (barcodeId: string) => {
    setSelectedProducts(
      selectedProducts.filter((item) => item.barcode_id !== barcodeId)
    );
    setProductIdDelete(undefined);
    setIsOpen(false);
  };

  // Manejar envío de transferencia
  const handleTransferSubmit = async (formData: any) => {
    if (fromStore === toStore) {
      return toast.error("La tienda de origen y destino no pueden ser la misma", {
        duration: 3000,
        position: "top-right",
      });
    }

    if (selectedProducts.length === 0) {
      return toast.error("Debe seleccionar al menos un producto", {
        duration: 3000,
        position: "top-right",
      });
    }

    if (!fromStore || !toStore || !currentEmployee) {
      return toast.error("Debe completar todos los campos", {
        duration: 3000,
        position: "top-right",
      });
    }

    try {
      // Crear la transferencia
      const transferId = crypto.randomUUID();
      const { error: transferError } = await supabase
        .from("transfers")
        .insert([
          {
            id: transferId,
            store_origin_id: fromStore,
            store_destiny_id: toStore,
            employee_id: currentEmployee.id,
            transfer_date: new Date().toISOString(),
          },
        ]);

      if (transferError) throw transferError;

      // Crear items de transferencia y mover códigos de barras
      for (const item of selectedProducts) {
        // Crear registro de transferencia
        const { error: itemError } = await supabase
          .from("transfer_product")
          .insert([
            {
              transfer_id: transferId,
              product_id: item.product.id,
              barcode_id: item.barcode_id,
            },
          ]);

        if (itemError) throw itemError;

        // Actualizar la tienda del código de barras
        const { error: barcodeUpdateError } = await supabase
          .from("product_barcodes_store")
          .update({
            store_id: toStore,
          })
          .eq("id", item.barcode_id);

        if (barcodeUpdateError) throw barcodeUpdateError;
      }

      // Limpiar formulario
      setSelectedProducts([]);
      reset();
      setSearchTerm("");
      
      // Recargar datos
      fetchAvailableProducts();
      fetchTransferHistory();
      
      toast.success("¡Transferencia registrada exitosamente!", {
        duration: 3000,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error saving transfer:", error);
      toast.error("Error al registrar la transferencia", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  // Manejar escáner
  const handleScanner = () => {
    if (searchRef.current) {
      searchRef.current.focus();
      toast.success("Puede escanear el código de barras", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  // Obtener historial de transferencias
  const fetchTransferHistory = async () => {
    try {
      const { data: transfersData, error: transfersError } = await supabase
        .from("transfers")
        .select(`
          id,
          transfer_date,
          store_origin_id,
          store_destiny_id,
          employee_id
        `)
        .order("transfer_date", { ascending: false })
        .range(offset, offset + limitItems - 1);

      if (transfersError) throw transfersError;

      if (transfersData) {
        // Obtener información adicional para cada transferencia
        const enrichedTransfers = await Promise.all(
          transfersData.map(async (transfer) => {
            // Obtener nombres de tiendas
            let fromStoreData = { data: null };
            let toStoreData = { data: null };
            
            if (transfer.store_origin_id && transfer.store_origin_id !== 'null' && transfer.store_origin_id.trim() !== '') {
              fromStoreData = await supabase.from("stores").select("name").eq("id", transfer.store_origin_id).single();
            }
            
            if (transfer.store_destiny_id && transfer.store_destiny_id !== 'null' && transfer.store_destiny_id.trim() !== '') {
              toStoreData = await supabase.from("stores").select("name").eq("id", transfer.store_destiny_id).single();
            }

            // Obtener nombre del empleado
            const { data: employeeData } = await supabase
              .from("employees")
              .select("first_name, last_name")
              .eq("id", transfer.employee_id)
              .single();

            // Obtener items de la transferencia con códigos de barras
            const { data: itemsData } = await supabase
              .from("transfer_product")
              .select(`
                product_id,
                barcode_id,
                products!product_id (name),
                product_barcodes_store!barcode_id (barcode)
              `)
              .eq("transfer_id", transfer.id);

            const items = (itemsData || []).map((item: any) => ({
              product_name: item.products?.name || "Producto no encontrado",
              barcode: item.product_barcodes_store?.barcode || "N/A",
            }));

            return {
              id: transfer.id,
              transfer_date: transfer.transfer_date,
              from_store_name: fromStoreData?.data?.name || "Tienda no encontrada",
              to_store_name: toStoreData?.data?.name || "Tienda no encontrada",
              employee_name: employeeData 
                ? `${employeeData.first_name} ${employeeData.last_name || ''}`
                : "Empleado no encontrado",
              items,
            };
          })
        );

        setTransferHistory(enrichedTransfers);
        setHasMore(transfersData.length === limitItems);
      }
    } catch (error) {
      console.error("Error fetching transfer history:", error);
      toast.error("Error al cargar el historial de transferencias", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  // Cargar historial al montar el componente
  useEffect(() => {
    fetchTransferHistory();
  }, [offset]);

  // Detectar códigos escaneados
  useEffect(() => {
    if (searchTerm !== "") {
      const scannedProduct = availableProducts.find(
        (product) => product.barcode === searchTerm
      );
      if (scannedProduct) {
        handleProductSelect(scannedProduct);
        setSearchTerm("");
      }
    }
  }, [searchTerm, availableProducts]);

  return (
    <>
      <Toaster />
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Nueva Transferencia</h2>
        
        {/* Información del empleado */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Empleado:</p>
              <p className="font-medium">
                {currentEmployee ? `${currentEmployee.first_name} ${currentEmployee.last_name || ''}` : 'No identificado'}
              </p>
            </div>
            {currentEmployee?.position !== 'administrador' && employeeStore && (
              <div>
                <p className="text-sm text-gray-600">Tienda de Origen:</p>
                <p className="font-medium">{employeeStore.name}</p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(handleTransferSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Desde Tienda - Solo para admin */}
            {currentEmployee?.position === 'administrador' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Desde Tienda
                </label>
                <select
                  {...register("store_origin_id", {
                    required: "Debe seleccionar una tienda de origen",
                  })}
                  className="mt-1 block w-full p-2 border cursor-pointer rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Seleccionar tienda de origen</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                {errors.store_origin_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.store_origin_id.message as string}
                  </p>
                )}
              </div>
            )}

            {/* Hacia Tienda */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hacia Tienda
              </label>
              <select
                {...register("store_destiny_id", {
                  required: "Debe seleccionar una tienda",
                  validate: (value) =>
                    value !== fromStore || "Las tiendas deben ser diferentes",
                })}
                className="mt-1 block w-full p-2 border cursor-pointer rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Seleccionar tienda</option>
                {stores
                  .filter(store => store.id !== fromStore)
                  .map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
              </select>
              {errors.store_destiny_id && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.store_destiny_id.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Búsqueda de productos */}
          <div className="relative">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="search"
                value={searchTerm}
                ref={searchRef}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escanear código de barras o buscar por nombre del producto..."
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
                {filteredProducts.map((product, index) => (
                  <button
                    key={`${product.barcode_id}-${index}`}
                    type="button"
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
                        Código: {product.barcode}
                      </p>
                      <p className="text-sm text-gray-500">
                        Color: {product.color}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Productos seleccionados */}
          {selectedProducts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">
                Productos Seleccionados ({selectedProducts.length})
              </h3>
              <div className="space-y-4">
                {selectedProducts.map((item) => (
                  <div
                    key={item.barcode_id}
                    className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.product.image || "https://placehold.co/64x64?text=No+Image"}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          Color: {item.product.color}
                        </p>
                        <p className="text-sm text-gray-500">
                          Código: {item.barcode}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.barcode_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AlertDelete
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            removeProduct={() => removeProduct(productIdDelete!)}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 cursor-pointer text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrar Transferencia
            </button>
          </div>
        </form>
      </section>

      {/* Historial de transferencias */}
      <section className="bg-white rounded-lg shadow overflow-hidden my-8">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Historial de Transferencias</h2>
            <div>
              <span>Mostrando {transferHistory.length} transferencias</span>
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
                    Desde Tienda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hacia Tienda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transferHistory.map((transfer) => (
                  <tr key={transfer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(transfer.transfer_date), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {transfer.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-gray-500">Código: {item.barcode}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transfer.from_store_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transfer.to_store_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transfer.employee_name}
                    </td>
                  </tr>
                ))}
                {transferHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No hay transferencias registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="md:hidden space-y-4">
            {transferHistory.map((transfer) => (
              <div key={transfer.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium">
                    {format(new Date(transfer.transfer_date), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Productos:</span>
                    <div className="mt-1 space-y-1">
                      {transfer.items.map((item, index) => (
                        <div key={index} className="bg-white p-2 rounded text-xs">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-gray-500">Código: {item.barcode}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desde:</span>
                    <span>{transfer.from_store_name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hacia:</span>
                    <span>{transfer.to_store_name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Empleado:</span>
                    <span>{transfer.employee_name}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {transferHistory.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No hay transferencias registradas
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};