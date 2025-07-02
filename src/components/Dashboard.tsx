import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { DollarSign, Tag, ShoppingBag, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardProps {
  onSaleClick?: () => void;
  onTransferClick?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = () => {
  const [monthlySales, setMonthlySales] = useState<number[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<number[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; total: number }[]>([]);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalUnits, setTotalUnits] = useState<number>(0);
  const [monthLabels, setMonthLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;

        // 1. Obtener ventas del año actual
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('id, total_sale, sale_date, employee_id, quantity_products')
          .gte('sale_date', startOfYear)
          .lte('sale_date', endOfYear);

        if (salesError) throw salesError;

        // 2. Obtener productos vendidos del año
        const { data: saleProductsData, error: saleProductsError } = await supabase
          .from('sale_product')
          .select(`
            sale_id,
            product_id,
            products!product_id (name, profit_bob)
          `);

        if (saleProductsError) throw saleProductsError;

        // Crear mapas para acceso rápido
        const saleProductsMap = new Map();
        
        // Agrupar productos por sale_id
        saleProductsData?.forEach(item => {
          if (!saleProductsMap.has(item.sale_id)) {
            saleProductsMap.set(item.sale_id, []);
          }
          saleProductsMap.get(item.sale_id).push(item);
        });

        if (salesData) {
          // Procesar datos para agrupar por mes
          const monthlyTotals = Array(12).fill(0);
          const monthlyIncomes = Array(12).fill(0);
          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          
          let yearTotalSales = 0;
          let yearTotalIncome = 0;
          let yearTotalUnits = 0;
          const productCounts: Record<string, number> = {};

          salesData.forEach(sale => {
            const month = new Date(sale.sale_date).getMonth();
            const saleTotal = parseInt(sale.total_sale) || 0;
            
            // Sumar al total de ventas
            monthlyTotals[month] += saleTotal;
            yearTotalSales += saleTotal;

            // Calcular ingresos (ganancias) por cada producto vendido
            let saleIncome = 0;
            const products = saleProductsMap.get(sale.id) || [];
            
            products.forEach((item: any) => {
              const profit = item.products?.profit_bob || 0;
              
              // La ganancia es el profit_bob por cada producto vendido
              saleIncome += profit;
              
              // Contar unidades vendidas
              yearTotalUnits += 1;
              
              // Contar productos más vendidos
              const productName = item.products?.name || 'Producto desconocido';
              productCounts[productName] = (productCounts[productName] || 0) + 1;
            });
            
            monthlyIncomes[month] += saleIncome;
            yearTotalIncome += saleIncome;
          });

          setMonthlySales(monthlyTotals);
          setMonthlyIncome(monthlyIncomes);
          setMonthLabels(monthNames);
          setTotalSales(yearTotalSales);
          setTotalIncome(yearTotalIncome);
          setTotalUnits(yearTotalUnits);

          // Productos más vendidos
          const sortedProducts = Object.entries(productCounts)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

          setTopProducts(sortedProducts);
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(`Error al cargar los datos del dashboard: ${err.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const salesData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Ventas Mensuales (Bs)',
        data: monthlySales,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Ingresos Mensuales (Bs)',
        data: monthlyIncome,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const productData = {
    labels: topProducts.map((p) => p.name),
    datasets: [
      {
        label: 'Unidades Vendidas',
        data: topProducts.map((p) => p.total),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const stats = [
    {
      title: 'Ventas Totales',
      value: `${totalSales.toLocaleString()} Bs.`,
      icon: DollarSign,
      color: 'bg-blue-500',
      description: 'Total facturado en el año'
    },
    {
      title: 'Producto más vendido',
      value: topProducts[0]?.name || 'N/A',
      icon: Tag,
      color: 'bg-green-500',
      description: `${topProducts[0]?.total || 0} unidades`
    },
    {
      title: 'Productos Vendidos',
      value: totalUnits.toLocaleString(),
      icon: ShoppingBag,
      color: 'bg-purple-500',
      description: 'Unidades totales vendidas'
    },
    {
      title: 'Ingresos (Ganancias)',
      value: `${totalIncome.toLocaleString()} Bs.`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      description: 'Ganancia neta del año'
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Cargando datos del dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error en el Dashboard</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <p className="text-xs text-red-600 mt-2">
              Verifique que las tablas estén correctamente configuradas en la base de datos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicador de año actual */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Dashboard del año {new Date().getFullYear()}</strong> - Los datos se resetean automáticamente cada año
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-xl md:text-2xl font-bold mt-1 break-words">{stat.value}</p>
                  {stat.description && (
                    <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-full text-white flex-shrink-0 ml-4`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4">Ventas vs Ingresos Mensuales</h3>
          <div className="h-[300px] md:h-[400px]">
            <Line
              data={salesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return `${label}: ${value} Bs.`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `${value} Bs.`,
                    },
                  },
                },
              }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>Ventas: Total facturado</p>
            <p><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>Ingresos: Ganancias netas</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4">Productos Más Vendidos</h3>
          <div className="h-[300px] md:h-[400px]">
            <Bar
              data={productData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Resumen Financiero {new Date().getFullYear()}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {totalSales.toLocaleString()} Bs.
            </p>
            <p className="text-sm text-gray-600">Total Ventas</p>
            <p className="text-xs text-gray-500">Monto total facturado</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {totalIncome.toLocaleString()} Bs.
            </p>
            <p className="text-sm text-gray-600">Total Ingresos</p>
            <p className="text-xs text-gray-500">Ganancias netas obtenidas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {totalSales > 0 ? ((totalIncome / totalSales) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-gray-600">Margen de Ganancia</p>
            <p className="text-xs text-gray-500">Porcentaje de ganancia sobre ventas</p>
          </div>
        </div>
      </div>

      {/* Mensaje informativo si no hay datos */}
      {totalSales === 0 && totalIncome === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>No hay datos de ventas para mostrar</strong> - Registre algunas ventas para ver las estadísticas del dashboard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};