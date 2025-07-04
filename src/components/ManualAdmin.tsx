import { useState } from "react";
import {
  BookOpen,
  Shield,
  BarChart3,
  ShoppingCart,
  ArrowRightLeft,
  Users,
  Package,
  DollarSign,
  Zap,
  CheckCircle,
  X,
} from "lucide-react";

// Componente para el Manual de Administrador
export default function ManualAdmin() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const adminSections = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: BarChart3,
      description: "Centro de control con métricas en tiempo real",
      color: "from-blue-500 to-cyan-500",
      features: [
        "Análisis en tiempo real",
        "KPIs visuales",
        "Reportes automáticos",
      ],
    },
    {
      id: "sales",
      title: "Ventas",
      icon: ShoppingCart,
      description: "Gestión completa del proceso de ventas",
      color: "from-green-500 to-emerald-500",
      features: ["Códigos de barras", "Facturación", "Historial completo"],
    },
    {
      id: "inventory",
      title: "Inventario",
      icon: Package,
      description: "Control total de productos y stock",
      color: "from-purple-500 to-pink-500",
      features: [
        "Gestión de productos",
        "Stock por tienda",
        "Alertas automáticas",
      ],
    },
    {
      id: "transfers",
      title: "Transferencias",
      icon: ArrowRightLeft,
      description: "Movimientos entre tiendas simplificados",
      color: "from-orange-500 to-red-500",
      features: ["Entre tiendas", "Seguimiento", "Aprobaciones"],
    },
    {
      id: "team",
      title: "Equipo",
      icon: Users,
      description: "Administración de empleados y permisos",
      color: "from-indigo-500 to-purple-500",
      features: ["Roles y permisos", "Gestión de acceso", "Perfiles completos"],
    },
    {
      id: "finance",
      title: "Finanzas",
      icon: DollarSign,
      description: "Control financiero y tipo de cambio",
      color: "from-yellow-500 to-orange-500",
      features: [
        "Tipo de cambio",
        "Reportes financieros",
        "Análisis de ganancias",
      ],
    },
  ];

  return (
    <div className="relative z-10 p-8 ">
      {/* Hero Section */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 shadow-2xl">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          Manual de
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {" "}
            Administrador
          </span>
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Acceso a todas las funcionalidades del sistema y control total sobre
          tu negocio
        </p>
        <div className="mt-8 inline-flex items-center px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          <span className="font-medium">Acceso Completo al Sistema</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-4 max-w-7xl mx-auto p-4">
        {adminSections.map((section, index) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          // Asignamos diferentes tamaños basados en el índice o alguna propiedad
          const colSpan =
            index % 3 === 0
              ? "md:col-span-4 lg:col-span-12"
              : index % 2 === 0
              ? "md:col-span-3 lg:col-span-6"
              : "md:col-span-3 lg:col-span-6";

          const rowSpan = index % 4 === 0 ? "md:row-span-2" : "md:row-span-2";

          return (
            <div
              key={section.id}
              className={`${colSpan} ${rowSpan} relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 cursor-pointer ${
                isActive ? "ring-2 ring-purple-500" : ""
              }`}
              onClick={() => setActiveSection(isActive ? null : section.id)}
            >
              <div className="p-6 h-full flex flex-col">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${section.color} mb-4 shadow-lg transition-shadow duration-300`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {section.title}
                </h3>

                <p className="text-slate-300 mb-4 text-sm leading-relaxed flex-grow">
                  {section.description}
                </p>

                <div className="space-y-2">
                  {section.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-0 hover:opacity-10 transition-opacity duration-300`}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
