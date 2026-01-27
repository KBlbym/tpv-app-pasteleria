import { useState, useEffect } from 'react';

export default function AdminView() {
  const [dailyTotal, setDailyTotal] = useState(0);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "Pastelería" });

useEffect(() => {
  const fetchTotal = async () => {
    try {
      if (window.electronAPI?.getDailySales) {
        const total = await window.electronAPI.getDailySales();
        setDailyTotal(total);
      }
    } catch (err) {
      console.error("Error al obtener ventas diarias:", err);
    }
  };
  fetchTotal();
}, []);

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price) return alert("Faltan datos");
    await window.electronAPI.addProduct(newProduct);
    alert("Producto añadido!");
    setNewProduct({ name: "", price: "", category: "Pastelería" });
  };

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Panel de Control</h2>
          <p className="text-slate-500 font-medium">Gestiona tus productos y ventas</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-right">
          <span className="text-xs font-bold text-slate-400 uppercase block">Caja de Hoy</span>
          <span className="text-4xl font-black text-green-600">{dailyTotal.toFixed(2)}€</span>
        </div>
      </header>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold mb-6">Nuevo Producto</h3>
        <div className="flex gap-4">
          <input 
            type="text" placeholder="Nombre" className="flex-1 p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100"
            value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
          />
          <input 
            type="number" placeholder="Precio" className="w-32 p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100"
            value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
          />
          <button onClick={saveProduct} className="bg-slate-800 text-white px-8 rounded-2xl font-bold hover:bg-orange-500 transition-colors">Añadir</button>
        </div>
      </div>
    </div>
  );
}