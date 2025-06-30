import React, { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  History,
  Search,
} from "lucide-react"; // Importa Search
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import {
  PurchaseOrder,
  PurchaseOrderItem,
  Product,
  Supplier,
  PurchaseOrderPayment,
} from "../types";
import AlertDelete from "./ModalDelete"; // Asegúrate de que el path sea correcto

// --- Interfaz para el formulario de la orden de compra ---
interface PurchaseOrderFormData {
  supplier_id: string;
  status: "pendiente" | "completada" | "parcialmente pagada";
  items: {
    product_id: string;
    quantity: number;
    price_unit: number;
  }[];
}

// --- Interfaz para el formulario de pago (usado para registrar y editar) ---
interface PaymentFormData {
  amount: number;
  payment_method: string;
}

export const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState<string>(""); // NUEVO: Estado para el término de búsqueda
  const [orderItems, setOrderItems] = useState<
    {
      product_id: string;
      quantity: number;
      price_unit: number;
    }[]
  >([]);

  // Estados para el formulario de orden de compra
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PurchaseOrderFormData>({
    defaultValues: {
      supplier_id: "",
      status: "pendiente",
      items: [],
    },
  });

  // Estados para el modal de registro de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] =
    useState<PurchaseOrder | null>(null);

  // Estados para el modal de edición de pago
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<PurchaseOrderPayment | null>(null);
  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
    setValue: setPaymentValue,
    formState: { errors: paymentFormErrors }, // Para ver errores de validación de pago
  } = useForm<PaymentFormData>();

  // Estados para el historial de pagos
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedOrderForPaymentHistory, setSelectedOrderForPaymentHistory] =
    useState<PurchaseOrder | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PurchaseOrderPayment[]>(
    []
  );

  // Estados para el modal de eliminación de ORDENES
  const [isDeleteOrderModalOpen, setIsDeleteOrderModalOpen] = useState(false);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);

  // --- NUEVOS ESTADOS para el modal de eliminación de PAGOS ---
  const [isDeletePaymentModalOpen, setIsDeletePaymentModalOpen] =
    useState(false);
  const [paymentToDelete, setPaymentToDelete] =
    useState<PurchaseOrderPayment | null>(null);

  //Para poder cambiar el valor del input de total a pagar
  const [manualTotal, setManualTotal] = useState<string | null>(null);
  const handleAddItem = (newItem: {
    product_id: string;
    quantity: number;
    price_unit: number;
  }) => {
    const existingIndex = orderItems.findIndex(
      (item) => item.product_id === newItem.product_id
    );

    if (existingIndex >= 0) {
      // Actualizar cantidad si el producto ya existe
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].quantity += newItem.quantity;
      setOrderItems(updatedItems);
    } else {
      // Agregar nuevo producto
      setOrderItems([...orderItems, newItem]);
    }
  };
  // --- EFECTO PARA SINCRONIZAR EL MODAL DE HISTORIAL CON LA LISTA PRINCIPAL DE ÓRDENES ---
  useEffect(() => {
    if (showPaymentHistoryModal && selectedOrderForPaymentHistory) {
      const freshOrderData = orders.find(
        (o) => o.id === selectedOrderForPaymentHistory.id
      );

      if (freshOrderData) {
        // Verificar si hay cambios relevantes
        const hasChanges =
          freshOrderData.paid_amount !==
            selectedOrderForPaymentHistory.paid_amount ||
          freshOrderData.status !== selectedOrderForPaymentHistory.status ||
          freshOrderData.balance_due !==
            selectedOrderForPaymentHistory.balance_due;

        if (hasChanges) {
          setSelectedOrderForPaymentHistory(freshOrderData);

          // Opcional: recargar el historial de pagos si es necesario
          const loadPaymentHistory = async () => {
            const { data, error } = await supabase
              .from("purchase_order_payments")
              .select("*, employee:employees(first_name, last_name)")
              .eq("order_id", freshOrderData.id)
              .order("payment_date", { ascending: true });

            if (!error && data) {
              const formattedPayments: PurchaseOrderPayment[] = data.map(
                (payment: any) => ({
                  ...payment,
                  employee_name: payment.employee
                    ? `${payment.employee.first_name} ${payment.employee.last_name}`
                    : "N/A",
                })
              );
              setPaymentHistory(formattedPayments);
            }
          };

          loadPaymentHistory();
        }
      }
    }
  }, [orders, showPaymentHistoryModal, selectedOrderForPaymentHistory]);
  // --- Efecto para cargar datos iniciales y el ID del usuario ---
  useEffect(() => {
    const fetchUserAndData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentEmployeeId(user.id);
      } else {
        console.warn(
          "No hay usuario autenticado. Algunas funcionalidades podrían no estar disponibles."
        );
      }
      fetchDataAndSetOrders();
    };
    fetchUserAndData();
  }, []);

  // Sincronizar selectedOrderForPayment con orders
  useEffect(() => {
    if (selectedOrderForPayment) {
      const updatedOrder = orders.find(
        (o) => o.id === selectedOrderForPayment.id
      );
      if (updatedOrder) {
        setSelectedOrderForPayment(updatedOrder);
      }
    }
  }, [orders]);

  // --- Función auxiliar para recargar órdenes, productos y proveedores ---
  const fetchDataAndSetOrders = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name");
    if (productsError)
      console.error("Error al obtener productos:", productsError.message);
    if (productsData) setProducts(productsData);

    const { data: suppliersData, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, first_name, last_name");
    if (suppliersError)
      console.error("Error al obtener proveedores:", suppliersError.message);
    if (suppliersData) setSuppliers(suppliersData);

    const { data: ordersData, error: ordersError } = await supabase.from(
      "purchase_orders"
    ).select(`
          *,
          supplier:suppliers(first_name, last_name),
          purchase_order_items:purchase_order_items_order_id_fkey (
            *,
            product:products ( name )
          )
        `);

    if (ordersError) {
      console.error("Error al obtener órdenes:", ordersError.message);
    } else {
      const formattedOrders: PurchaseOrder[] = ordersData.map((order: any) => ({
        ...order,
        amount_paid: order.paid_amount ?? 0,
        balance_due: (order.total_amount ?? 0) - (order.paid_amount ?? 0),
        supplier_name: `${order.supplier?.first_name || ""} ${
          order.supplier?.last_name || ""
        }`.trim(),
        items: order.purchase_order_items.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product?.name || "Desconocido",
          quantity: item.quantity,
          total_price: item.total_price,
        })),
        // Mapear estados antiguos a los nuevos en español si es necesario
        status:
          order.status === "completed"
            ? "completada"
            : order.status === "partially paid"
            ? "parcialmente pagada"
            : order.status === "pending"
            ? "pendiente"
            : order.status, // por si acaso hay otros valores
      }));
      setOrders(formattedOrders);
    }
  };

  const updateOrderPaymentStatus = async (orderId: string) => {
    try {
      // 1. Obtener todos los pagos de la orden
      const { data: payments, error: paymentsError } = await supabase
        .from("purchase_order_payments")
        .select("amount")
        .eq("order_id", orderId);

      if (paymentsError) throw paymentsError;

      // 2. Calcular el nuevo monto pagado
      const newPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

      // 3. Obtener el total de la orden
      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .select("total_amount")
        .eq("id", orderId)
        .single();

      if (orderError || !order)
        throw orderError || new Error("Orden no encontrada");

      // 4. Calcular el nuevo saldo pendiente
      const newBalanceDue = order.total_amount - newPaidAmount;

      // 5. Determinar el nuevo estado
      let newStatus: "pendiente" | "completada" | "parcialmente pagada";
      if (newPaidAmount >= order.total_amount - 0.01) {
        newStatus = "completada";
      } else if (newPaidAmount > 0) {
        newStatus = "parcialmente pagada";
      } else {
        newStatus = "pendiente";
      }

      // 6. Actualizar la orden en la base de datos
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({
          paid_amount: newPaidAmount,
          balance_due: newBalanceDue,
          status: newStatus,
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // 7. Actualizar el estado local de manera optimista
      setOrders((prevOrders: PurchaseOrder[]) =>
        prevOrders.map((o: PurchaseOrder) =>
          o.id === orderId
            ? {
                ...o,
                paid_amount: newPaidAmount,
                balance_due: newBalanceDue,
                status: newStatus,
              }
            : o
        )
      );

      return true;
    } catch (error: any) {
      console.error("Error al actualizar el estado de pago:", error.message);
      // Revertir cambios locales si falla
      fetchDataAndSetOrders(); // Recargar datos desde la base de datos
      return false;
    }
  };

  const handleSaveOrder = async (data: PurchaseOrderFormData) => {
    try {
      if (orderItems.length === 0) {
        alert("Debe agregar al menos un producto a la orden");
        return;
      }

      // Calcular el total sumando todos los items
      const totalAmount = orderItems.reduce(
        (sum, item) => sum + item.quantity * item.price_unit,
        0
      );

      if (editingOrder) {
        // Actualizar orden existente
        const { error: orderError } = await supabase
          .from("purchase_orders")
          .update({
            supplier_id: data.supplier_id,
            total_amount: totalAmount,
            status: data.status,
          })
          .eq("id", editingOrder.id);

        if (orderError) throw orderError;

        // Eliminar items antiguos
        const { error: deleteError } = await supabase
          .from("purchase_order_items")
          .delete()
          .eq("order_id", editingOrder.id);

        if (deleteError) throw deleteError;

        // Insertar nuevos items
        const newItems = orderItems.map((item) => ({
          order_id: editingOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          total_price: item.quantity * item.price_unit,
        }));

        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .insert(newItems);

        if (itemsError) throw itemsError;

        alert("Orden actualizada exitosamente.");
      } else {
        // Crear nueva orden
        const { data: insertedOrder, error: orderError } = await supabase
          .from("purchase_orders")
          .insert([
            {
              supplier_id: data.supplier_id,
              order_date: new Date().toISOString(),
              total_amount: totalAmount,
              status: data.status,
              paid_amount: 0,
              employee_id: currentEmployeeId,
            },
          ])
          .select()
          .single();

        if (orderError || !insertedOrder) {
          throw orderError || new Error("Error al crear la orden");
        }

        // Insertar items
        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .insert(
            orderItems.map((item) => ({
              order_id: insertedOrder.id,
              product_id: item.product_id,
              quantity: item.quantity,
              total_price: item.quantity * item.price_unit,
            }))
          );

        if (itemsError) throw itemsError;

        alert("Orden creada exitosamente.");
      }

      // Recargar datos y resetear formulario
      await fetchDataAndSetOrders();
      setShowOrderForm(false);
      setEditingOrder(null);
      setOrderItems([]);
      reset();
    } catch (error: any) {
      console.error("Error al guardar la orden:", error);
      alert(`Error al guardar la orden: ${error.message}`);
    }
  };

  const handleEdit = async (order: PurchaseOrder) => {
    setEditingOrder(order);
    setShowOrderForm(true);

    // Cargar items de la orden
    const { data: orderItems, error } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("order_id", order.id);

    if (error) {
      console.error("Error fetching order items for edit:", error.message);
      alert("Error al cargar ítems para edición: " + error.message);
      return;
    }

    // Resetear el formulario con los valores de la orden
    reset({
      supplier_id: order.supplier_id,
      status: order.status,
    });

    // Configurar items
    if (orderItems && orderItems.length > 0) {
      const formattedItems = orderItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price_unit: item.total_price / (item.quantity || 1),
      }));
      setOrderItems(formattedItems);
    } else {
      setOrderItems([]);
    }
  };

  // --- Funciones para el modal de eliminación de ORDENES ---
  const confirmDeleteOrder = (id: string) => {
    setOrderToDeleteId(id);
    setIsDeleteOrderModalOpen(true);
  };

  const cancelDeleteOrder = () => {
    setIsDeleteOrderModalOpen(false);
    setOrderToDeleteId(null);
  };

  const executeDeleteOrder = async () => {
    if (!orderToDeleteId) return;

    try {
      // Intenta eliminar de supplier_payments (si aún existe y es relevante)
      const { error: deleteSupplierPaymentsError } = await supabase
        .from("supplier_payments")
        .delete()
        .eq("order_id", orderToDeleteId);
      if (deleteSupplierPaymentsError) {
        console.warn(
          "Advertencia: Error al eliminar pagos de proveedor (puede ser una tabla antigua o sin FK):",
          deleteSupplierPaymentsError.message
        );
      }

      // Eliminar pagos asociados a la orden
      const { error: deletePurchaseOrderPaymentsError } = await supabase
        .from("purchase_order_payments")
        .delete()
        .eq("order_id", orderToDeleteId);
      if (deletePurchaseOrderPaymentsError) {
        console.error(
          "Error al eliminar pagos de la orden (purchase_order_payments):",
          deletePurchaseOrderPaymentsError.message
        );
        throw new Error("Error al eliminar los pagos asociados a la orden.");
      }

      // Eliminar ítems de la orden
      const { error: deleteItemsError } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("order_id", orderToDeleteId);
      if (deleteItemsError) {
        console.error(
          "Error al eliminar ítems de la orden:",
          deleteItemsError.message
        );
        throw new Error("Error al eliminar los ítems de la orden.");
      }

      // Finalmente, eliminar la orden
      const { error: deleteOrderError } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", orderToDeleteId);
      if (deleteOrderError) {
        console.error("Error al eliminar la orden:", deleteOrderError.message);
        throw new Error("Error al eliminar la orden de compra.");
      }

      setOrders(orders.filter((order) => order.id !== orderToDeleteId));
      alert("Orden de compra eliminada exitosamente.");
    } catch (error: any) {
      console.error(
        "Error en la eliminación completa de la orden:",
        error.message
      );
      alert("Error al eliminar la orden de compra: " + error.message);
    } finally {
      setIsDeleteOrderModalOpen(false);
      setOrderToDeleteId(null);
    }
  };

  // --- Funcionalidad de Pagos por Cuotas ---
  const openPaymentModal = (order: PurchaseOrder) => {
    setSelectedOrderForPayment(order);
    setShowPaymentModal(true);
    resetPayment();

    const remaining = order.total_amount - order.paid_amount;
    setPaymentValue(
      "amount",
      remaining > 0 ? parseFloat(remaining.toFixed(2)) : 0
    );
    setPaymentValue("payment_method", "Efectivo");
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedOrderForPayment(null);
    resetPayment();
  };

  const handleRegisterPayment = async (data: PaymentFormData) => {
    if (!selectedOrderForPayment) return;

    try {
      // Validaciones
      const paymentAmount = Number(data.amount);
      const remainingToPay =
        selectedOrderForPayment.total_amount -
        selectedOrderForPayment.paid_amount;

      if (paymentAmount <= 0) {
        alert("El monto del pago debe ser mayor que cero.");
        return;
      }
      if (paymentAmount > remainingToPay + 0.001) {
        alert(
          `No puedes pagar más de lo adeudado (Bs. ${remainingToPay.toFixed(
            2
          )}).`
        );
        return;
      }

      // Registrar pago
      const { error: paymentInsertError } = await supabase
        .from("purchase_order_payments")
        .insert({
          order_id: selectedOrderForPayment.id,
          amount: paymentAmount,
          payment_date: new Date().toISOString(),
          payment_method: data.payment_method || "Otro",
          employee_id: currentEmployeeId,
        });

      if (paymentInsertError) throw paymentInsertError;

      // Actualizar estado de la orden
      const success = await updateOrderPaymentStatus(
        selectedOrderForPayment.id
      );

      if (!success) {
        throw new Error("Falló la actualización del estado de la orden");
      }

      // Éxito - cerrar modal y mostrar feedback
      alert("Pago registrado exitosamente.");
      closePaymentModal();

      // Forzar recarga de datos para asegurar consistencia
      await fetchDataAndSetOrders();
    } catch (error: any) {
      console.error("Error en el proceso de pago:", error.message);
      alert(`Error: ${error.message}`);
    }
  };

  // --- Funciones para el Historial de Pagos ---
  const openPaymentHistoryModal = async (order: PurchaseOrder) => {
    setSelectedOrderForPaymentHistory(order);
    const { data, error } = await supabase
      .from("purchase_order_payments")
      .select("*, employee:employees(first_name, last_name)")
      .eq("order_id", order.id)
      .order("payment_date", { ascending: true });

    if (error) {
      console.error("Error al obtener historial de pagos:", error.message);
      setPaymentHistory([]);
      alert("Error al obtener el historial de pagos: " + error.message);
    } else {
      const formattedPayments: PurchaseOrderPayment[] = data.map(
        (payment: any) => ({
          ...payment,
          employee_name: payment.employee
            ? `${payment.employee.first_name} ${payment.employee.last_name}`
            : "N/A",
        })
      );
      setPaymentHistory(formattedPayments);
      setShowPaymentHistoryModal(true);
    }
  };

  const closePaymentHistoryModal = () => {
    setShowPaymentHistoryModal(false);
    setSelectedOrderForPaymentHistory(null);
    setPaymentHistory([]);
    resetPayment(); // Limpiar el formulario de pago al cerrar el historial
  };

  // --- Funciones para Editar un Pago ---
  const handleEditPayment = (payment: PurchaseOrderPayment) => {
    setEditingPayment(payment);
    setPaymentValue("amount", payment.amount);
    setPaymentValue("payment_method", payment.payment_method);
    setShowEditPaymentModal(true);
  };

  const closeEditPaymentModal = () => {
    setShowEditPaymentModal(false);
    setEditingPayment(null);
    resetPayment();
  };

  const ProductItemForm = ({
    onAddItem,
    products,
  }: {
    onAddItem: (item: {
      product_id: string;
      quantity: number;
      price_unit: number;
    }) => void;
    products: Product[];
  }) => {
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [priceUnit, setPriceUnit] = useState(0);

    const handleAdd = (e: React.MouseEvent) => {
      e.preventDefault();

      if (!productId) {
        alert("Por favor seleccione un producto");
        return;
      }

      if (quantity <= 0) {
        alert("La cantidad debe ser mayor que cero");
        return;
      }

      if (priceUnit <= 0) {
        alert("El precio unitario debe ser mayor que cero");
        return;
      }

      onAddItem({
        product_id: productId,
        quantity,
        price_unit: priceUnit,
      });

      // Reset form
      setProductId("");
      setQuantity(1);
      setPriceUnit(0);
    };

    return (
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-medium mb-2">Agregar Producto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              Producto
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2"
            >
              <option value="">Seleccionar producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
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
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Precio Unitario
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceUnit}
              onChange={(e) => setPriceUnit(Number(e.target.value))}
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleUpdatePayment = async (data: PaymentFormData) => {
    if (!editingPayment || !selectedOrderForPaymentHistory) return;

    const newAmount = Number(data.amount);
    const originalAmount = editingPayment.amount;
    const orderId = editingPayment.order_id;

    // Verificar si el nuevo monto es válido respecto al total de la orden
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder) {
      alert("No se pudo encontrar la orden asociada al pago.");
      return;
    }

    const currentPaidAmountExcludingThisPayment =
      currentOrder.paid_amount - originalAmount;
    const remainingToPayFromOrderTotal =
      currentOrder.total_amount - currentPaidAmountExcludingThisPayment;

    if (newAmount <= 0) {
      alert("El monto del pago debe ser mayor que cero.");
      return;
    }
    if (newAmount > remainingToPayFromOrderTotal + 0.001) {
      alert(
        `El nuevo monto excede el saldo restante de la orden (Bs. ${remainingToPayFromOrderTotal.toFixed(
          2
        )}).`
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("purchase_order_payments")
        .update({
          amount: newAmount,
          payment_method: data.payment_method,
          employee_id: currentEmployeeId,
        })
        .eq("id", editingPayment.id);

      if (error) {
        throw error;
      }

      // Actualizar el historial de pagos localmente
      setPaymentHistory((currentHistory) =>
        currentHistory.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                amount: newAmount,
                payment_method: data.payment_method,
              }
            : p
        )
      );

      alert("Pago actualizado exitosamente.");
      closeEditPaymentModal();

      // Actualizar el estado de la orden
      await updateOrderPaymentStatus(orderId);

      // Forzar recarga de datos para asegurar consistencia
      await fetchDataAndSetOrders();
    } catch (error: any) {
      console.error("Error al actualizar el pago:", error.message);
      alert("Error al actualizar el pago: " + error.message);
    }
  };

  // --- Funciones para Eliminar un Pago ---
  const confirmDeletePayment = (payment: PurchaseOrderPayment) => {
    setPaymentToDelete(payment);
    setIsDeletePaymentModalOpen(true);
  };

  const cancelDeletePayment = () => {
    setIsDeletePaymentModalOpen(false);
    setPaymentToDelete(null);
  };

  // Función de eliminar simplificada. Ya no necesita manejar la lógica del modal.
  const executeDeletePayment = async () => {
    if (!paymentToDelete) return;

    const orderId = paymentToDelete.order_id;

    try {
      const { error } = await supabase
        .from("purchase_order_payments")
        .delete()
        .eq("id", paymentToDelete.id);

      if (error) {
        throw error;
      }

      // Actualiza la lista de pagos del modal para una respuesta visual inmediata
      setPaymentHistory((currentHistory) =>
        currentHistory.filter((p) => p.id !== paymentToDelete!.id)
      );

      // Cierra el modal de confirmación
      setIsDeletePaymentModalOpen(false);
      setPaymentToDelete(null);

      // Actualiza el estado de la orden
      const success = await updateOrderPaymentStatus(orderId);

      if (success) {
        alert("Pago eliminado exitosamente.");
        // Forzar recarga de datos para asegurar consistencia
        await fetchDataAndSetOrders();
      } else {
        throw new Error("Error al actualizar el estado de la orden");
      }
    } catch (error: any) {
      console.error("Error al eliminar el pago:", error.message);
      alert("Error al eliminar el pago: " + error.message);
      setIsDeletePaymentModalOpen(false);
      setPaymentToDelete(null);
    }
  };

  // NUEVO: Lógica para filtrar órdenes
  const filteredOrders = orders.filter(
    (order) =>
      order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item) =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4">
      {/* Formulario de Orden de Compra */}
      {showOrderForm ? (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">
              {editingOrder
                ? "Editar Orden de Compra"
                : "Nueva Orden de Compra"}
            </h2>
            <button
              onClick={() => {
                setShowOrderForm(false);
                setEditingOrder(null);
                reset();
              }}
              className="text-gray-500 hover:text-gray-700 text-sm sm:text-base"
            >
              Cancelar
            </button>
          </div>
          <form onSubmit={handleSubmit(handleSaveOrder)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Proveedor
              </label>
              <select
                {...register("supplier_id", { required: true })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm sm:text-base"
              >
                <option value="" disabled>
                  Seleccione un proveedor
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                {...register("status", { required: true })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm sm:text-base"
              >
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="parcialmente pagada">Parcialmente Pagada</option>
              </select>
            </div>

            <ProductItemForm onAddItem={handleAddItem} products={products} />

            {/* Lista de productos agregados */}
            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-2 py-3 sm:px-4 sm:py-4 text-center text-xs sm:text-sm text-gray-500"
                      >
                        No hay productos agregados
                      </td>
                    </tr>
                  ) : (
                    orderItems.map((item, index) => {
                      const product = products.find(
                        (p) => p.id === item.product_id
                      );
                      return (
                        <tr key={index}>
                          <td className="px-2 py-2 sm:px-4 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">
                                {product?.name || "Producto no encontrado"}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900">
                              {item.quantity}
                            </div>
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900">
                              Bs. {item.price_unit.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900">
                              Bs. {(item.quantity * item.price_unit).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                            <button
                              type="button"
                              onClick={() =>
                                setOrderItems(
                                  orderItems.filter((_, i) => i !== index)
                                )
                              }
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2
                                size={16}
                                className="w-4 h-4 sm:w-5 sm:h-5"
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                disabled={orderItems.length === 0}
              >
                {editingOrder ? "Actualizar Orden" : "Crear Orden"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Controles superiores: Botón de nueva orden y Buscador */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <button
              onClick={() => {
                setShowOrderForm(true);
                setEditingOrder(null);
                setManualTotal(null);
                reset();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
            >
              <Plus size={20} />
              Nueva Orden de Compra
            </button>

            {/* Nuevo campo de búsqueda */}
            <div className="relative w-full md:w-1/3">
              <input
                type="text"
                placeholder="Buscar por proveedor, producto, estado o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
            </div>
          </div>

          {/* Tabla de Órdenes de Compra (versión desktop) */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      PROVEEDOR
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      PRODUCTO
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      CANTIDAD
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      FECHA ORDEN
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      TOTAL
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      PAGADO
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      ESTADO
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length === 0 ? ( // Usar filteredOrders aquí
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No hay órdenes de compra que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(
                      (
                        order // Iterar sobre filteredOrders
                      ) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.supplier_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.items
                              .map(
                                (item: PurchaseOrderItem) => item.product_name
                              )
                              .join(", ")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.items.reduce(
                              (acc: number, item: PurchaseOrderItem) =>
                                acc + item.quantity,
                              0
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(order.order_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            Bs. {(order.total_amount ?? 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-green-700 font-semibold">
                            Bs. {(order.paid_amount ?? 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap capitalize">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.status === "completada"
                                  ? "bg-green-100 text-green-800"
                                  : order.status === "parcialmente pagada"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              onClick={() => handleEdit(order)}
                              className="p-1"
                              title="Editar Orden"
                            >
                              <Pencil
                                size={18}
                                className="text-blue-600 hover:text-blue-800"
                              />
                            </button>
                            <button
                              onClick={() => confirmDeleteOrder(order.id)}
                              className="p-1"
                              title="Eliminar Orden"
                            >
                              <Trash2
                                size={18}
                                className="text-red-600 hover:text-red-800"
                              />
                            </button>
                            {order.balance_due > 0.01 && (
                              <button
                                onClick={() => openPaymentModal(order)}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Registrar Pago"
                              >
                                <DollarSign size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => openPaymentHistoryModal(order)}
                              className="p-1 text-gray-600 hover:text-gray-800"
                              title="Ver Historial de Pagos"
                            >
                              <History size={18} />
                            </button>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartas en móviles (Órdenes de Compra) */}
          <div className="block md:hidden space-y-4">
            {filteredOrders.length === 0 ? ( // Usar filteredOrders aquí
              <p className="text-center text-gray-500">
                No hay órdenes de compra que coincidan con la búsqueda.
              </p>
            ) : (
              filteredOrders.map(
                (
                  order, // Iterar sobre filteredOrders
                  index
                ) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="mb-2">
                      <h3 className="font-semibold text-lg text-blue-700 mb-1">
                        Orden #{index + 1}
                      </h3>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Proveedor:</span>{" "}
                        {order.supplier_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Producto(s):</span>{" "}
                        {order.items
                          .map((item: PurchaseOrderItem) => item.product_name)
                          .join(", ")}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Fecha:</span>{" "}
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Total:</span> Bs.{" "}
                        {(order.total_amount ?? 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-green-700 font-semibold">
                        <span className="font-medium text-gray-600">
                          Pagado:
                        </span>{" "}
                        Bs. {(order.paid_amount ?? 0).toFixed(2)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          order.status === "completada"
                            ? "text-green-600"
                            : order.status === "parcialmente pagada"
                            ? "text-yellow-600"
                            : "text-red-600"
                        } capitalize`}
                      >
                        Estado: {order.status}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 border-t pt-3">
                      <button
                        onClick={() => handleEdit(order)}
                        className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                        title="Editar Orden"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirmDeleteOrder(order.id)}
                        className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        title="Eliminar Orden"
                      >
                        <Trash2 size={16} />
                      </button>
                      {order.balance_due > 0.01 && (
                        <button
                          onClick={() => openPaymentModal(order)}
                          className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                          title="Registrar Pago"
                        >
                          <DollarSign size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => openPaymentHistoryModal(order)}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Ver Historial de Pagos"
                      >
                        <History size={16} />
                      </button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </>
      )}

      {/* Modal de Registro de Pago */}
      {showPaymentModal && selectedOrderForPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Registrar Pago para Orden
            </h2>
            <p className="mb-4 text-gray-700">
              Orden ID:{" "}
              <span className="font-medium">
                {selectedOrderForPayment.id.substring(0, 8)}...
              </span>
            </p>
            <p className="mb-4 text-gray-700">
              Total Orden:{" "}
              <span className="font-medium">
                Bs. {selectedOrderForPayment.total_amount.toFixed(2)}
              </span>
            </p>
            <p className="mb-6 text-gray-700">
              Monto Pendiente:{" "}
              <span className="font-semibold text-red-600">
                Bs. {selectedOrderForPayment.balance_due.toFixed(2)}
              </span>
            </p>
            <form
              onSubmit={handlePaymentSubmit(handleRegisterPayment)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Monto a Pagar
                </label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0.01"
                  {...registerPayment("amount", {
                    required: "El monto es requerido",
                    min: {
                      value: 0.01,
                      message: "El monto debe ser mayor que cero",
                    },
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {paymentFormErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">
                    {paymentFormErrors.amount.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="payment_method"
                  className="block text-sm font-medium text-gray-700"
                >
                  Método de Pago
                </label>
                <select
                  id="payment_method"
                  {...registerPayment("payment_method", {
                    required: "El método de pago es requerido",
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia Bancaria(QR)">
                    Transferencia Bancaria(QR)
                  </option>
                  <option value="Otro">Otro</option>
                </select>
                {paymentFormErrors.payment_method && (
                  <p className="mt-1 text-sm text-red-600">
                    {paymentFormErrors.payment_method.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Historial de Pagos */}
      {showPaymentHistoryModal && selectedOrderForPaymentHistory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Historial de Pagos de la Orden
              </h2>
              <button
                onClick={closePaymentHistoryModal}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
            </div>
            <p className="mb-4 text-gray-700">
              Total Orden:{" "}
              <span className="font-medium">
                Bs. {selectedOrderForPaymentHistory.total_amount.toFixed(2)}
              </span>
            </p>
            <p className="mb-6 text-gray-700">
              Total Pagado:{" "}
              <span className="font-semibold text-green-600">
                Bs. {selectedOrderForPaymentHistory.paid_amount.toFixed(2)}
              </span>
              {" | "}
              Saldo Pendiente:{" "}
              <span className="font-semibold text-red-600">
                Bs. {selectedOrderForPaymentHistory.balance_due.toFixed(2)}
              </span>
            </p>

            {paymentHistory.length === 0 ? (
              <p className="text-center text-gray-500">
                No hay pagos registrados para esta orden.
              </p>
            ) : (
              <>
                {/* Tabla para historial de pagos (desktop) */}
                <div className="hidden md:block overflow-x-auto mb-6">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Fecha de Pago
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Método
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Registrado por
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(
                              payment.payment_date
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-green-700">
                            Bs. {payment.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {payment.payment_method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">N/A</td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              onClick={() => handleEditPayment(payment)}
                              className="p-1"
                              title="Editar Pago"
                            >
                              <Pencil
                                size={18}
                                className="text-blue-600 hover:text-blue-800"
                              />
                            </button>
                            <button
                              onClick={() => confirmDeletePayment(payment)}
                              className="p-1"
                              title="Eliminar Pago"
                            >
                              <Trash2
                                size={18}
                                className="text-red-600 hover:text-red-800"
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards para historial de pagos (mobile) */}
                <div className="block md:hidden space-y-4 mb-6">
                  {paymentHistory.map((payment, index) => (
                    <div
                      key={payment.id}
                      className="bg-gray-50 rounded-lg shadow-sm p-4 border border-gray-200"
                    >
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Pago #{index + 1}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Fecha:</span>{" "}
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                      <p className="text-lg font-bold text-green-700 mt-1">
                        Monto: Bs. {payment.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Método:</span>{" "}
                        {payment.payment_method}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Registrado por:</span> N/A
                      </p>
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                          title="Editar Pago"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => confirmDeletePayment(payment)}
                          className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                          title="Eliminar Pago"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edición de Pago */}
      {showEditPaymentModal && editingPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Editar Pago
            </h2>
            <p className="mb-4 text-gray-700">
              ID de Pago:{" "}
              <span className="font-medium">
                {editingPayment.id.substring(0, 8)}...
              </span>
            </p>
            <p className="mb-6 text-gray-700">
              Fecha de Pago Original:{" "}
              <span className="font-medium">
                {new Date(editingPayment.payment_date).toLocaleDateString()}
              </span>
            </p>
            <form
              onSubmit={handlePaymentSubmit(handleUpdatePayment)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="edit_amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Monto del Pago
                </label>
                <input
                  type="number"
                  id="edit_amount"
                  step="0.01"
                  min="0.01"
                  {...registerPayment("amount", {
                    required: "El monto es requerido",
                    min: {
                      value: 0.01,
                      message: "El monto debe ser mayor que cero",
                    },
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {paymentFormErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">
                    {paymentFormErrors.amount.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="edit_payment_method"
                  className="block text-sm font-medium text-gray-700"
                >
                  Método de Pago
                </label>
                <select
                  id="edit_payment_method"
                  {...registerPayment("payment_method", {
                    required: "El método de pago es requerido",
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia Bancaria(QR)">
                    Transferencia Bancaria(QR)
                  </option>
                  <option value="Otro">Otro</option>
                </select>
                {paymentFormErrors.payment_method && (
                  <p className="mt-1 text-sm text-red-600">
                    {paymentFormErrors.payment_method.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditPaymentModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Actualizar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Órdenes */}
      <AlertDelete
        isOpen={isDeleteOrderModalOpen}
        // Cambiado de onCancel a setIsOpen
        setIsOpen={(value) => cancelDeleteOrder()} // Llama a cancelDeleteOrder para manejar el cierre
        removeProduct={() => {
          executeDeleteOrder(); // Llama a la función asíncrona pero no la espera aquí
        }}
      />

      {/* Modal de Confirmación de Eliminación de Pagos */}
      <AlertDelete
        isOpen={isDeletePaymentModalOpen}
        setIsOpen={(value) => cancelDeletePayment()}
        removeProduct={() => {
          executeDeletePayment();
        }}
      />
    </div>
  );
};
