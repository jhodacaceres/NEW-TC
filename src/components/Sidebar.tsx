import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  DollarSign,
  Truck,
  Menu,
  X,
  ShoppingCart,
  ArrowRightLeft,
  History,
  Store,
  ClipboardList,
  Settings,
  LogOut,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  currentEmployee: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, currentEmployee }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);

  // Definir elementos del menú basados en el rol del empleado
  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'ventas'] },
      { id: 'sales', label: 'Ventas', icon: ShoppingCart, roles: ['administrador', 'ventas'], readonly: currentEmployee?.position === 'ventas' },
      { id: 'transfers', label: 'Transferencias', icon: ArrowRightLeft, roles: ['administrador', 'ventas'], readonly: currentEmployee?.position === 'ventas' },
      { id: 'products', label: 'Productos', icon: Package, roles: ['administrador', 'ventas'], readonly: currentEmployee?.position === 'ventas' },
      { id: 'movements', label: 'Movimientos', icon: History, roles: ['administrador'] },
      { id: 'stores', label: 'Tiendas', icon: Store, roles: ['administrador'] },
      { id: 'purchase-orders', label: 'Órdenes de Compra', icon: ClipboardList, roles: ['administrador'] },
      { id: 'employees', label: 'Empleados', icon: Users, roles: ['administrador'] },
      { id: 'suppliers', label: 'Proveedores', icon: Truck, roles: ['administrador'] },
      { id: 'exchange', label: 'Tipo de Cambio', icon: DollarSign, roles: ['administrador'] },
    ];

    // Filtrar elementos basados en el rol del empleado
    return baseItems.filter(item => 
      item.roles.includes(currentEmployee?.position || 'ventas')
    );
  };

  const menuItems = getMenuItems();

  const handlePageChange = (pageId: string) => {
    onPageChange(pageId);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      // Cerrar sesión en Supabase Auth si existe
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Warning: Could not sign out from auth:', error);
      }
    } catch (error) {
      console.warn('Warning: Error during auth sign out:', error);
    }
    
    // Limpiar localStorage y recargar
    localStorage.removeItem('currentEmployee');
    window.location.reload();
  };

  const handleManualDownload = (type: 'admin' | 'ventas') => {
    // Crear contenido del manual según el tipo de empleado
    const manualContent = type === 'admin' ? getAdminManual() : getSalesManual();
    
    // Crear y descargar el archivo
    const blob = new Blob([manualContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manual_${type === 'admin' ? 'Administrador' : 'Ventas'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAdminManual = () => {
    return `
MANUAL DE USUARIO - ADMINISTRADOR
Sistema de Gestión Empresarial Axcel
=====================================

ÍNDICE
------
1. Introducción
2. Dashboard
3. Gestión de Ventas
4. Transferencias
5. Movimientos
6. Gestión de Tiendas
7. Órdenes de Compra
8. Gestión de Empleados
9. Gestión de Productos
10. Gestión de Proveedores
11. Tipo de Cambio
12. Configuración

1. INTRODUCCIÓN
---------------
Como administrador, tienes acceso completo a todas las funcionalidades del sistema.
Puedes gestionar empleados, productos, tiendas, ventas y configuraciones generales.

2. DASHBOARD
------------
- Visualiza métricas clave del negocio
- Gráficos de ventas mensuales vs ingresos
- Productos más vendidos
- Resumen financiero anual
- Indicadores de rendimiento

3. GESTIÓN DE VENTAS
--------------------
- Registrar nuevas ventas por código de barras
- Ver historial completo de ventas
- Imprimir facturas
- Editar ventas registradas
- Filtrar por fechas y empleados

4. TRANSFERENCIAS
-----------------
- Crear transferencias entre tiendas
- Seleccionar productos y cantidades
- Asignar empleado responsable
- Ver historial de transferencias
- Seguimiento de movimientos

5. MOVIMIENTOS
--------------
- Visualizar todos los movimientos del sistema
- Filtrar por tipo: ventas, transferencias, órdenes
- Filtrar por tienda y fecha
- Detalles expandidos de cada movimiento

6. GESTIÓN DE TIENDAS
---------------------
- Crear nuevas tiendas
- Editar información de tiendas existentes
- Asignar productos a tiendas
- Gestionar códigos de barras por tienda
- Ver inventario por tienda

7. ÓRDENES DE COMPRA
--------------------
- Crear órdenes de compra a proveedores
- Gestionar estados: pendiente, aprobada, rechazada
- Registrar pagos parciales o totales
- Seguimiento de balances pendientes

8. GESTIÓN DE EMPLEADOS
-----------------------
- Crear nuevos empleados
- Asignar roles: administrador o ventas
- Gestionar credenciales de acceso
- Editar información personal
- Activar/desactivar empleados

9. GESTIÓN DE PRODUCTOS
-----------------------
- Registrar nuevos productos
- Subir imágenes de productos
- Configurar precios en USD y ganancias en BOB
- Gestionar especificaciones técnicas
- Activar/desactivar productos

10. GESTIÓN DE PROVEEDORES
--------------------------
- Registrar nuevos proveedores
- Editar información de contacto
- Buscar proveedores
- Gestionar relaciones comerciales

11. TIPO DE CAMBIO
------------------
- Actualizar tipo de cambio USD a BOB
- Ver historial de cambios
- Impacto automático en precios de productos

12. CONFIGURACIÓN
-----------------
- Cerrar sesión
- Descargar manuales de usuario
- Configuraciones del sistema

SOPORTE TÉCNICO
---------------
Para soporte técnico, contacte al administrador del sistema.
`;
  };

  const getSalesManual = () => {
    return `
MANUAL DE USUARIO - VENTAS
Sistema de Gestión Empresarial Axcel
====================================

ÍNDICE
------
1. Introducción
2. Dashboard
3. Proceso de Ventas
4. Historial de Ventas
5. Configuración
6. Preguntas Frecuentes

1. INTRODUCCIÓN
---------------
Como empleado de ventas, tu función principal es registrar ventas utilizando
el sistema de códigos de barras. Este manual te guiará paso a paso.

2. DASHBOARD
------------
- Ve las métricas generales del negocio
- Observa el rendimiento de ventas
- Productos más vendidos
- Información financiera básica

3. PROCESO DE VENTAS
--------------------

3.1 INICIAR UNA VENTA
- Ve a la sección "Ventas"
- Verifica que aparezca tu nombre como vendedor
- Confirma la tienda donde estás trabajando

3.2 ESCANEAR PRODUCTOS
- Usa el campo de búsqueda para escanear códigos de barras
- También puedes escanear códigos MEI
- Cada código escaneado representa UN producto
- Los productos aparecerán automáticamente en la lista

3.3 INFORMACIÓN DEL CLIENTE (OPCIONAL)
- Puedes agregar el nombre del cliente
- Puedes agregar el teléfono del cliente
- Esta información es opcional pero recomendada

3.4 REVISAR LA VENTA
- Verifica que todos los productos estén correctos
- Revisa el total de la venta
- Los precios se muestran en bolivianos (Bs.)
- Puedes eliminar productos si es necesario

3.5 COMPLETAR LA VENTA
- Haz clic en "Registrar Venta"
- La venta se guardará automáticamente
- Los códigos de barras usados se marcarán como vendidos

4. HISTORIAL DE VENTAS
----------------------
- Ve todas las ventas registradas
- Puedes imprimir facturas haciendo clic en el ícono de impresora
- Puedes editar ventas si es necesario
- Filtra por fechas para encontrar ventas específicas

5. CONFIGURACIÓN
----------------
- Cerrar sesión al finalizar tu turno
- Descargar este manual cuando lo necesites

6. PREGUNTAS FRECUENTES
-----------------------

P: ¿Qué hago si un código de barras no funciona?
R: Verifica que el código esté limpio y legible. Si persiste el problema,
   contacta al administrador.

P: ¿Puedo cancelar una venta después de registrarla?
R: Sí, puedes editar ventas desde el historial. Contacta al administrador
   si necesitas ayuda.

P: ¿Qué hago si se va la luz durante una venta?
R: El sistema guarda automáticamente. Al regresar la luz, puedes continuar
   donde te quedaste.

P: ¿Cómo sé si un producto está disponible?
R: Solo aparecerán en la búsqueda los productos disponibles en tu tienda.

P: ¿Puedo hacer descuentos?
R: Los precios están predefinidos. Para descuentos especiales, contacta
   al administrador.

CONSEJOS IMPORTANTES
--------------------
- Siempre verifica el total antes de completar la venta
- Asegúrate de escanear todos los productos del cliente
- Mantén el escáner limpio para mejor funcionamiento
- Cierra sesión al terminar tu turno

SOPORTE
-------
Para cualquier problema o duda, contacta al administrador del sistema.
`;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 right-4 z-50 md:hidden bg-white p-2 rounded-lg shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-white shadow-lg z-40
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:w-64 w-64
      `}>
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Axcel</h1>
          {currentEmployee && (
            <div className="mt-1">
              <p className="text-sm text-gray-600">
                {currentEmployee.first_name} {currentEmployee.last_name || ''}
              </p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                currentEmployee.position === 'administrador' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {currentEmployee.position === 'administrador' ? 'Administrador' : 'Ventas'}
              </span>
            </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto">
          <div className="mt-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isReadonly = item.readonly;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-6 py-3 text-left relative
                    ${currentPage === item.id 
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {isReadonly && (
                    <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Solo lectura
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Configuración en la parte inferior */}
        <div className="border-t border-gray-200">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full flex items-center justify-between px-6 py-3 text-gray-600 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <Settings size={20} />
              <span>Configuración</span>
            </div>
            {isConfigOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Menú desplegable de configuración */}
          {isConfigOpen && (
            <div className="bg-gray-50 border-t border-gray-200">
              {/* Manual de uso */}
              <button
                onClick={() => handleManualDownload(currentEmployee?.position === 'administrador' ? 'admin' : 'ventas')}
                className="w-full flex items-center space-x-3 px-8 py-3 text-gray-600 hover:bg-gray-100 text-sm"
              >
                <BookOpen size={16} />
                <span>
                  Manual de {currentEmployee?.position === 'administrador' ? 'Administrador' : 'Ventas'}
                </span>
              </button>

              {/* Cerrar sesión */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-8 py-3 text-red-600 hover:bg-red-50 text-sm"
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};