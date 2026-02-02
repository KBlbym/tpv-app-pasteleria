import { useState, useEffect } from 'react';

export default function SalesView() {

  // Estados principales
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null); // null = "Todos"
  const [multiplier, setMultiplier] = useState(1);

  const [showPreview, setShowPreview] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const [settings, setSettings] = useState({
  business_name: 'Cargando...',
  business_nif: '',
  business_address: '',
  business_phone: '',
  ticket_footer: ''
});


  useEffect(() => {
    // Carga inicial de datos
    window.electronAPI.getActiveProductsWithCategory().then(setProducts);
    window.electronAPI.getCategories().then(setCategories);
    //cargar configuración
    window.electronAPI.getSettings().then(setSettings);
       
  }, []);

  // Filtrado en tiempo real
  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products;

  // 1. Añadir con posibilidad de cantidad
  const addToCart = (product, qtyToAdd = 1) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + qtyToAdd } : item
        );
      }
      return [...prev, { ...product, qty: qtyToAdd }];
    });
  };

  // 2. Eliminar o disminuir (Punto 1 de tu petición)
  const removeFromCart = (productId) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;

      if (item.qty > 1) {
        // Si hay más de uno, disminuimos 1
        return prev.map(i => i.id === productId ? { ...i, qty: i.qty - 1 } : i);
      } else {
        // Si solo queda uno, lo eliminamos de la lista
        return prev.filter(i => i.id !== productId);
      }
    });
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // const handleCheckout = async () => {
  //   if (cart.length === 0) return;
  //   const result = await window.electronAPI.saveSale({ cart, total });
  //   if (result.success) {
  //     setCart([]);
  //     setSearch("");
  //   }
  // };

