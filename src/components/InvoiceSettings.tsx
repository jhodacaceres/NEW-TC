import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Save, Settings } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface InvoiceSettings {
  id: string;
  company_name: string;
  nit: string;
  address: string;
  phone: string;
  additional_info: string;
  created_at: string;
  updated_at: string;
}

export const InvoiceSettings: React.FC = () => {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Partial<InvoiceSettings>>();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setValue('company_name', data.company_name);
        setValue('nit', data.nit);
        setValue('address', data.address);
        setValue('phone', data.phone);
        setValue('additional_info', data.additional_info);
      } else {
        // Set default values if no settings exist
        setValue('company_name', 'AXCEL');
        setValue('nit', '7255039');
        setValue('address', '');
        setValue('phone', '');
        setValue('additional_info', 'Cellulares homologados');
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<InvoiceSettings>) => {
    setSaving(true);
    try {
      const settingsData = {
        company_name: formData.company_name || 'AXCEL',
        nit: formData.nit || '7255039',
        address: formData.address || '',
        phone: formData.phone || '',
        additional_info: formData.additional_info || 'Cellulares homologados',
        updated_at: new Date().toISOString(),
      };

      if (settings) {
        // Update existing settings
        const { error } = await supabase
          .from('invoice_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('invoice_settings')
          .insert([{
            id: crypto.randomUUID(),
            ...settingsData,
            created_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      toast.success('Configuración guardada exitosamente');
      fetchSettings(); // Refresh data
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Settings className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold">Configuración de Facturación</h2>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Información Importante</h3>
          <p className="text-sm text-blue-700">
            Esta configuración se aplicará a todas las facturas y garantías generadas en el sistema.
            Los cambios afectarán únicamente a los documentos generados después de guardar.
          </p>
        </div>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                {...register('company_name', { 
                  required: 'El nombre de la empresa es requerido',
                  maxLength: { value: 30, message: 'Máximo 30 caracteres' }
                })}
                className="mt-1 block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="AXCEL"
              />
              {errors.company_name && (
                <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                NIT *
              </label>
              <input
                type="text"
                {...register('nit', { 
                  required: 'El NIT es requerido',
                  maxLength: { value: 15, message: 'Máximo 15 caracteres' }
                })}
                className="mt-1 block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="7255039"
              />
              {errors.nit && (
                <p className="mt-1 text-sm text-red-600">{errors.nit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dirección
              </label>
              <input
                type="text"
                {...register('address', {
                  maxLength: { value: 60, message: 'Máximo 60 caracteres' }
                })}
                className="mt-1 block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Dirección de la empresa"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                {...register('phone', {
                  maxLength: { value: 15, message: 'Máximo 15 caracteres' }
                })}
                className="mt-1 block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Número de teléfono"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Información Adicional
            </label>
            <textarea
              {...register('additional_info', {
                maxLength: { value: 100, message: 'Máximo 100 caracteres' }
              })}
              rows={3}
              className="mt-1 block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Información adicional que aparecerá en facturas y garantías"
            />
            {errors.additional_info && (
              <p className="mt-1 text-sm text-red-600">{errors.additional_info.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Vista Previa del Formato</h3>
          <div className="bg-white p-4 rounded border font-mono text-xs">
            <div className="text-center">
              <div>████████████████████████████████</div>
              <div>█ AXCEL - Cellulares homologados █</div>
              <div>████████████████████████████████</div>
              <div>NIT: 7255039</div>
              <div>TEL: [Teléfono configurado]</div>
              <div>--------------------------------</div>
              <div>         FACTURA/GARANTÍA       </div>
              <div>--------------------------------</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};