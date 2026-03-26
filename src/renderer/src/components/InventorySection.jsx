import { useState } from 'react';

export default function InventorySection({ products, categories, onRefresh }) {
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category_id: '', image_path: '' });
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', image_path: '' });
  const [showCatForm, setShowCatForm] = useState(false);

  const isUpdate = products.some(p => p.name.toLowerCase() === newProduct.name.toLowerCase());

  // --- LÓGICA DE IMÁGENES ---
  const handleImageUpload = async (e, type) => {
    console.log("Subiendo imagen para:", e.target.files[0]);
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result; // Esto es un ArrayBuffer (los datos puros de la imagen)
      const fileName = file.name;   // El nombre original del archivo

      try {
        // Enviamos el contenido y el nombre al proceso principal
        const savedFileName = await window.electronAPI.uploadImage({ buffer, fileName });

        if (savedFileName) {
          if (type === 'product') {
            setNewProduct({ ...newProduct, image_path: savedFileName });
          } else {
            setNewCategory({ ...newCategory, image_path: savedFileName });
          }
        }
      } catch (error) {
        console.error("Error al subir:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  //#region Category handlers
  // --- GUARDAR CATEGORÍA ---
  const saveCategory = async () => {
    if (!newCategory.name) return alert("Nombre obligatorio");

    try {
      if (newCategory.id) {
        // Si tiene ID, estamos editando
        await window.electronAPI.updateCategory(newCategory);
      } else {
        // Si no, estamos creando
        await window.electronAPI.addCategory(newCategory);
      }
      setNewCategory({ name: '', icon: '', image_path: '' });
      onRefresh();
      setShowCatForm(false);
    } catch (error) {
      alert(error.message); // Aquí saldrá "Ya existe una categoría..."
    }
  };

  const handleEditCategory = (cat) => {
    setNewCategory(cat);
    setShowCatForm(true);
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("¿Estás seguro de borrar esta categoría?")) {
      try {
        await window.electronAPI.deleteCategory(id);
        onRefresh();
      } catch (error) {
        alert(error.message); // Aquí saldrá "No puedes borrar..."
      }
    }
  };
  //#endregion
  // --- GUARDAR PRODUCTO ---
  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
      alert("Rellena todos los campos.");
      return;
    }

    const existingProduct = products.find(
      (p) => p.name.toLowerCase() === newProduct.name.toLowerCase()
    );

    if (existingProduct) {
      const confirmUpdate = window.confirm(
        `¿Deseas actualizar "${existingProduct.name}" a ${parseFloat(newProduct.price).toFixed(2)}€ e imagen nueva?`
      );

      if (confirmUpdate) {
        await window.electronAPI.updateProduct({
          ...newProduct,
          id: existingProduct.id,
          price: parseFloat(newProduct.price)
        });
        setNewProduct({ name: '', price: '', category_id: '', image_path: '' });
        onRefresh();
      }
      return;
    }

    await window.electronAPI.addProduct(newProduct);
    setNewProduct({ name: '', price: '', category_id: '', image_path: '' });
    onRefresh();
  };

  const handleToggle = async (product) => {
    const newStatus = product.active === 1 ? 0 : 1;
    await window.electronAPI.toggleProduct({ id: product.id, status: newStatus });
    onRefresh();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* --- SECCIÓN CATEGORÍAS --- */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">📁 Gestión de Categorías</h3>
          <button
            onClick={() => setShowCatForm(!showCatForm)}
            className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition-all"
          >
            {showCatForm ? 'Cerrar' : '+ Nueva Categoría'}
          </button>
        </div>

        {showCatForm && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 rounded-2xl animate-in slide-in-from-top-2">
            <input
              type="text" placeholder="Nombre (Ej: Bebidas)"
              className="p-3 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              value={newCategory.name}
              onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <input
              type="text" placeholder="Emoji/Icono"
              className="p-3 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              value={newCategory.icon}
              onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
            />
            <div className="relative">
              <input
                type="file" accept="image/*"
                onChange={(e) => handleImageUpload(e, 'category')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="p-3 rounded-xl bg-white ring-1 ring-slate-200 text-xs font-bold text-slate-500 text-center">
                {newCategory.image_path ? '✅ Imagen Lista' : '🖼️ Subir Foto'}
              </div>
            </div>
            <button onClick={saveCategory} className="bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900">
              Guardar Categoría
            </button>
          </div>
        )}

        {/* CONTENEDOR DE LISTA DE CATEGORÍAS */}
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {categories.map((c) => (
            <div
              key={c.id}
              className="group relative flex-shrink-0 flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
            >
              {/* MINIATURA DE IMAGEN / ICONO */}
              <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-200">
                {c.image_path ? (
                  <img
                    src={`safe-protocol://${c.image_path}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    alt=""
                  />
                ) : (
                  <span className="text-xl">{c.icon || '📁'}</span>
                )}
              </div>

              {/* INFO DE CATEGORÍA */}
              <div className="flex flex-col pr-8"> {/* Padding derecho para dejar espacio a los botones */}
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">
                  Categoría
                </span>
                <span className="text-sm font-black text-slate-700 leading-none">
                  {c.name}
                </span>
              </div>

              {/* BOTONES DE ACCIÓN (Aparecen al hacer hover) */}
              <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm pl-2 rounded-lg">
                <button
                  onClick={() => handleEditCategory(c)}
                  className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                  title="Editar nombre o imagen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                  title="Eliminar categoría"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* BADGE DE ICONO (Detalle estético si hay imagen) */}
              {c.image_path && (
                <div className="absolute -top-1 -left-1 bg-white shadow-sm border border-slate-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">
                  {c.icon}
                </div>
              )}
            </div>
          ))}

          {/* BOTÓN RÁPIDO PARA AÑADIR (Si la lista está vacía o como acceso directo) */}
          {categories.length === 0 && (
            <p className="text-slate-400 text-sm italic py-2">No hay categorías. Crea la primera arriba.</p>
          )}
        </div>
      </div>

      {/* --- SECCIÓN PRODUCTOS --- */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6">🍎 Inventario de Productos</h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10 items-end">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Producto e Imagen</label>
            <div className="flex gap-2">
              <input
                type="text" placeholder="Nombre del producto"
                className={`flex-1 p-3 rounded-xl bg-slate-50 ring-1 outline-none transition-all ${isUpdate ? 'ring-blue-500' : 'ring-slate-200'}`}
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
              <div className="relative w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-orange-500 transition-all">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'product')} />
                {newProduct.image_path ? '📸' : '➕'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Precio (€)</label>
            <input
              type="number" placeholder="0.00"
              className="w-full p-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 outline-none"
              value={newProduct.price}
              onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Categoría</label>
            <select
              className="w-full p-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 outline-none"
              value={newProduct.category_id}
              onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <button
            onClick={saveProduct}
            className={`h-[52px] rounded-xl font-black text-xs uppercase tracking-widest transition-all text-white ${isUpdate ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-100'}`}
          >
            {isUpdate ? 'Actualizar' : 'Guardar'}
          </button>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="p-5">Visual</th>
                <th className="p-5">Detalles</th>
                <th className="p-5">Categoría</th>
                <th className="p-5 text-right">Precio</th>
                <th className="p-5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => (
                <tr key={p.id} className={`${p.active === 0 ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/80 transition-colors'}`}>
                  <td className="p-5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
                      {p.image_path ? (
                        <img
                          src={`safe-protocol://${p.image_path}`}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => console.error("Error cargando imagen:", e.target.src)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                      )}
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="font-black text-slate-700">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SKU: {p.id.toString().padStart(4, '0')}</p>
                  </td>
                  <td className="p-5">
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-500 uppercase">
                      {p.category_name}
                    </span>
                  </td>
                  <td className="p-5 text-right font-mono font-black text-orange-600 text-lg">{p.price.toFixed(2)}€</td>
                  <td className="p-5 text-center">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`text-2xl hover:scale-110 transition-transform`}
                    >
                      {p.active === 1 ? '✅' : '❌'}
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