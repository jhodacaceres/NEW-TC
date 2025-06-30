import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Employee } from "../types";
import { supabase } from "../lib/supabase";

interface EmployeeFormProps {
  onSubmit: (data: Partial<Employee>) => void;
  employee?: Employee;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  onSubmit,
  employee,
}) => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: employee || {},
  });

  // Cargar tiendas disponibles
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, address')
          .order('name');

        if (error) throw error;
        setStores(data || []);
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 bg-white p-6 rounded-lg shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nombre *
          </label>
          <input
            type="text"
            {...register("first_name", { required: "Este campo es requerido" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ingrese el nombre"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.first_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Apellido
          </label>
          <input
            type="text"
            {...register("last_name")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ingrese el apellido (opcional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nombre de Usuario *
          </label>
          <input
            type="text"
            {...register("username", { 
              required: "Este campo es requerido",
              minLength: {
                value: 3,
                message: "El nombre de usuario debe tener al menos 3 caracteres"
              },
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: "Solo se permiten letras, números y guiones bajos"
              }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ingrese el nombre de usuario"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Contraseña *
          </label>
          <input
            type="password"
            {...register("password", { 
              required: "Este campo es requerido",
              minLength: {
                value: 6,
                message: "La contraseña debe tener al menos 6 caracteres"
              }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ingrese la contraseña"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cargo *
          </label>
          <select
            {...register("position", { required: "Este campo es requerido" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Seleccione un cargo</option>
            <option value="ventas">Ventas</option>
            <option value="administrador">Administrador</option>
          </select>
          {errors.position && (
            <p className="mt-1 text-sm text-red-600">
              {errors.position.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tienda Asignada *
          </label>
          <select
            {...register("store_id", { required: "Este campo es requerido" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Seleccione una tienda</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} - {store.address}
              </option>
            ))}
          </select>
          {errors.store_id && (
            <p className="mt-1 text-sm text-red-600">
              {errors.store_id.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Teléfono
          </label>
          <input
            type="tel"
            {...register("phone", {
              pattern: {
                value: /^[0-9+\s-]+$/,
                message: "Ingrese un número de teléfono válido",
              },
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+591 XXXXXXXX (opcional)"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {employee ? "Actualizar Empleado" : "Crear Empleado"}
        </button>
      </div>
    </form>
  );
};