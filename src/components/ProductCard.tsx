import React, { useState, useEffect } from "react";
import { Edit, Trash2 } from "lucide-react";
import { Product } from "../types";
import { supabase } from "../lib/supabase";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  exchangeRate: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onToggleActive,
  exchangeRate,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [stockCount, setStockCount] = useState(0);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Obtener empleado actual
  useEffect(() => {
    const employeeData = localStorage.getItem("currentEmployee");
    if (employeeData) {
      setCurrentEmployee(JSON.parse(employeeData));
    }
  }, []);

  // Calcular stock según el tipo de empleado
  useEffect(() => {
    const calculateStock = async () => {
      if (!currentEmployee) return;

      try {
        const query = currentEmployee.position === "administrador" 
          ? supabase
              .from("product_barcodes_store")
              .select("id")
              .eq("product_id", product.id)
              .eq("is_sold", false)
          : supabase
              .from("product_barcodes_store")
              .select("id")
              .eq("product_id", product.id)
              .eq("store_id", currentEmployee.store_id)
              .eq("is_sold", false);

        const { data, error } = await query;

        if (error) throw error;
        setStockCount(data?.length || 0);
      } catch (error) {
        console.error("Error calculating stock:", error);
        setStockCount(0);
      }
    };

    calculateStock();
  }, [product.id, currentEmployee]);

  const handleToggleActive = async () => {
    setShowConfirm(false);
    setIsVisible(false);
    // Espera a que termine la animación antes de desactivar
    setTimeout(() => onToggleActive(product.id, false), 300);
  };

  if (!isVisible || !product.active) {
    return null;
  }

  const finalPriceInBs = product.cost_price * exchangeRate + product.profit_bob;

  const getImageUrl = () => {
    if (!product.image) {
      return "https://placehold.co/400x300?text=No+Image";
    }
    if (product.image.startsWith("http")) {
      return product.image;
    }
    return `${supabase.supabaseUrl}/storage/v1/object/public/product-images/${product.image}`;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 transform hover:scale-[1.02] ${
        !isVisible ? "opacity-0 scale-95 h-0" : "opacity-100 scale-100 h-auto"
      }`}
      style={{
        transitionProperty: 'opacity, transform, height',
        willChange: 'opacity, transform, height'
      }}
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={getImageUrl()}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/400x300?text=Image+Error";
          }}
          loading="lazy"
        />
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-sm">
          Stock: {stockCount}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
        <p className="text-sm text-gray-600 mt-1">Color: {product.color}</p>
        <p className="text-xl font-bold text-blue-200 mt-2">
          Precio final: {Math.round(Number(finalPriceInBs))} Bs
        </p>

        {currentEmployee?.position === "administrador" && (
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => onEdit(product)}
              className="p-2 text-blue-400 hover:bg-blue-50 rounded-full"
              aria-label="Editar producto"
            >
              <Edit size={20} />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-full"
              aria-label="Eliminar producto"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ¿Estás seguro de que quieres desactivar este producto?
            </h2>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleActive}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
