export default function DashboardSection({ dailyTotal, activeSessionTotal, productCount, dailyExpenses, activeExpenses, totalCash, totalCard }) {
  // Calculamos los netos (Ventas - Gastos)
  const dailyNet = dailyTotal - dailyExpenses;
  const sessionNet = activeSessionTotal - activeExpenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-700">

      {/* TARJETA 1: CAJA (ADAPTADA) */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Resumen de Caja
          </h4>
          <span className="text-xl">💰</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* COLUMNA DÍA */}
          <div className="space-y-2">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">Ventas Día</p>
              <p className="text-2xl font-black text-slate-800">{dailyTotal.toFixed(2)}€</p>
              <div className="px-2">
                <p className="text-[9px] font-bold text-green-400 uppercase">Visa: {totalCard.toFixed(2)}€</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase">Cash: {totalCash.toFixed(2)}€</p>
              </div>
            </div>
            {/* Gasto acumulado del día */}
            <div className="px-2">
              <p className="text-[9px] font-bold text-red-400 uppercase">Gastos: -{dailyExpenses.toFixed(2)}€</p>
              <p className="text-[10px] font-black text-green-600 uppercase">Neto: {dailyNet.toFixed(2)}€</p>
            </div>
          </div>

          {/* COLUMNA TURNO */}
          <div className="space-y-2">
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p className="text-[10px] font-black text-orange-400 uppercase">Ventas Turno</p>
              <p className="text-2xl font-black text-orange-600">{activeSessionTotal.toFixed(2)}€</p>
              <div className="px-2">
                <p className="text-[9px] font-bold text-green-400 uppercase">Visa: {totalCard.toFixed(2)}€</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase">Cash: {totalCash.toFixed(2)}€</p>
              </div>
            </div>
            {/* Gasto de la sesión activa */}
            <div className="px-2">
              <p className="text-[9px] font-bold text-red-400 uppercase">Gastos: -{activeExpenses.toFixed(2)}€</p>
              <p className="text-[10px] font-black text-orange-500 uppercase">Neto: {sessionNet.toFixed(2)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 2: PRODUCTOS (TUS DISEÑO ORIGINAL) */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <span className="text-3xl">🥯</span>
        <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Productos en Carta</h4>
        <p className="text-4xl font-black text-slate-800 mt-2">{productCount}</p>
      </div>

      {/* TARJETA 3: ESTADO (TUS DISEÑO ORIGINAL) */}
      <div className="bg-orange-500 p-8 rounded-[2.5rem] shadow-lg shadow-orange-200 text-white">
        <span className="text-3xl">🚀</span>
        <h4 className="text-orange-100 font-bold uppercase text-[10px] tracking-widest mt-4">Estado Sistema</h4>
        <p className="text-2xl font-black mt-2 tracking-tighter uppercase">Funcionando</p>
      </div>

    </div>
  );
}