import React, { useEffect } from "react";
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
  ChevronUp,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ManualAdmin from "./ManualAdmin";
import ManualSeller from "./ManualSeller";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  currentEmployee: any;
}

type role = "admin" | "ventas";

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  currentEmployee,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = React.useState<boolean>(false);
  // Definir elementos del menú basados en el rol del empleado
  const getMenuItems = () => {
    const baseItems = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["administrador", "ventas"],
      },
      {
        id: "sales",
        label: "Ventas",
        icon: ShoppingCart,
        roles: ["administrador", "ventas"],
        readonly: currentEmployee?.position === "ventas",
      },
      {
        id: "transfers",
        label: "Transferencias",
        icon: ArrowRightLeft,
        roles: ["administrador", "ventas"],
        readonly: currentEmployee?.position === "ventas",
      },
      {
        id: "products",
        label: "Productos",
        icon: Package,
        roles: ["administrador", "ventas"],
        readonly: currentEmployee?.position === "ventas",
      },
      {
        id: "movements",
        label: "Movimientos",
        icon: History,
        roles: ["administrador"],
      },
      { id: "stores", label: "Tiendas", icon: Store, roles: ["administrador"] },
      {
        id: "purchase-orders",
        label: "Órdenes de Compra",
        icon: ClipboardList,
        roles: ["administrador"],
      },
      {
        id: "employees",
        label: "Empleados",
        icon: Users,
        roles: ["administrador"],
      },
      {
        id: "suppliers",
        label: "Proveedores",
        icon: Truck,
        roles: ["administrador"],
      },
      {
        id: "exchange",
        label: "Tipo de Cambio",
        icon: DollarSign,
        roles: ["administrador"],
      },
      {
        id: "invoice-settings",
        label: "Config. Facturación",
        icon: Settings,
        roles: ["administrador"],
      },
    ];

    // Filtrar elementos basados en el rol del empleado
    return baseItems.filter((item) =>
      item.roles.includes(currentEmployee?.position || "ventas")
    );
  };

  const menuItems = getMenuItems();

  const handlePageChange = (pageId: string) => {
    onPageChange(pageId);
    setIsMobileMenuOpen(false);
    localStorage.setItem("currentPage", pageId);
  };

  const handleLogout = async () => {
    try {
      // Cerrar sesión en Supabase Auth si existe
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Warning: Could not sign out from auth:", error);
      }
    } catch (error) {
      console.warn("Warning: Error during auth sign out:", error);
    }

    // Limpiar localStorage y recargar
    localStorage.removeItem("currentEmployee");
    window.location.reload();
  };

  const handleManualDownload = (type: role) => {
    type === "admin" ? setIsAdmin(true) : setIsAdmin(false);
    setIsManualOpen(true);
  };

  useEffect(() => {
    const currentPage = localStorage.getItem("currentPage");
    if (currentPage) {
      onPageChange(currentPage);
      setIsManualOpen(false);
      setIsAdmin(!isAdmin);
    }
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 right-4 z-50 md:hidden bg-gray-800 text-white p-2 rounded-lg shadow-lg"
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
      <div
        className={`
        fixed left-0 top-0 h-screen shadow-lg z-40
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:w-64 w-64
        flex flex-col
      `}
        style={{ backgroundColor: "#252d42" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "#475569" }}>
          <h1 className="text-2xl font-bold text-white">Axcel</h1>
          {currentEmployee && (
            <div className="mt-1">
              <p className="text-sm text-gray-300">
                {currentEmployee.first_name} {currentEmployee.last_name || ""}
              </p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  currentEmployee.position === "administrador"
                    ? "bg-purple-600 text-purple-100"
                    : "bg-blue-600 text-blue-100"
                }`}
              >
                {currentEmployee.position === "administrador"
                  ? "Administrador"
                  : "Ventas"}
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
                  className={`w-full flex items-center space-x-3 px-6 py-3 text-left relative transition-colors
                    ${
                      currentPage === item.id
                        ? "bg-blue-600 text-white border-r-4 border-blue-400"
                        : "text-gray-300 hover:bg-gray-700"
                    }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {isReadonly && (
                    <span className="ml-auto text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded-full">
                      Solo lectura
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Configuración en la parte inferior */}
        <div className="border-t mt-auto" style={{ borderColor: "#475569" }}>
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full flex items-center justify-between px-6 py-3 text-gray-300 hover:bg-gray-700"
          >
            <div className="flex items-center space-x-3">
              <Settings size={20} />
              <span>Configuración</span>
            </div>
            {isConfigOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Menú desplegable de configuración */}
          {isConfigOpen && (
            <div style={{ backgroundColor: "#1e293b" }} className="border-t">
              {/* Manual de uso */}
              <button
                onClick={() =>
                  handleManualDownload(
                    currentEmployee?.position === "administrador"
                      ? "admin"
                      : "ventas"
                  )
                }
                className="w-full flex items-center space-x-3 px-8 py-3 text-gray-300 hover:bg-gray-600 text-sm"
              >
                <BookOpen size={16} />
                <span>
                  Manual de{" "}
                  {currentEmployee?.position === "administrador"
                    ? "Administrador"
                    : "Ventas"}
                </span>
              </button>

              {/* Cerrar sesión */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-8 py-3 text-red-400 hover:bg-red-900 text-sm"
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {isAdmin && isManualOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsAdmin(false)}
          ></div>
          <div className="fixed w-auto lg:w-1/2 max-h-[90%] bg-gray-800 overflow-y-auto p-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md shadow-lg z-50">
            <div className="flex justify-end">
              <X
                onClick={() => {
                  setIsManualOpen(false);
                }}
                className="text-white text-2xl cursor-pointer"
              />
            </div>
            <ManualAdmin />
          </div>
        </>
      )}

      {!isAdmin && isManualOpen && (
        <div className="fixed bottom-4 right-4 bg-white p-4 shadow-lg rounded-lg z-50">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsAdmin(false)}
          ></div>
          <div className="fixed w-auto lg:w-1/2 max-h-[90%] bg-gray-800 overflow-y-auto p-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md shadow-lg z-50">
            <div className="flex justify-end">
              <X
                onClick={() => setIsManualOpen(false)}
                className="text-white text-2xl cursor-pointer"
              />
            </div>
            <ManualSeller />
          </div>
        </div>
      )}
    </>
  );
};
