export default function CashManager({ activeSession, onRefresh }) {
  const [amount, setAmount] = useState('');
  const [userName, setUserName] = useState('');

  return (
    <div className="p-6 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
      <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Control de Caja</h2>

      {!activeSession ? (
        /* --- ESTADO: CAJA CERRADA --- */
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-blue-700 font-bold text-sm">No hay sesión activa. Abra una para empezar a vender.</p>
          </div>
          <input 
            type="text" placeholder="Nombre del trabajador"
            className="w-full p-4 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
            value={userName} onChange={e => setUserName(e.target.value)}
          />
          <input 
            type="number" placeholder="Efectivo inicial (€)"
            className="w-full p-4 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
            value={amount} onChange={e => setAmount(e.target.value)}
          />
          <button 
            onClick={handleOpenSession}
            className="w-full py-4 bg-green-500 text-white rounded-2xl font-black hover:bg-green-600 transition-all"
          >
            🚀 ABRIR TURNO
          </button>
        </div>
      ) : (
        /* --- ESTADO: CAJA ABIERTA --- */
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-green-600 uppercase">Sesión activa</p>
              <p className="font-bold text-slate-700">{activeSession.user_name}</p>
            </div>
            <p className="text-xs font-mono text-slate-500">{activeSession.start_time}</p>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-2xl">
            <label className="text-[10px] font-black text-slate-400 uppercase">Contar efectivo al cierre</label>
            <input 
              type="number" placeholder="¿Cuánto dinero hay físicamente?"
              className="w-full mt-2 p-4 rounded-xl bg-white border-none ring-1 ring-slate-200"
              value={amount} onChange={e => setAmount(e.target.value)}
            />
          </div>

          <button 
            onClick={handleCloseTurn}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            📉 CERRAR TURNO (X)
          </button>
        </div>
      )}

      {/* SIEMPRE VISIBLE */}
      <button 
        onClick={handleZReport}
        className="w-full mt-8 py-4 border-2 border-slate-800 text-slate-800 rounded-2xl font-black hover:bg-slate-800 hover:text-white transition-all"
      >
        🌙 EJECUTAR CIERRE DE JORNADA (Z)
      </button>
    </div>
  );
}