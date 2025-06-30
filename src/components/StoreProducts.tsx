import React, { useState, useEffect, useRef } from 'react';
import { Product, Store } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Package, Scan } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface StoreProductsProps {
  store: Store;
  products: Product[];
  onBack: () => void;
}

interface StoreProductAssignment {
  id: string;
  store_id: string;
  product_id: string;
  created_at: string;
}

interface ProductBarcode {
  id: string;
  store_id: string;
  product_id: string;
  barcode: string;
  is_sold: boolean;
  created_at: string;
  sold_at?: string;
}

export const StoreProducts: React.FC<StoreProductsProps> = ({ 
  store, 
  products, 
  onBack 
}) => {
  const [storeProducts, setStoreProducts] = useState<StoreProductAssignment[]>([]);
  const [productBarcodes, setProductBarcodes] = useState<ProductBarcode[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [scanningForProduct, setScanningForProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cargar productos asignados a la tienda
  useEffect(() => {
    fetchStoreProducts();
    fetchProductBarcodes();
  }, [store.id]);

  const fetchStoreProducts = async () => {
    try {
      // Obtener productos únicos asignados a esta tienda
      const { data, error } = await supabase
        .from('product_barcodes_store')
        .select('product_id')
        .eq('store_id', store.id);

      if (error) throw error;

      // Crear lista única de productos asignados
      const uniqueProductIds = [...new Set(data?.map(item => item.product_id) || [])];
      const assignments = uniqueProductIds.map(productId => ({
        id: crypto.randomUUID(),
        store_id: store.id,
        product_id: productId,
        created_at: new Date().toISOString(),
      }));

      setStoreProducts(assignments);
    } catch (error) {
      console.error('Error fetching store products:', error);
      toast.error('Error al cargar productos de la tienda');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductBarcodes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_barcodes_store')
        .select('*')
        .eq('store_id', store.id);

      if (error) throw error;
      setProductBarcodes(data || []);
    } catch (error) {
      console.error('Error fetching product barcodes:', error);
    }
  };

  // Obtener producto por ID
  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  // Obtener productos no asignados a esta tienda
  const getUnassignedProducts = () => {
    const assignedProductIds = storeProducts.map(sp => sp.product_id);
    return products.filter(p => !assignedProductIds.includes(p.id) && p.active);
  };

  // Asignar producto a tienda (sin stock inicial)
  const handleAssignProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductId) {
      toast.error('Por favor seleccione un producto');
      return;
    }

    try {
      // Solo crear la asignación, sin stock inicial
      const newAssignment = {
        id: crypto.randomUUID(),
        store_id: store.id,
        product_id: selectedProductId,
        created_at: new Date().toISOString(),
      };

      setStoreProducts([...storeProducts, newAssignment]);
      toast.success('Producto asignado exitosamente');
      setShowAssignForm(false);
      setSelectedProductId('');
    } catch (error) {
      console.error('Error assigning product:', error);
      toast.error('Error al asignar producto');
    }
  };

  // Desasignar producto de tienda
  const handleUnassignProduct = async (productId: string) => {
    if (!confirm('¿Está seguro de desasignar este producto de la tienda? Se eliminarán todos los códigos de barras asociados.')) {
      return;
    }

    try {
      // Eliminar todos los códigos de barras del producto en esta tienda
      const { error } = await supabase
        .from('product_barcodes_store')
        .delete()
        .eq('store_id', store.id)
        .eq('product_id', productId);

      if (error) throw error;

      toast.success('Producto desasignado exitosamente');
      fetchStoreProducts();
      fetchProductBarcodes();
    } catch (error) {
      console.error('Error unassigning product:', error);
      toast.error('Error al desasignar producto');
    }
  };

  // Agregar código de barras
  const handleAddBarcode = async (productId: string) => {
    if (!newBarcode.trim()) {
      toast.error('Por favor ingrese un código de barras');
      return;
    }

    try {
      // Verificar que el código no exista ya
      const { data: existingBarcode } = await supabase
        .from('product_barcodes_store')
        .select('id')
        .eq('barcode', newBarcode.trim())
        .single();

      if (existingBarcode) {
        toast.error('Este código de barras ya está registrado');
        return;
      }

      const { error } = await supabase
        .from('product_barcodes_store')
        .insert([{
          store_id: store.id,
          product_id: productId,
          barcode: newBarcode.trim(),
          is_sold: false,
        }]);

      if (error) throw error;

      toast.success('Código de barras agregado exitosamente');
      setNewBarcode('');
      setScanningForProduct(null);
      fetchProductBarcodes();
    } catch (error) {
      console.error('Error adding barcode:', error);
      toast.error('Error al agregar código de barras');
    }
  };

  // Eliminar código de barras
  const handleDeleteBarcode = async (barcodeId: string) => {
    if (!confirm('¿Está seguro de eliminar este código de barras?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_barcodes_store')
        .delete()
        .eq('id', barcodeId);

      if (error) throw error;

      toast.success('Código de barras eliminado');
      fetchProductBarcodes();
    } catch (error) {
      console.error('Error deleting barcode:', error);
      toast.error('Error al eliminar código de barras');
    }
  };

  // Iniciar escaneo para un producto específico
  const startScanning = (productId: string) => {
    setScanningForProduct(productId);
    setNewBarcode('');
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
    toast.success('Puede escanear el código de barras ahora');
  };

  // Obtener códigos de barras para un producto específico
  const getBarcodesForProduct = (productId: string) => {
    return productBarcodes.filter(pb => pb.product_id === productId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Volver a tiendas
          </button>
          <h2 className="text-2xl font-semibold">
            Productos en {store.name}
          </h2>
          <p className="text-gray-600">{store.address}</p>
        </div>
        <button
          onClick={() => setShowAssignForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Asignar Producto
        </button>
      </div>

      {/* Formulario de asignación */}
      {showAssignForm && (
        <div className="bg-white rounded-lg shadow p-6 border">
          <h3 className="text-lg font-semibold mb-4">Asignar Producto a Tienda</h3>
          <form onSubmit={handleAssignProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Producto
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar producto</option>
                {getUnassignedProducts().map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.color}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAssignForm(false);
                  setSelectedProductId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Asignar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de productos asignados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeProducts.map((storeProduct) => {
          const product = getProduct(storeProduct.product_id);
          const barcodes = getBarcodesForProduct(storeProduct.product_id);
          
          if (!product) return null;

          return (
            <div key={storeProduct.product_id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Imagen del producto */}
              <div className="h-48 bg-gray-100">
                <img
                  src={product.image || "https://placehold.co/400x300?text=No+Image"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Image+Error";
                  }}
                />
              </div>

              {/* Información del producto */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {product.name}
                </h3>
                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p>Color: {product.color}</p>
                  <p>Códigos de barras: {barcodes.filter(b => !b.is_sold).length}</p>
                  <p>RAM: {product.ram}GB | ROM: {product.rom}GB</p>
                  <p>Procesador: {product.processor}</p>
                </div>

                {/* Códigos de barras */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Códigos de Barras ({barcodes.filter(b => !b.is_sold).length})
                    </h4>
                    <button
                      onClick={() => startScanning(storeProduct.product_id)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <Scan size={16} />
                      Agregar
                    </button>
                  </div>

                  {/* Lista de códigos de barras */}
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {barcodes.filter(b => !b.is_sold).map((barcode) => (
                      <div
                        key={barcode.id}
                        className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs"
                      >
                        <span className="font-mono">{barcode.barcode}</span>
                        <button
                          onClick={() => handleDeleteBarcode(barcode.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {barcodes.filter(b => !b.is_sold).length === 0 && (
                      <p className="text-xs text-gray-500 italic">
                        No hay códigos de barras disponibles
                      </p>
                    )}
                  </div>

                  {/* Input para nuevo código de barras */}
                  {scanningForProduct === storeProduct.product_id && (
                    <div className="mt-2">
                      <div className="flex gap-2">
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={newBarcode}
                          onChange={(e) => setNewBarcode(e.target.value)}
                          placeholder="Escanee o ingrese código de barras"
                          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddBarcode(storeProduct.product_id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddBarcode(storeProduct.product_id)}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Agregar
                        </button>
                        <button
                          onClick={() => {
                            setScanningForProduct(null);
                            setNewBarcode('');
                          }}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleUnassignProduct(storeProduct.product_id)}
                    className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    Desasignar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensaje cuando no hay productos */}
      {storeProducts.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay productos asignados
          </h3>
          <p className="text-gray-500 mb-4">
            Comience asignando productos a esta tienda
          </p>
          <button
            onClick={() => setShowAssignForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Asignar Primer Producto
          </button>
        </div>
      )}
    </div>
  );
};