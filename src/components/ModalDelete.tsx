// En ModalDelete.tsx
import React, { SetStateAction } from "react";
// Si estás usando createPortal, asegúrate de importarlo también:
// import { createPortal } from "react-dom";

interface AlertDeleteProps {
  isOpen: boolean;
  removeProduct: () => void | Promise<void>;
  setIsOpen: React.Dispatch<SetStateAction<boolean>>;
  title?: string;
  message?: string;
}

function AlertDelete({
  isOpen,
  removeProduct,
  setIsOpen,
  title = "¿Estás seguro?",
  message = "Esta acción no se puede deshacer. ¿Seguro que quieres continuar?",
}: AlertDeleteProps) {
  if (!isOpen) return null;

  // Si estás usando Portal, descomenta y usa modalRoot:
  // const modalRoot = document.getElementById("modal-root");
  // if (!modalRoot) return null; // O maneja el error

  const modalContent = (
    <>
      {/* El overlay: Fixed, cubre todo (inset-0), y ahora con un z-index alto */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000]"></div>{" "}
      {/* z-index muy alto */}
      {/* El diálogo del modal: Fixed, centrado, y con un z-index aún más alto */}
      <dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="bg-white fixed max-w-md p-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md shadow-lg z-[1001]" /* z-index superior al overlay */
      >
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm">{message}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="border border-blue-500 px-4 py-2 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                await removeProduct();
                setIsOpen(false);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-md"
            >
              Aceptar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );

  // Si estás usando Portal, renderiza a través de él:
  // return createPortal(modalContent, modalRoot);

  // Si no estás usando Portal, simplemente retorna el contenido:
  return modalContent;
}

export default AlertDelete;
