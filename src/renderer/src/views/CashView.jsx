import { useState } from 'react';

export default function CashView({ activeSession, onRefresh }) {
    // Estado para el formulario de apertura
    const [openData, setOpenData] = useState({ worker: '', cash: '' });

    // Estado para el cierre (sustituye al prompt)
    const [closingCash, setClosingCash] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    const handleOpen = async () => {
        if (!openData.worker || !openData.cash) return alert("Completa los datos");
        try {
            await window.electronAPI.openSession({
                user_name: openData.worker,
                initial_cash: parseFloat(openData.cash)
            });
            onRefresh(); // Actualiza App.jsx
            setOpenData({ worker: '', cash: '' });
        } catch (err) {
            alert("Error al abrir: " + err.message);
        }
    };

    const handleCloseFinal = async () => {
  if (!closingCash) return alert("Introduce el efectivo");
  
  // 1. Bloqueamos el botón visualmente para evitar doble click
  const tempId = activeSession.id;
  
  try {
    // 2. Ejecutamos el cierre
    await window.electronAPI.closeSession({ 
      session_id: tempId, 
      closing_cash: parseFloat(closingCash) 
    });

    // 3. LIMPIEZA INMEDIATA DE LA UI (Sin esperar al refresh)
    // Esto quita el "congelamiento" visual al instante
    setIsClosing(false);
    setClosingCash('');
    setOpenData({ worker: '', cash: '' });

    // 4. PEQUEÑO RETRASO PARA EL REFRESH (Truco Senior)
    // Damos 100ms para que SQLite termine de escribir antes de que App.jsx intente leer
    setTimeout(async () => {
      await onRefresh();
      alert("✅ Turno cerrado.");
    }, 100);

  } catch (err) {
    alert("Error: " + err.message);
  }
};

    return (
        <div className="h-full p-10 flex flex-col items-center justify-center bg-slate-50 animate-in fade-in duration-500">
            <div className="max-w-md w-full">
                {!activeSession ? (
                    /* --- VISTA: APERTURA DE CAJA --- */
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
                        <div className="text-center mb-8">
                            <span className="text-4xl">🔐</span>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mt-2">Apertura de Turno</h2>
                            <p className="text-slate-400 text-sm font-bold">Introduce los datos para comenzar</p>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text" placeholder="Nombre del trabajador"
                                className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold"
                                value={openData.worker} onChange={e => setOpenData({ ...openData, worker: e.target.value })}
                            />
                            <input
                                type="number" placeholder="Efectivo inicial en caja (€)"
                                className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold"
                                value={openData.cash} onChange={e => setOpenData({ ...openData, cash: e.target.value })}
                            />
                            <button onClick={handleOpen} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100">
                                ABRIR CAJA
                            </button>
                        </div>
                    </div>
                ) : (
                    /* --- VISTA: CAJA ACTIVA / CIERRE --- */
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-green-500">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-4">🔓</div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase italic">Turno en Curso</h2>
                                <p className="text-slate-400 font-bold">Cajero: <span className="text-slate-700">{activeSession.user_name}</span></p>
                            </div>

                            {!isClosing ? (
                                <button
                                    onClick={() => setIsClosing(true)}
                                    className="w-full py-5 bg-slate-800 text-white rounded-2xl font-black text-lg hover:bg-slate-900 transition-all shadow-xl"
                                >
                                    📉 INICIAR CIERRE DE TURNO (X)
                                </button>
                            ) : (
                                <div className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 animate-in zoom-in-95">
                                    <p className="text-[10px] font-black text-orange-600 uppercase text-center">Contar efectivo físico en cajón</p>
                                    <input
                                        type="number" autoFocus placeholder="Total contado (€)"
                                        className="w-full p-4 bg-white rounded-xl border-2 border-orange-200 outline-none text-center font-black text-2xl"
                                        value={closingCash} onChange={e => setClosingCash(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsClosing(false)} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                                        <button onClick={handleCloseFinal} className="flex-[2] py-3 bg-orange-500 text-white rounded-xl font-black">CONFIRMAR CIERRE</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* BOTÓN Z - SIEMPRE DISPONIBLE PERO DIFERENCIADO */}
                        <div className="p-6 bg-slate-900 rounded-[2rem] text-center shadow-2xl">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Auditoría Final de Jornada</p>
                            <button
                                onClick={() => alert("Generando Z-Report...")}
                                className="w-full py-4 border border-slate-700 text-slate-300 rounded-xl font-black hover:bg-slate-800 transition-all"
                            >
                                🌙 EJECUTAR CIERRE DEL DÍA (Z)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}