const handleCheckout = async () => {
  if (cart.length === 0) return;

  const saleData = { 
    cart: [...cart], // Clonamos para evitar problemas de referencia
    total, 
    date: new Date().toISOString() 
  };

  console.log("Enviando venta...", saleData);
  
  try {
    const res = await window.electronAPI.saveSale(saleData);
    console.log("Respuesta del servidor:", res); // <--- MIRA ESTO EN LA CONSOLA (F12)

    if (res && res.success) {
      setLastSale({ ...saleData, id: res.id }); 
      setShowPreview(true); 
      setCart([]); 
    } else {
      alert("La venta se guardó pero hubo un problema con la respuesta.");
    }
  } catch (err) {
    console.error("Error en la comunicación IPC:", err);
  }
};
  const clearCart = () => {
    if (cart.length === 0) return;
    // Opcional: añadir una confirmación rápida para evitar desastres
    if (confirm("¿Seguro que quieres vaciar todo el ticket?")) {
      setCart([]);
    }
  };

  return (
    <div className="flex h-full bg-slate-100">

      {/* IZQUIERDA: PRODUCTOS Y CATEGORÍAS */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">

        {/* 1. NUEVA BARRA DE MULTIPLICADOR PROFESIONAL */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="px-3 border-r border-slate-200 py-1">
            <span className="text-[10px] font-black text-slate-400 uppercase block leading-none">Cantidad</span>
            <span className="text-lg font-black text-orange-500 leading-none">Añadir x{multiplier}</span>
          </div>
          <div className="flex gap-2 flex-1 px-2">
            {[1, 2, 6, 12, 24].map(num => (
              <button
                key={num}
                onClick={() => setMultiplier(num)}
                className={`flex-1 py-2 rounded-xl font-black transition-all ${multiplier === num ? 'bg-orange-500 text-gray-300 shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {num}
              </button>
            ))}
            <input
              type="number"
              min="1"
              className="w-20 p-2 bg-slate-800 text-white rounded-xl text-center font-black focus:ring-2 focus:ring-orange-500 outline-none"
              value={multiplier}
              onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>

        {/* BARRA DE CATEGORÍAS */}
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-sm transition-all border-2 ${!activeCategory ? 'bg-orange-500 border-orange-600 text-white scale-105' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            🌟 Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-sm transition-all border-2 whitespace-nowrap ${activeCategory === cat.id ? 'bg-orange-500 border-orange-600 text-white scale-105' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* REJILLA DE PRODUCTOS */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-2">
          {filteredProducts.map(p => (
            <button
              key={p.id}
              onClick={() => {
                addToCart(p, multiplier); // Añadimos la cantidad seleccionada
                setMultiplier(1);         // Reseteamos a 1 para la próxima venta
              }}
              className="bg-white aspect-square p-4 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex flex-col items-center justify-center text-center border-2 border-slate-50 group"
            >
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                {categories.find(c => c.id === p.category_id)?.icon || '🍰'}
              </span>
              <span className="font-bold text-slate-700 leading-tight text-lg">{p.name}</span>
              <span className="mt-2 py-1 px-4 bg-orange-100 text-orange-700 rounded-full font-black text-xl">
                {p.price.toFixed(2)}€
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DERECHA: TICKET (Sidebar) */}
      <div className="w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span className="bg-orange-500 w-2 h-8 rounded-full"></span>
            ORDEN ACTUAL
          </h2>
          {/* NUEVO BOTÓN DE VACIAR */}
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="
      text-red-500 
      px-3 py-2 
      rounded-xl 
      text-xs 
      font-black 
      transition-all 
      flex items-center gap-1 
      border border-transparent
      hover:bg-red-50 
      hover:text-red-700 
      hover:border-red-200
      active:scale-95
    "
            >
              ✕ VACÍAR
            </button>
          )}
          <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase">
            {cart.length} Líneas
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {cart.map(item => (
            <div
              key={item.id}
              onClick={() => removeFromCart(item.id)} // Funcionalidad de restar 1
              className="group flex justify-between items-center bg-white p-4 rounded-2xl border-2 border-slate-100 cursor-pointer hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
            >
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 group-hover:text-red-600">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md font-black">x{item.qty}</span>
                  <span className="text-xs font-bold text-slate-400">{item.price.toFixed(2)}€ / ud</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="font-black text-lg text-slate-700 group-hover:hidden">
                  {(item.price * item.qty).toFixed(2)}€
                </span>
                {/* Indicador visual de eliminación al hacer hover */}
                <span className="hidden group-hover:flex items-center gap-1 text-red-500 font-black text-sm">
                  {item.qty > 1 ? 'RESTAR 1' : 'ELIMINAR'} ✕
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-900 text-white rounded-t-[3rem] shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 font-bold tracking-widest text-sm uppercase">Total a pagar</span>
            <span className="text-6xl font-black text-orange-400 leading-none">{total.toFixed(2)}€</span>
          </div>
          <button
  disabled={cart.length === 0}
  onClick={handleCheckout} // <--- Usa la función que definimos arriba
  className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-black py-6 rounded-2xl font-black text-2xl shadow-lg active:scale-95 transition-all uppercase tracking-tighter"
>
  COBRAR (F1)
</button>
        </div>
      </div>
      
      


      {/* MODAL DE VISTA PREVIA DEL TICKET */}
{showPreview && lastSale && (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white w-[380px] shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
      
      {/* "Papel" del Ticket */}
      <div className="p-8 font-mono text-[13px] text-slate-800 leading-tight border-b-8 border-dotted border-slate-200">
        
        {/* Cabecera Fiscal */}
        <div className="text-center space-y-1 mb-6">
          <h2 className="font-black text-xl uppercase tracking-tighter">{settings.business_name}</h2>
          <p className="text-[11px] font-bold">NIF: {settings.business_nif}</p>
          <p className="text-[11px]">{settings.business_address}</p>
          <p className="text-[11px]">TEL: {settings.business_phone}</p>
        </div>

        <div className="border-b border-dashed border-slate-400 my-4"></div>
        
        {/* Info del Ticket */}
        <div className="flex justify-between text-[11px] mb-4 font-bold">
          <span>TICKET: #00{lastSale.id || '---'}</span>
          <span>{new Date().toLocaleString()}</span>
        </div>

        {/* Productos */}
        <div className="space-y-3 mb-6">
          {lastSale.cart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <span className="flex-1">{item.qty} x {item.name}</span>
              <span className="ml-4 font-bold">{(item.qty * item.price).toFixed(2)}€</span>
            </div>
          ))}
        </div>

        <div className="border-b-2 border-slate-800 my-4"></div>

        {/* Total */}
        <div className="flex justify-between items-center py-2">
          <span className="font-black text-lg text-slate-900 uppercase">Total</span>
          <span className="font-black text-2xl text-slate-900">{lastSale.total.toFixed(2)}€</span>
        </div>

        {/* Pie de página */}
        <div className="text-center mt-8 space-y-2">
          <p className="italic text-slate-500 text-[11px]">{settings.ticket_footer}</p>
          <p className="text-[10px] font-bold text-slate-400">--- IVA INCLUIDO ---</p>
        </div>
      </div>

      {/* Botones de acción del Modal */}
      <div className="p-4 bg-slate-50 flex gap-3">
        <button 
          onClick={() => setShowPreview(false)}
          className="flex-1 bg-slate-800 text-white py-4 rounded-xl font-black text-sm hover:bg-slate-700 transition-colors"
        >
          CERRAR (ESC)
        </button>
        <button 
          onClick={() => window.print()} // Opcional: imprimir con el diálogo del sistema
          className="bg-orange-500 text-white px-6 rounded-xl font-black hover:bg-orange-600 transition-colors"
        >
          🖨️
        </button>
      </div>
    </div>
  </div>
)}
    </div>

    
  );
}