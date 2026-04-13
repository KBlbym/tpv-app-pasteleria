export default function DashboardSection({ dailyTotal, activeSessionTotal, productCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-700">
      
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">

  <div className="flex justify-between items-center mb-6">
    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
      Caja
    </h4>
    <span className="text-xl">💰</span>
  </div>

  <div className="grid grid-cols-2 gap-4">

    {/* DÍA */}
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-[10px] font-black text-slate-400 uppercase">
        Día
      </p>
      <p className="text-2xl font-black text-slate-800">
        {dailyTotal.toFixed(2)}€
      </p>
    </div>

    {/* TURNO */}
    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
      <p className="text-[10px] font-black text-orange-400 uppercase">
        Turno
      </p>
      <p className="text-2xl font-black text-orange-600">
        {activeSessionTotal.toFixed(2)}€
      </p>
    </div>

  </div>
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