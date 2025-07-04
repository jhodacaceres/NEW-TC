import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

function useScanner(input: React.RefObject<HTMLInputElement>) {
  const [scannedProducts, setScannedProducts] = useState<string[]>([]);

  const handleScannerInput = (event: KeyboardEvent) => {
    if (!input.current) return scannedProducts;

    if (event.key === "Enter" && input.current.value) {
      const barcode = input.current.value.trim();
      setScannedProducts((prevProducts) => {
        if (barcode && !prevProducts.includes(barcode)) {
          input.current!.value = "";
          return [...prevProducts, barcode];
        }
        input.current!.value = "";
        return prevProducts;
      });
    }
    return scannedProducts;
  };

  useEffect(() => {
    const inputEl = input.current;
    if (!inputEl) return;
    inputEl.addEventListener("keydown", handleScannerInput);
    return () => {
      inputEl.removeEventListener("keydown", handleScannerInput);
    };
  }, [input.current]);

  const handleScanner = () => {
    input.current?.focus();
    return toast.success("Puede escanear el código", {
      duration: 3000,
      position: "top-right",
    });
  };

  const clearCodeScanner = () => {
    setScannedProducts([]);
  };

  return {
    result: scannedProducts,
    onScanner: handleScanner,
    onClearScanner: clearCodeScanner,
    isEmptyResult: scannedProducts.length !== 0,
  };
};

interface Product {
  barcode: string;
  barcode_id: string;
  [key: string]: any;
}

type UseAutoSelectProductProps = {
  scannedBarcodes: string[];
  availableProducts: Product[];
  selectedProducts: Product[];
  onSelect: (product: Product) => void;
};

function useAutoSelectProduct({
  scannedBarcodes,
  availableProducts,
  selectedProducts,
  onSelect,
}: UseAutoSelectProductProps) {
  useEffect(() => {
    if (scannedBarcodes.length === 0) return;
    const lastBarcode = scannedBarcodes[scannedBarcodes.length - 1];
    const foundProduct = availableProducts.find(
      (product) => product.barcode === lastBarcode
    );
    if (foundProduct) {
      const alreadySelected = selectedProducts.some(
        (p) => p.barcode_id === foundProduct.barcode_id
      );
      if (!alreadySelected) {
        onSelect(foundProduct);
      }
    } else {
      toast.error(`Producto con código ${lastBarcode} no encontrado`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedBarcodes]);
}

export { useScanner, useAutoSelectProduct };
