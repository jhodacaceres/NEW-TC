import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Eye, EyeOff } from "lucide-react";
import { Employee } from "../types";
import { EmployeeForm } from "./EmployeeForm";
import { supabase } from '../lib/supabase';

export const Employees = () => {
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Obtener empleados y tiendas desde Supabase
  const fetchData = async () => {
    try {
      // Obtener empleados con información de tienda
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          *,
          stores!store_id (
            id,
            name,
            address
          )
        `);

      if (employeesError) {
        console.error('❌ Error al obtener empleados:', employeesError.message);
      } else {
        setEmployees(employeesData || []);
      }

      // Obtener tiendas para el formulario
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*');

      if (storesError) {
        console.error('❌ Error al obtener tiendas:', storesError.message);
      } else {
        setStores(storesData || []);
      }
    } catch (error) {
      console.error('❌ Error general:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (data: Partial<Employee>) => {
    try {
      if (selectedEmployee) {
        // Actualizar
        const { error } = await supabase
          .from('employees')
          .update({
            first_name: data.first_name,
            last_name: data.last_name || null,
            username: data.username,
            password: data.password,
            position: data.position,
            phone: data.phone || null,
            store_id: data.store_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedEmployee.id);

        if (error) throw error;
      } else {
        // Insertar nuevo
        const { error } = await supabase
          .from('employees')
          .insert([{
            first_name: data.first_name,
            last_name: data.last_name || null,
            username: data.username,
            password: data.password,
            position: data.position,
            phone: data.phone || null,
            store_id: data.store_id,
            active: true
          }]);

        if (error) throw error;
      }

      setShowForm(false);
      setSelectedEmployee(undefined);
      await fetchData(); // Refrescar lista
    } catch (error: any) {
      console.error('❌ Error al guardar empleado:', error.message);
      if (error.code === '23505') {
        alert('Error: El nombre de usuario ya existe. Por favor, elija otro.');
      } else {
        alert('Error al guardar empleado: ' + error.message);
      }
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) {
        console.error('❌ Error al eliminar empleado:', error.message);
        alert('Error al eliminar empleado');
      } else {
        await fetchData();
      }
    }
  };

  const togglePasswordVisibility = (employeeId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'Sin asignar';
  };

  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.first_name} ${employee.last_name || ''}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const storeName = getStoreName(employee.store_id || '').toLowerCase();
    
    return (
      fullName.includes(searchLower) ||
      employee.position.toLowerCase().includes(searchLower) ||
      employee.username.toLowerCase().includes(searchLower) ||
      storeName.includes(searchLower) ||
      (employee.phone && employee.phone.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      {showForm ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {selectedEmployee ? "Editar Empleado" : "Nuevo Empleado"}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedEmployee(undefined);
              }}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              Cancelar
            </button>
          </div>
          <div className="p-4">
            <EmployeeForm onSubmit={handleSubmit} employee={selectedEmployee} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Nuevo Empleado
            </button>

            <div className="w-full sm:w-96 relative">
              <input
                type="text"
                placeholder="Buscar empleados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
            </div>
          </div>

          {/* Vista de tabla solo en pantallas medianas en adelante */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empleado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contraseña
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tienda
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
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {employee.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900 font-mono">
                            {showPasswords[employee.id] ? employee.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(employee.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords[employee.id] ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.position === 'administrador' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {employee.position === 'administrador' ? 'Administrador' : 'Ventas'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getStoreName(employee.store_id || '')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {employee.phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No hay empleados registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista de cartas solo en móviles */}
          <div className="block md:hidden space-y-4">
            {filteredEmployees.length === 0 ? (
              <p className="text-center text-gray-500">
                No hay empleados registrados
              </p>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {employee.first_name} {employee.last_name || ''}
                    </h3>
                    <p className="text-sm text-gray-600">
                      <strong>Usuario:</strong> <span className="font-mono">{employee.username}</span>
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <strong>Contraseña:</strong>
                      <span className="font-mono">
                        {showPasswords[employee.id] ? employee.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(employee.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords[employee.id] ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Cargo:</strong> 
                      <span className={`inline-flex ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.position === 'administrador' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.position === 'administrador' ? 'Administrador' : 'Ventas'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Tienda:</strong> {getStoreName(employee.store_id || '')}
                    </p>
                    {employee.phone && (
                      <p className="text-sm text-gray-600">
                        <strong>Teléfono:</strong> {employee.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};