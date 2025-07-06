import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Check, ArrowLeftIcon, ArrowRightIcon, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

interface PurchaseOrder {
  id: string;
  supplier_id: string;
  employee_id: string;
  order_date: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'pending' | 'approved' | 'rejected';
  price_unit: number;
}

interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
}

interface PurchaseOrderPayment {
  id: string;
  order_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  employee_id: string;
}

interface Supplier {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  color: string;
}

interface PurchaseOrderReminder {
  id: string;
  order_id: string;
  product_id: string;
  quantity_pending: number;
  is_resolved: boolean;
  created_at: string;
}

export const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reminders, setReminders] = useState<PurchaseOrderReminder[]>([]);
  const [payments, setPayments] = useState<PurchaseOrderPayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  
  // Estados de paginación
  const [offset, setOffset] = useState(0);
  const [limitItems] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  // Estados del formulario
  const [formData, setFormData] = useState({
    supplier_id: '',
    total_amount: 0,
    paid_amount: 0,
    status: 'pending' as const,
    price_unit: 0,
    items: [] as { product_id: string; quantity: number; total_price: number }[]
  });

  // Estados del formulario de pago
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'efectivo'
  });

  useEffect(() => {
    const employeeData = localStorage.getItem('currentEmployee');
    if (employeeData) {
      setCurrentEmployee(JSON.parse(employeeData));
    }
    
    fetchData();
  }, [offset]);

  const fetchData = async () => {
    try {
      // Fetch orders with pagination
      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('order_date', { ascending: false })
        .range(offset, offset + limitItems - 1);

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
      setHasMore((ordersData || []).length === limitItems);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, color')
        .eq('active', true);

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('purchase_order_reminders')
        .select('*')
        .eq('is_resolved', false);

      if (remindersError) throw remindersError;
      setReminders(remindersData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('purchase_order_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEmployee) {
      toast.error('No se pudo identificar al empleado');
      return;
    }

    try {
      const orderId = crypto.randomUUID();
      const orderData = {
        id: orderId,
        supplier_id: formData.supplier_id,
        employee_id: currentEmployee.id,
        total_amount: formData.total_amount,
        paid_amount: formData.paid_amount,
        balance_due: formData.total_amount - formData.paid_amount,
        status: formData.status,
        price_unit: formData.price_unit,
        order_date: new Date().toISOString()
      };

      if (editingOrder) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('purchase_orders')
          .update(orderData)
          .eq('id', editingOrder.id);

        if (orderError) throw orderError;

        // Delete existing items
        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('order_id', editingOrder.id);

        // Delete existing reminders
        await supabase
          .from('purchase_order_reminders')
          .delete()
          .eq('order_id', editingOrder.id);

      } else {
        // Create new order
        const { error: orderError } = await supabase
          .from('purchase_orders')
          .insert([orderData]);

        if (orderError) throw orderError;
      }

      // Insert items
      const items = formData.items.map(item => ({
        id: crypto.randomUUID(),
        order_id: editingOrder?.id || orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        total_price: item.total_price
      }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(items);

        if (itemsError) throw itemsError;

        // Create reminders for administrators
        if (currentEmployee.position === 'administrador') {
          const reminderItems = formData.items.map(item => ({
            id: crypto.randomUUID(),
            order_id: editingOrder?.id || orderId,
            product_id: item.product_id,
            quantity_pending: item.quantity,
            is_resolved: false,
            created_at: new Date().toISOString()
          }));

          const { error: remindersError } = await supabase
            .from('purchase_order_reminders')
            .insert(reminderItems);

          if (remindersError) throw remindersError;
        }
      }

      toast.success(editingOrder ? 'Orden actualizada exitosamente' : 'Orden creada exitosamente');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Error al guardar la orden');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrderForPayment || !currentEmployee) {
      toast.error('Error en los datos del pago');
      return;
    }

    try {
      // Insert payment
      const { error: paymentError } = await supabase
        .from('purchase_order_payments')
        .insert([{
          id: crypto.randomUUID(),
          order_id: selectedOrderForPayment.id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          employee_id: currentEmployee.id,
          payment_date: new Date().toISOString()
        }]);

      if (paymentError) throw paymentError;

      // Update order paid amount and balance
      const newPaidAmount = selectedOrderForPayment.paid_amount + paymentData.amount;
      const newBalance = selectedOrderForPayment.total_amount - newPaidAmount;

      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          paid_amount: newPaidAmount,
          balance_due: newBalance
        })
        .eq('id', selectedOrderForPayment.id);

      if (updateError) throw updateError;

      toast.success('Pago registrado exitosamente');
      setShowPaymentForm(false);
      setSelectedOrderForPayment(null);
      setPaymentData({ amount: 0, payment_method: 'efectivo' });
      fetchData();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Error al registrar el pago');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      total_amount: 0,
      paid_amount: 0,
      status: 'pending',
      price_unit: 0,
      items: []
    });
    setShowForm(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormData({
      supplier_id: order.supplier_id,
      total_amount: order.total_amount,
      paid_amount: order.paid_amount,
      status: order.status,
      price_unit: order.price_unit,
      items: []
    });
    setShowForm(true);
  };

  const handleAddPayment = (order: PurchaseOrder) => {
    setSelectedOrderForPayment(order);
    setPaymentData({ amount: 0, payment_method: 'efectivo' });
    setShowPaymentForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta orden?')) return;

    try {
      // Delete payments first
      await supabase
        .from('purchase_order_payments')
        .delete()
        .eq('order_id', id);

      // Delete items
      await supabase
        .from('purchase_order_items')
        .delete()
        .eq('order_id', id);

      // Delete reminders
      await supabase
        .from('purchase_order_reminders')
        .delete()
        .eq('order_id', id);

      // Delete order
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Orden eliminada exitosamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Error al eliminar la orden');
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, total_price: 0 }]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const resolveReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_order_reminders')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('Recordatorio resuelto');
      fetchData();
    } catch (error) {
      console.error('Error resolving reminder:', error);
      toast.error('Error al resolver recordatorio');
    }
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? `${supplier.first_name} ${supplier.last_name}` : 'Proveedor no encontrado';
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} - ${product.color}` : 'Producto no encontrado';
  };

  const getOrderPayments = (orderId: string) => {
    return payments.filter(p => p.order_id === orderId);
  };

  const filteredOrders = orders.filter(order => {
    const supplierName = getSupplierName(order.supplier_id).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return supplierName.includes(searchLower) || 
           order.status.toLowerCase().includes(searchLower);
  });

  // Solo mostrar a administradores
  if (currentEmployee?.position !== 'administrador') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      
      {/* Recordatorios */}
      {reminders.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Recordatorios de Órdenes de Compra
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Tienes {reminders.length} productos pendientes de agregar códigos de barras:</p>
                <ul className="mt-2 space-y-1">
                  {reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-center justify-between">
                      <span>
                        {getProductName(reminder.product_id)} - {reminder.quantity_pending} unidades
                      </span>
                      <button
                        onClick={() => resolveReminder(reminder.id)}
                        className="ml-4 text-green-600 hover:text-green-800"
                        title="Marcar como resuelto"
                      >
                        <Check size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de pago */}
      {showPaymentForm && selectedOrderForPayment && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              Registrar Pago - {getSupplierName(selectedOrderForPayment.supplier_id)}
            </h2>
            <button
              onClick={() => {
                setShowPaymentForm(false);
                setSelectedOrderForPayment(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total de la orden:</span>
                <p className="font-medium">{selectedOrderForPayment.total_amount} Bs.</p>
              </div>
              <div>
                <span className="text-gray-600">Ya pagado:</span>
                <p className="font-medium">{selectedOrderForPayment.paid_amount} Bs.</p>
              </div>
              <div>
                <span className="text-gray-600">Saldo pendiente:</span>
                <p className="font-medium text-red-600">{selectedOrderForPayment.balance_due} Bs.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Monto del Pago
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedOrderForPayment.balance_due}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Método de Pago
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Registrar Pago
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editingOrder ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Proveedor
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.first_name} {supplier.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="pending">Pendiente</option>
                  <option value="approved">Aprobada</option>
                  <option value="rejected">Rechazada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Monto Total
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Monto Pagado Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Productos</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Agregar Producto
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Producto
                    </label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar producto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.color}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Precio Total
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.total_price}
                      onChange={(e) => updateItem(index, 'total_price', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingOrder ? 'Actualizar Orden' : 'Crear Orden'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nueva Orden de Compra
            </button>

            <div className="relative w-full md:w-96">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar por proveedor o estado..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Paginación */}
          <div className="flex justify-between items-center">
            <span>Mostrando {filteredOrders.length} órdenes</span>
            <div className="flex items-center gap-4">
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

          {/* Vista de tabla para escritorio */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(order.order_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getSupplierName(order.supplier_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.total_amount} Bs.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.paid_amount} Bs.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={order.balance_due > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {order.balance_due} Bs.
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'approved' ? 'Aprobada' : 
                         order.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {order.balance_due > 0 && (
                          <button
                            onClick={() => handleAddPayment(order)}
                            className="text-green-600 hover:text-green-800"
                            title="Agregar Pago"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(order)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No hay órdenes de compra registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium">
                    {format(new Date(order.order_date), 'dd/MM/yyyy')}
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'approved' 
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'approved' ? 'Aprobada' : 
                     order.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-600">Proveedor:</span> {getSupplierName(order.supplier_id)}
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span> {order.total_amount} Bs.
                  </div>
                  <div>
                    <span className="text-gray-600">Pagado:</span> {order.paid_amount} Bs.
                  </div>
                  <div>
                    <span className="text-gray-600">Saldo:</span> 
                    <span className={order.balance_due > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {order.balance_due} Bs.
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  {order.balance_due > 0 && (
                    <button
                      onClick={() => handleAddPayment(order)}
                      className="text-green-600 hover:text-green-800"
                      title="Agregar Pago"
                    >
                      <DollarSign size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(order)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Mostrar historial de pagos si existen */}
                {getOrderPayments(order.id).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Historial de Pagos:</h4>
                    <div className="space-y-1">
                      {getOrderPayments(order.id).map((payment) => (
                        <div key={payment.id} className="text-xs text-gray-600">
                          {format(new Date(payment.payment_date), 'dd/MM/yyyy')} - {payment.amount} Bs. ({payment.payment_method})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {filteredOrders.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No hay órdenes de compra registradas
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};