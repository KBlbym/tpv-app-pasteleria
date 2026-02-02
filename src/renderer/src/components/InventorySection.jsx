import { useState } from 'react';

export default function InventorySection({ products, categories, onRefresh }) {
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category_id: '' });

  const isUpdate = products.some(p => p.name.toLowerCase() === newProduct.name.toLowerCase());

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
      alert("Rellena todos los campos.");
      return;
    }

    // 1. Buscamos si el producto ya existe (ignorando mayúsculas)
    const existingProduct = products.find(
      (p) => p.name.toLowerCase() === newProduct.name.toLowerCase()
    );

    if (existingProduct) {
      // 2. Si existe, preguntamos si quiere actualizar el precio
      const confirmUpdate = window.confirm(
        `El producto "${existingProduct.name}" ya existe con un precio de ${existingProduct.price.toFixed(2)}€. ¿Deseas actualizarlo al nuevo precio de ${parseFloat(newProduct.price).toFixed(2)}€?`
      );

      if (confirmUpdate) {
        const priceToUpdate = parseFloat(newProduct.price);
        const nameToUpdate = existingProduct.name;

        setNewProduct({ name: '', price: '', category_id: '' }); // Limpiamos el formulario
        window.electronAPI.updateProductPrice({
          name: nameToUpdate,
          price: priceToUpdate
        }).then(() => {
          onRefresh(); // Refrescamos la lista cuando termine, en segundo plano
        });
      }
      return; // Salimos para no intentar crear uno nuevo
    }

    // 3. Si no existe, lo creamos normalmente
    await window.electronAPI.addProduct(newProduct);
    setNewProduct({ name: '', price: '', category_id: '' });
    onRefresh();

  };

  const handleToggle = async (product) => {
    const newStatus = product.active === 1 ? 0 : 1;
    const accion = newStatus === 0 ? "desactivar" : "activar";

    if (window.confirm(`¿Quieres ${accion} el producto "${product.name}"?`)) {
      await window.electronAPI.toggleProduct({ id: product.id, status: newStatus });
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold mb-4">Añadir Nuevo Producto</h3>
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Nombre"
            className={`flex-1 p-3 rounded-xl bg-slate-50 ring-1 outline-none transition-all ${products.some(p => p.name.toLowerCase() === newProduct.name.toLowerCase())
              ? 'ring-red-500 bg-red-50' // Si existe, se pone rojo
              : 'ring-slate-200 focus:ring-2 focus:ring-orange-500'
              }`}
            value={newProduct.name}
            onChange={(e) => {
              console.log("Escribiendo:", e.target.value); // Si esto no sale en consola, el render está bloqueado
              setNewProduct({ ...newProduct, name: e.target.value });
            }}
          />
          <input
            type="number" placeholder="Precio"
            className="w-32 p-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
            value={newProduct.price}
            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
          />
          <select
            className="p-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
            value={newProduct.category_id}
            onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}
          >
            <option value="">Categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button
            onClick={saveProduct}
            className={`px-6 rounded-xl font-bold transition-all text-white ${isUpdate ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'
              }`}
          >
            {isUpdate ? '🔄 Actualizar Precio' : '+ Añadir Producto'}
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4 text-right">Precio</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className={`border-t ${p.active === 0 ? 'bg-slate-100 opacity-60' : 'hover:bg-slate-50'}`}>
                  <td className="p-4 font-bold text-slate-700">{p.name} {p.active === 0 && <span className="text-[10px] text-red-500 font-black">(INACTIVO)</span>}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">
                      {p.category_name}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-orange-600">{p.price.toFixed(2)}€</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`p-2 rounded-lg transition-all ${p.active === 1 ? 'text-green-500 hover:bg-green-100' : 'text-slate-400 hover:bg-slate-200'}`}
                      title={p.active === 1 ? "Desactivar" : "Activar"}
                    >
                      {p.active === 1 ? '🟢' : '⚪'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}