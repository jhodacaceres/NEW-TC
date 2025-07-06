import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ExchangeRate } from '../types';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

interface ExchangeRateComponentProps {
  onRateChange: (rate: number) => void;
}

export const ExchangeRateComponent: React.FC<ExchangeRateComponentProps> = ({ onRateChange }) => {
  const [rate, setRate] = useState<number>(0);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [offset, setOffset] = useState(0);
  const [limitItems] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  // Cargar los tipos de cambio al montar el componente
  useEffect(() => {
    fetchRates();
  }, [offset]);

  const fetchRates = async () => {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitItems - 1);

    if (error) {
      console.error('Error al cargar los tipos de cambio', error);
    } else {
      setRates(data || []);
      setHasMore((data || []).length === limitItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRate = {
      id: crypto.randomUUID(),
      rate,
      created_at: new Date().toISOString()
    };

    // Guardar el nuevo tipo de cambio en Supabase
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert([newRate]);

    if (error) {
      console.error('Error al guardar el tipo de cambio', error);
    } else {
      // Refrescar la lista
      setOffset(0); // Resetear a la primera página
      fetchRates();
      onRateChange(rate); // notificar al App.tsx
      setRate(0); // Limpiar el input
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulario para ingresar nuevo tipo de cambio */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Actualizar Tipo de Cambio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Valor del Dólar en Bolivianos
            </label>
            <input
              type="number"
              step="0.01"
              value={rate === 0 ? '' : rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="mt-1 block px-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Ingrese el tipo de cambio"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Actualizar Tipo de Cambio
          </button>
        </form>
      </div>

      {/* Historial con paginación */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Historial de Cambios</h2>
            <div>
              <span>Mostrando {rates.length} registros</span>
              <div className="flex items-center gap-4 justify-center mt-4">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(offset - limitItems)}
                  className={`p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors ${
                    offset === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <ArrowLeftIcon size={20} />
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => setOffset(offset + limitItems)}
                  className={`p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors ${
                    !hasMore
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <ArrowRightIcon size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Tabla en escritorio */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Cambio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rates.map((rate) => (
                  <tr key={rate.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {format(new Date(rate.created_at), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {format(new Date(rate.created_at), 'HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {rate?.rate?.toFixed(2)} BOB
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      No hay registros de cambios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tarjetas en móvil */}
          <div className="sm:hidden space-y-4">
            {rates.length === 0 ? (
              <div className="text-center text-gray-500">No hay registros de cambios</div>
            ) : (
              rates.map((rate) => (
                <div key={rate.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-800 font-medium">
                    Fecha: {format(new Date(rate.created_at), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">Hora: {format(new Date(rate.created_at), 'HH:mm')}</p>
                  <p className="text-sm text-gray-900 font-semibold">
                    Tipo de Cambio: {rate.rate.toFixed(2)} BOB
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};