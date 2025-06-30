import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import { Store, Product } from "../types";
import { StoreProducts } from "./StoreProducts";
import { supabase } from "../lib/supabase";
import AlertDelete from "./ModalDelete";

interface StoresProps {
  stores: Store[];
  products: Product[];
  onStoreCreate: (store: Partial<Store>) => void;
  onStoreUpdate: (id: string, store: Partial<Store>) => void;
  onStoreDelete: (id: string) => void;
  onProductAssign: (storeId: string, productId: string) => void;
}

export const Stores: React.FC<StoresProps> = ({ products }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [showProducts, setShowProducts] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeProductCounts, setStoreProductCounts] = useState<Record<string, number>>({});

  // Estados para el modal de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [storeToDeleteId, setStoreToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
    fetchStoreProductCounts();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("*");
    if (error) {
      console.error("Error fetching stores", error);
    } else {
      setStores(data || []);
    }
  };

  const fetchStoreProductCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("store_id");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((item) => {
        counts[item.store_id] = (counts[item.store_id] || 0) + 1;
      });

      setStoreProductCounts(counts);
    } catch (error) {
      console.error("Error fetching store product counts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStore) {
      // Actualizar tienda
      const { error } = await supabase
        .from("stores")
        .update({ name, address })
        .eq("id", selectedStore.id);

      if (error) {
        console.error("Error actualizando tienda:", error.message);
        return;
      }
    } else {
      // Crear tienda
      const { error } = await supabase
        .from("stores")
        .insert({ name, address });

      if (error) {
        console.error("Error creando tienda:", error.message);
        return;
      }
    }

    setShowForm(false);
    setSelectedStore(null);
    setName("");
    setAddress("");
    fetchStores();
  };

  const confirmDelete = (id: string) => {
    setStoreToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (storeToDeleteId) {
      // Primero eliminar códigos de barras asociados
      await supabase
        .from('product_barcodes')
        .delete()
        .in('store_product_id', 
          await supabase
            .from('store_products')
            .select('id')
            .eq('store_id', storeToDeleteId)
            .then(({ data }) => data?.map(sp => sp.id) || [])
        );

      // Luego eliminar asignaciones de productos
      await supabase
        .from('store_products')
        .delete()
        .eq('store_id', storeToDeleteId);

      // Finalmente eliminar la tienda
      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeToDeleteId);
        
      if (error) {
        console.error("Error al eliminar tienda:", error.message);
        return;
      }
      
      fetchStores();
      fetchStoreProductCounts();
      setIsDeleteModalOpen(false);
      setStoreToDeleteId(null);
    }
  };

  const handleEdit = (store: Store) => {
    setSelectedStore(store);
    setName(store.name);
    setAddress(store.address);
    setShowForm(true);
  };

  const handleShowProducts = (storeId: string) => {
    setShowProducts(storeId);
  };

  // Si estamos viendo productos de una tienda específica
  if (showProducts) {
    const store = stores.find((s) => s.id === showProducts);
    if (store) {
      return (
        <StoreProducts 
          store={store} 
          products={products}
          onBack={() => setShowProducts(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {selectedStore ? "Editar Tienda" : "Nueva Tienda"}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedStore(null);
                setName("");
                setAddress("");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la Tienda
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dirección
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {selectedStore ? "Actualizar Tienda" : "Crear Tienda"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nueva Tienda
            </button>
          </div>

          {/* Vista de tabla para escritorio */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm sm:table hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Productos Asignados
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stores.map((store) => (
                    <tr key={store.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {store.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {store.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleShowProducts(store.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-2"
                        >
                          <Package size={16} />
                          {storeProductCounts[store.id] || 0} productos
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(store)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => confirmDelete(store.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stores.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No hay tiendas registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="sm:hidden space-y-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-white p-4 rounded-lg shadow space-y-2"
              >
                <div className="font-semibold">{store.name}</div>
                <div className="text-gray-600">{store.address}</div>
                <button
                  onClick={() => handleShowProducts(store.id)}
                  className="text-blue-600 hover:text-blue-900 flex items-center gap-2 text-sm"
                >
                  <Package size={16} />
                  {storeProductCounts[store.id] || 0} productos
                </button>
                <div className="flex flex-wrap gap-3 mt-2">
                  <button
                    onClick={() => handleEdit(store)}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => confirmDelete(store.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {stores.length === 0 && (
              <div className="text-center text-gray-500">
                No hay tiendas registradas
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de eliminación */}
      <AlertDelete
        isOpen={isDeleteModalOpen}
        removeProduct={executeDelete}
        setIsOpen={setIsDeleteModalOpen}
        title="¿Eliminar tienda?"
        message="Esta acción eliminará la tienda y todos los productos asignados a ella. ¿Está seguro?"
      />
    </div>
  );
};