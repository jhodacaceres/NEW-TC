import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProductCard } from './ProductCard';
import { ProductForm } from './ProductForm';
import { Product, Store } from '../types';

export const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data);
      }
    };

    const fetchStores = async () => {
      const { data, error } = await supabase.from('stores').select('*');
      if (error) {
        console.error('Error fetching stores:', error);
      } else {
        setStores(data);
      }
    };

    fetchProducts();
    fetchStores();
  }, []);

  const handleAddOrUpdateProduct = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data);
    }
    setSelectedProduct(undefined);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
    } else {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="p-4">
      <ProductForm
        onSubmit={handleAddOrUpdateProduct}
        product={selectedProduct}
        stores={stores}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            exchangeRate={6.96}
          />
        ))}
      </div>
    </div>
  );
};
