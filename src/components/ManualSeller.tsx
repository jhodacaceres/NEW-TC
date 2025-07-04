
export default function ManualSeller() {
  return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100 p-6 rounded-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Manual de Vendedor
          </h2>
          <p className="text-blue-200 mt-1">Sistema de Gestión Axcel</p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Introducción */}
        <section className="bg-gray-700/50 p-6 rounded-xl border border-gray-600/50">
          <h3 className="text-xl font-semibold mb-4 text-blue-300">
            Introducción
          </h3>
          <p className="text-gray-300 leading-relaxed">
            Como vendedor en Axcel, tu herramienta principal es el módulo de
            ventas. Este manual te guiará para realizar ventas de manera rápida y
            eficiente usando el sistema de códigos de barras.
          </p>
        </section>

        {/* Proceso de Ventas */}
        <section className="bg-gray-700/50 p-6 rounded-xl border border-gray-600/50">
          <h3 className="text-xl font-semibold mb-4 text-purple-300">
            Proceso de Ventas
          </h3>
          
          <div className="space-y-6">
            {/* Paso 1 */}
            <div className="flex items-start">
              <div className="bg-blue-500/20 text-blue-400 rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium text-lg text-white mb-2">Iniciar Venta</h4>
                <ul className="text-gray-300 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Selecciona la sección "Ventas" en el menú</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Verifica que tu nombre aparezca como vendedor</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex items-start">
              <div className="bg-purple-500/20 text-purple-400 rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium text-lg text-white mb-2">Escanear Productos</h4>
                <ul className="text-gray-300 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Usa el escáner para leer códigos de barras</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Cada producto aparece automáticamente en la lista</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">!</span>
                    <span>Para códigos MEI, escanea directamente</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="flex items-start">
              <div className="bg-pink-500/20 text-pink-400 rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium text-lg text-white mb-2">Confirmar Venta</h4>
                <ul className="text-gray-300 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Verifica los productos y el total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">i</span>
                    <span>Puedes agregar datos del cliente (opcional)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Haz clic en "Registrar Venta" para finalizar</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Consejos Rápidos */}
        <section className="bg-gray-700/50 p-6 rounded-xl border border-gray-600/50">
          <h3 className="text-xl font-semibold mb-4 text-yellow-300">
            Consejos Rápidos
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-medium text-white mb-2">Escaneo eficiente</h4>
              <p className="text-gray-300 text-sm">
                Mantén el escáner limpio y asegúrate que los códigos estén visibles
                para un escaneo rápido.
              </p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-purple-500">
              <h4 className="font-medium text-white mb-2">Verificación</h4>
              <p className="text-gray-300 text-sm">
                Siempre muestra el total al cliente antes de finalizar la venta.
              </p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-green-500">
              <h4 className="font-medium text-white mb-2">Seguridad</h4>
              <p className="text-gray-300 text-sm">
                Cierra sesión cuando termines tu turno para proteger el sistema.
              </p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-red-500">
              <h4 className="font-medium text-white mb-2">Problemas</h4>
              <p className="text-gray-300 text-sm">
                Si un código no funciona, intenta limpiarlo o ingrésalo manualmente.
              </p>
            </div>
          </div>
        </section>

        {/* Preguntas Frecuentes */}
        <section className="bg-gray-700/50 p-6 rounded-xl border border-gray-600/50">
          <h3 className="text-xl font-semibold mb-4 text-green-300">
            Preguntas Frecuentes
          </h3>
          <div className="space-y-4">
            <div className="bg-gray-800/30 p-4 rounded-lg">
              <h4 className="font-medium text-white">
                ¿Qué hago si se va la luz durante una venta?
              </h4>
              <p className="text-gray-300 mt-1 text-sm">
                El sistema guarda automáticamente. Al regresar la energía, podrás
                continuar donde quedaste.
              </p>
            </div>
            <div className="bg-gray-800/30 p-4 rounded-lg">
              <h4 className="font-medium text-white">
                ¿Puedo hacer descuentos especiales?
              </h4>
              <p className="text-gray-300 mt-1 text-sm">
                Los precios son fijos. Para descuentos especiales contacta al
                administrador.
              </p>
            </div>
            <div className="bg-gray-800/30 p-4 rounded-lg">
              <h4 className="font-medium text-white">
                ¿Cómo sé si un producto está disponible?
              </h4>
              <p className="text-gray-300 mt-1 text-sm">
                Solo los productos con stock aparecerán al escanear.
              </p>
            </div>
          </div>
        </section>

        {/* Soporte */}
        <section className="text-center py-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            ¿Necesitas más ayuda?
          </h3>
          <p className="text-blue-500">
            Contacta al administrador del sistema para soporte técnico.
          </p>
          <div className="mt-4 bg-blue-900/30 text-blue-400 inline-block px-4 py-2 rounded-full text-sm">
            Tiendas Axcel
          </div>
        </section>
      </div>
    </div>
  );
}

