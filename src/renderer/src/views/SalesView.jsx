import { useState, useEffect } from 'react';

export default function SalesView() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    window.electronAPI?.getProducts().then(setProducts);
  }, []);

  // Filtrado en tiempo real
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const result = await window.electronAPI.saveSale({ cart, total });
    if (result.success) {
      setCart([]);
      setSearch("");
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      
      {/* SECCIÓN IZQUIERDA: CATÁLOGO */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        
        {/* BUSCADOR */}
        <div className="mb-4 relative">
          <input 
            type="text"
            placeholder="Buscar pastel, pan, dulce..."
            className="w-full p-4 pl-12 rounded-2xl border-none shadow-lg text-lg focus:ring-2 focus:ring-orange-400 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-4 top-4 text-2xl">🔍</span>
        </div>

        {/* REJILLA DE PRODUCTOS */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            
          {filteredProducts.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-center text-center border border-slate-200"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl mb-2">
                {p.category === 'Bollería' ? '🥐' : '🎂'}
              </div>
              <span className="font-bold text-slate-700 leading-tight h-10 flex items-center">{p.name}</span>
              <span className="text-orange-600 font-black text-xl mt-2">{p.price.toFixed(2)}€</span>
            </button>
           
            
          ))}
        </div>
      </div>

      {/* SECCIÓN DERECHA: TICKET */}
      <div className="w-[400px] bg-white shadow-2xl flex flex-col border-l border-slate-200">
        <div className="p-6 bg-slate-800 text-white">
          <h2 className="text-xl font-bold flex justify-between items-center">
            <span>Ticket Actual</span>
            <span className="text-sm bg-slate-700 px-3 py-1 rounded-full uppercase tracking-widest">Fase 1</span>
          </h2>
        </div>

        {/* LISTA DE ITEMS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <span className="text-6xl mb-4">🛒</span>
              <p>El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700">{item.name}</span>
                  <span className="text-xs text-slate-500">{item.qty} x {item.price.toFixed(2)}€</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold">{(item.price * item.qty).toFixed(2)}€</span>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TOTAL Y COBRO */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex justify-between items-end mb-6">
            <span className="text-slate-500 font-bold uppercase text-xs">Total a pagar</span>
            <span className="text-4xl font-black text-slate-900 leading-none">
              {total.toFixed(2)}<span className="text-xl ml-1">€</span>
            </span>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className={`w-full py-5 rounded-2xl font-black text-xl shadow-lg transition-all transform active:scale-95 ${
              cart.length > 0 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            CONFIRMAR Y COBRAR
          </button>
        </div>
      </div>
    </div>
  );
}