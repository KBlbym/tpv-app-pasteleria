import { useState, useEffect } from 'react';

export default function SalesView({ activeSession }) { // <-- Recibimos la sesión por props
  // 1. Estados principales
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
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

  // 2. Carga de datos inicial
  useEffect(() => {
    window.electronAPI.getActiveProductsWithCategory().then(setProducts);
    window.electronAPI.getActiveCategories().then(setCategories);
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  // 3. Lógica del Carrito
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

  const removeFromCart = (productId) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;
      if (item.qty > 1) {
        return prev.map(i => i.id === productId ? { ...i, qty: i.qty - 1 } : i);
      }
      return prev.filter(i => i.id !== productId);
    });
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm("¿Vaciar ticket?")) setCart([]);
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // 4. Lógica de Cobro (EL CORAZÓN DE LA FASE 4)
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // VALIDACIÓN CRÍTICA: Impedir venta sin sesión
    if (!activeSession) {
      alert("⛔ ATENCIÓN: No puedes realizar ventas sin abrir un turno de caja.\nVe a la pestaña 'Caja' para empezar.");
      return;
    }

    const saleData = {
      cart: [...cart],
      total,
      session_id: activeSession.id, // VINCULAMOS LA VENTA AL TURNO ACTUAL
      date: new Date().toISOString()
    };

    try {
      const res = await window.electronAPI.saveSale(saleData);
      if (res && res.success) {
        setLastSale({ ...saleData, id: res.id });
        setShowPreview(true);
        setCart([]);
      }
    } catch (err) {
      console.error("Error al guardar venta:", err);
    }
  };

  // Filtrado de productos
  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products;

  return (
    <div className="flex h-full bg-slate-100 relative">
      
      {/* BLOQUEO VISUAL SI NO HAY SESIÓN (UX Senior) */}
      {!activeSession && (
        <div className="absolute inset-0 z-50 bg-slate-100/60 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center border-2 border-orange-500 max-w-sm animate-bounce">
            <span className="text-5xl mb-4 block">🔑</span>
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Caja Bloqueada</h2>
            <p className="text-slate-500 font-bold text-sm mt-2">Debes abrir un turno en la pestaña "Caja" para poder operar el terminal.</p>
          </div>
        </div>
      )}

      {/* IZQUIERDA: PRODUCTOS */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Multiplicador */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="px-3 border-r border-slate-200 py-1">
            <span className="text-[10px] font-black text-slate-400 uppercase block leading-none">Cantidad</span>
            <span className="text-lg font-black text-orange-500 leading-none">x{multiplier}</span>
          </div>
          <div className="flex gap-2 flex-1 px-2">
            {[1, 2, 6, 12, 24].map(num => (
              <button key={num} onClick={() => setMultiplier(num)}
                className={`flex-1 py-2 rounded-xl font-black transition-all ${multiplier === num ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          <button onClick={() => setActiveCategory(null)}
            className={`px-8 py-4 rounded-2xl font-black text-sm uppercase border-2 transition-all ${!activeCategory ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-transparent text-slate-500'}`}>
            🌟 Todos
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`relative h-20 min-w-[120px] rounded-2xl font-black text-xs uppercase border-2 overflow-hidden flex flex-col items-center justify-center transition-all ${activeCategory === cat.id ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}>
              {cat.image_path && <img src={`safe-protocol://${cat.image_path}`} className="absolute inset-0 w-full h-full object-cover opacity-20" alt=""/>}
              <span className="relative z-10 text-xl">{cat.icon}</span>
              <span className="relative z-10">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Rejilla de Productos */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => { addToCart(p, multiplier); setMultiplier(1); }}
              className="bg-white p-4 rounded-[2rem] shadow-sm hover:shadow-xl transition-all flex flex-col items-center border-2 border-slate-50 group">
              <div className="w-full h-24 flex items-center justify-center bg-slate-50 rounded-2xl mb-2 overflow-hidden">
                {p.image_path ? <img src={`safe-protocol://${p.image_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> 
                : <span className="text-4xl">{categories.find(c => c.id === p.category_id)?.icon || '🥐'}</span>}
              </div>
              <span className="font-bold text-slate-700 text-sm h-10 flex items-center">{p.name}</span>
              <span className="mt-2 py-1 px-4 bg-orange-100 text-orange-700 rounded-full font-black">{p.price.toFixed(2)}€</span>
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