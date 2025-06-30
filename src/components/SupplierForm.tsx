import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Supplier } from '../types';
import { supabase } from '../lib/supabase';

interface SupplierFormProps {
  onSubmit: (data: Partial<Supplier>) => void;
  supplier?: Supplier;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ onSubmit, supplier }) => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: supplier || {} // Si hay un proveedor seleccionado, se precargan los valores
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Si el proveedor está cargado, precargar sus datos en el formulario
  useEffect(() => {
    if (supplier) {
      setValue('first_name', supplier.first_name);
      setValue('last_name', supplier.last_name);
      setValue('phone', supplier.phone);
    }
  }, [supplier, setValue]);

  const handleSave = async (data: Partial<Supplier>) => {
    if (loading) return; // No hacer nada si ya está en proceso de guardado

    setLoading(true);

    try {
      // Si es un proveedor existente, actualizarlo
      if (supplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({ 
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', supplier.id);

        if (error) throw error;
      } 
      // Si es un nuevo proveedor, insertarlo
      else {
        const { error } = await supabase
          .from('suppliers')
          .insert([{
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
  
        if (error) throw error;
      }

      // Llamar a la función onSubmit para propagar los cambios al componente principal
      onSubmit(data);

      // Redirigir al usuario a la lista de proveedores
      navigate('/suppliers'); // Asegúrate de que esta sea la ruta correcta
    } catch (error) {
      console.error("Error al guardar el proveedor:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            {...register('first_name', { required: 'Este campo es requerido' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>

        {/* Apellido */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Apellido</label>
          <input
            type="text"
            {...register('last_name', { required: 'Este campo es requerido' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            type="tel"
            {...register('phone', { required: 'Este campo es requerido' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Botón de Enviar */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading} // Deshabilitar el botón mientras se guarda
        >
          {loading ? 'Guardando...' : supplier ? 'Actualizar Proveedor' : 'Crear Proveedor'}
        </button>
      </div>
    </form>
  );
};
