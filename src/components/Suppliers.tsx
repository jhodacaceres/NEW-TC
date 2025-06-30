import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react'; // Importa el ícono de búsqueda
import { Supplier } from '../types';
import { SupplierForm } from './SupplierForm';
import { supabase } from '../lib/supabase'; // Asegúrate de tener la configuración de Supabase

export const Suppliers = () => {
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [searchTerm, setSearchTerm] = useState(''); // Nuevo estado para el término de búsqueda

  // Obtener los proveedores desde Supabase
  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error } = await supabase.from('suppliers').select('*');
      if (data) {
        setSuppliers(data);
      } else {
        console.error('Error fetching suppliers: ', error);
      }
    };

    fetchSuppliers();
  }, []);

  // Función para manejar el formulario de proveedores (crear o editar)
  const handleSubmit = async (data: Partial<Supplier>) => {
    if (selectedSupplier) {
      // Editar proveedor
      const { error } = await supabase
        .from('suppliers')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        })
        .eq('id', selectedSupplier.id);

      if (error) {
        console.error('Error updating supplier:', error);
      } else {
        setSuppliers(
          suppliers.map((sup) =>
            sup.id === selectedSupplier.id ? { ...sup, ...data } : sup
          )
        );
      }
    } else {
      // Crear nuevo proveedor
      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert([
          {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error inserting supplier:', error);
      } else {
        if (newSupplier) {
          setSuppliers([...suppliers, newSupplier]);
        }
      }
    }
    setShowForm(false);
    setSelectedSupplier(undefined);
  };

  // Editar proveedor
  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  };

  // Eliminar proveedor
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting supplier:', error);
    } else {
      setSuppliers(suppliers.filter((sup) => sup.id !== id));
    }
  };

  // Manejador del cambio en el input de búsqueda
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Filtrar proveedores basado en el término de búsqueda
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {selectedSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedSupplier(undefined);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
          <SupplierForm onSubmit={handleSubmit} supplier={selectedSupplier} />
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center"> {/* Contenedor para el botón y el buscador */}
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nuevo Proveedor
            </button>

            {/* Input de búsqueda */}
            <div className="relative flex items-center">
              <Search size={20} className="absolute left-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proveedor..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>

          <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apellido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => ( 
                  <tr key={supplier.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.first_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No hay proveedores registrados que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Vista en tarjetas para móvil */}
          <div className="space-y-4 sm:hidden">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-lg shadow p-4">
                <p className="text-sm font-semibold text-gray-800">
                  {supplier.first_name} {supplier.last_name}
                </p>
                <p className="text-sm text-gray-600">Teléfono: {supplier.phone}</p>
                <div className="flex justify-end space-x-4 mt-3">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {filteredSuppliers.length === 0 && (
              <div className="text-center text-gray-500">No hay proveedores registrados que coincidan con la búsqueda.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};