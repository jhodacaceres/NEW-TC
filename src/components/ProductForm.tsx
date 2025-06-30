import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Product, Store } from "../types";
import { supabase } from "../lib/supabase";

interface ProductFormProps {
  onSubmit: (data: Partial<Product>) => void;
  product?: Product;
  stores: Store[];
}

export const ProductForm: React.FC<ProductFormProps> = ({
  onSubmit,
  product,
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: product || {},
  });

  const handleProductSubmit = async (data: Partial<Product>) => {
    try {
      let imageUrl = product?.image || null;

      // Subir imagen si existe
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, selectedImage, {
            cacheControl: '3600',
            upsert: false,
            contentType: selectedImage.type
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      // Preparar datos para la base de datos
      const productData = {
        ...data,
        image: imageUrl,
        created_at: product?.created_at || new Date().toISOString()
      };

      // Guardar en la base de datos
      let dbOperation;
      if (product) {
        dbOperation = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
          .select();
      } else {
        dbOperation = await supabase
          .from('products')
          .insert([productData])
          .select();
      }

      if (dbOperation.error) throw dbOperation.error;

      onSubmit(productData);
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Error al guardar: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleProductSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nombre del Producto
          </label>
          <input
            type="text"
            {...register("name", { required: "Este campo es requerido" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Imagen del Producto
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Color
          </label>
          <input
            type="text"
            {...register("color", { required: "Este campo es requerido" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.color && (
            <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">RAM (GB)</label>
          <input
            type="number"
            {...register("ram", {
              required: "Este campo es requerido",
              min: { value: 0, message: "Debe ser mayor o igual a 0" },
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.ram && (
            <p className="mt-1 text-sm text-red-600">{errors.ram.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">ROM (GB)</label>
          <input
            type="number"
            {...register("rom", {
              required: "Este campo es requerido",
              min: { value: 0, message: "Debe ser mayor o igual a 0" },
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.rom && (
            <p className="mt-1 text-sm text-red-600">{errors.rom.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Procesador</label>
          <input
            type="text"
            {...register("processor", {
              required: "Este campo es requerido",
              maxLength: {
                value: 100,
                message: "Máximo 100 caracteres",
              },
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.processor && (
            <p className="mt-1 text-sm text-red-600">{errors.processor.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Precio (USD)
          </label>
          <input
            type="number"
            step="0.01"
            {...register("cost_price", {
              required: "Este campo es requerido",
              min: { value: 0, message: "El precio debe ser mayor a 0" },
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.cost_price && (
            <p className="mt-1 text-sm text-red-600">
              {errors.cost_price.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ganancia (BOB)
          </label>
          <input
            type="number"
            step="0.01"
            {...register("profit_bob", {
              required: "Este campo es requerido",
              min: {
                value: 0,
                message: "La ganancia debe ser mayor o igual a 0",
              },
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.profit_bob && (
            <p className="mt-1 text-sm text-red-600">
              {errors.profit_bob.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {product ? "Actualizar Producto" : "Crear Producto"}
        </button>
      </div>
    </form>
  );
};