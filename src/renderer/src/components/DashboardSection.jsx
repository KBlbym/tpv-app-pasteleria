export default function DashboardSection({ dailyTotal, productCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <span className="text-3xl">💰</span>
        <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Caja de Hoy</h4>
        <p className="text-4xl font-black text-slate-800 mt-2">{dailyTotal.toFixed(2)}€</p>
      </div>
      
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <span className="text-3xl">🥯</span>
        <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Productos en Carta</h4>
        <p className="text-4xl font-black text-slate-800 mt-2">{productCount}</p>
      </div>

      <div className="bg-orange-500 p-8 rounded-[2.5rem] shadow-lg shadow-orange-200 text-white">
        <span className="text-3xl">🚀</span>
        <h4 className="text-orange-100 font-bold uppercase text-[10px] tracking-widest mt-4">Estado Sistema</h4>
        <p className="text-2xl font-black mt-2 tracking-tighter uppercase">Funcionando</p>
      </div>
    </div>
  );
}