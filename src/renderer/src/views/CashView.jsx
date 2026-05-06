import { useState } from 'react';

export default function CashView({ activeSession, onRefresh }) {
    const [openData, setOpenData] = useState({ worker: '', cash: '' });
    const [closingCash, setClosingCash] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    // Estados nuevos para el Cierre Z unificado
    const [isClosingZ, setIsClosingZ] = useState(false);
    const [zClosingCash, setZClosingCash] = useState('');
    const [xReportPreview, setXReportPreview] = useState(null);
    const [zReportPreview, setZReportPreview] = useState(null);

    // Añadir un estado para el formulario de gastos
    const [expense, setExpense] = useState({ amount: '', desc: '' });

    const handleAddExpense = async () => {
        if (!expense.amount || !expense.desc) return alert("Indica importe y concepto");
        await window.electronAPI.registerExpense({
            session_id: activeSession.id,
            amount: parseFloat(expense.amount),
            description: expense.desc
        });
        setExpense({ amount: '', desc: '' });
        alert("Gasto registrado correctamente");
        onRefresh(); // Para actualizar el "esperado"
    };

    const handleGenerateZ = async () => {
        try {
            const data = await window.electronAPI.getZReport();
            if (!data.sessions || data.sessions.length === 0) {
                alert("No hay sesiones cerradas para generar un reporte Z.");
                return;
            }
            setZReportPreview(data);
        } catch (err) {
            alert("Error al obtener datos Z: " + err.message);
        }
    };


    // Función para Cierre Z + Cierre de Sesión Activa (Formulario final)
    const handleZWithActiveSession = async () => {
        if (!zClosingCash) return alert("Introduce el efectivo total");
        const amount = parseFloat(zClosingCash);

        // Validamos descuadre solo como aviso
        const proceed = await validateCashGap(activeSession.id, amount);
        if (!proceed) return;

        try {
            const data = await window.electronAPI.closeDayAndSession({
                session_id: activeSession.id,
                closing_cash: amount
            });
            setZReportPreview(data);
            setIsClosingZ(false);
            setZClosingCash('');
            onRefresh();
        } catch (err) { alert("Error: " + err.message); }
    };


    const confirmZReport = async () => {
        if (confirm("¿Estás seguro? Esto archivará todas las sesiones del día.")) {
            try {
                const idsToArchive = zReportPreview.sessions.map(s => s.id);
                await window.electronAPI.archiveSessions(idsToArchive);
                alert("✅ Jornada finalizada y archivada.");
                setZReportPreview(null);
                onRefresh();
            } catch (err) {
                alert("Error: " + err.message);
            }
        }
    };


    const handleOpen = async () => {
        if (!openData.worker || !openData.cash) return alert("Completa los datos");
        try {
            await window.electronAPI.openSession({
                user_name: openData.worker,
                initial_cash: parseFloat(openData.cash)
            });
            onRefresh();
            setOpenData({ worker: '', cash: '' });
        } catch (err) {
            alert("Error al abrir: " + err.message);
        }
    };


    const handleCloseFinal = async () => {
        if (!closingCash) return alert("Introduce el efectivo");
        const amount = parseFloat(closingCash);

        // Validamos descuadre
        const proceed = await validateCashGap(activeSession.id, amount);
        if (!proceed) return;

        try {
            // 1. Cerramos la sesión en DB
            await window.electronAPI.closeSession({
                session_id: activeSession.id,
                closing_cash: amount
            });

            // 2. Obtenemos datos para la vista previa del Reporte X
            debugger;
            const reportX = await window.electronAPI.getXReport(activeSession.id);

            // 3. Mostramos el modal y limpiamos estados
            setXReportPreview(reportX);
            setIsClosing(false);
            setClosingCash('');
            // Nota: El onRefresh() se llama al cerrar el modal del Reporte X
        } catch (err) {
            alert("Error al cerrar turno: " + err.message);
        }
    };

    ///##############################///
    //===== VALIDACIONES Y FUNCIONES AUXILIARES =====//
    ///##############################///



    // --- CIERRE X (Turno) ---
    const initCloseX = async () => {
        try {
            const hasSales = await window.electronAPI.checkSessionSales(activeSession.id);

            if (!hasSales) {
                //  preguntamos
                const confirmEmpty = confirm("⚠️ No has registrado ventas en este turno. ¿Deseas cerrar el turno de todas formas?");
                if (!confirmEmpty) return;
            }

            setIsClosing(true);
        } catch (err) {
            setIsClosing(true); // Si hay error en la validación, dejamos cerrar igual
        }
    };

    // --- CIERRE Z (Jornada) ---
    const initCloseZ = async () => {
        try {
            let hasActivity = false;

            if (activeSession) {
                hasActivity = await window.electronAPI.checkSessionSales(activeSession.id);
            } else {
                hasActivity = await window.electronAPI.checkPendingZSales();
            }

            if (!hasActivity) {
                const confirmEmptyZ = confirm("📝 La jornada no tiene ventas registradas. ¿Deseas generar el reporte Z de " + (activeSession ? "cierre de día" : "sesiones cerradas") + " igualmente?");
                if (!confirmEmptyZ) return;
            }

            setIsClosingZ(true);
        } catch (err) {
            setIsClosingZ(true);
        }
    };

    // Función auxiliar para validar el descuadre
    const validateCashGap = async (sessionId, enteredCash) => {
        const expected = await window.electronAPI.getExpectedCash(sessionId);
        const gap = Math.abs(expected - enteredCash);

        // Si el descuadre es mayor a 0.01€ (por aquello de los decimales)
        if (gap > 0.01) {
            return confirm(
                `⚠️ ATENCIÓN: DESCUADRE DE CAJA\n\n` +
                `Esperado: ${expected.toFixed(2)}€\n` +
                `Contado: ${enteredCash.toFixed(2)}€\n` +
                `Diferencia: ${(enteredCash - expected).toFixed(2)}€\n\n` +
                `¿Deseas continuar con el cierre de todas formas?`
            );
        }
        return true; // Si todo coincide, adelante
    };
    ///##############################///
    //===== FIN VALIDACIONES Y FUNCIONES AUXILIARES =====//
    ///##############################///

    return (
        <div className="h-full p-10 flex flex-col items-center justify-center bg-slate-100 animate-in fade-in duration-500 relative overflow-hidden">
            <div className="max-w-md w-full z-10">
                {!activeSession ? (
                    /* --- VISTA: APERTURA --- */
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
                        <div className="text-center mb-8">
                            <div className="text-5xl mb-4">🏪</div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Nueva Jornada</h2>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Cajero" className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-orange-500 font-bold" value={openData.worker} onChange={e => setOpenData({ ...openData, worker: e.target.value })} />
                            <input type="number" placeholder="Fondo de Caja (€)" className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-orange-500 font-bold" value={openData.cash} onChange={e => setOpenData({ ...openData, cash: e.target.value })} />
                            <button onClick={handleOpen} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-lg">INICIAR TURNO</button>
                        </div>
                    </div>
                ) : (
                    /* --- VISTA: CAJA ACTIVA --- */
                    <div className="space-y-6">

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-green-500 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sesión Activa</p>
                            <h2 className="text-3xl font-black text-slate-800 mb-6 underline decoration-green-500 underline-offset-4">{activeSession.user_name}</h2>

                            {/* --- NUEVA SECCIÓN DE GASTOS --- */}
                            {!isClosing && (
                                <div className="mb-6 p-6 bg-red-50/50 rounded-[2rem] border border-red-100 space-y-3 text-left">
                                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-wider">Registrar Salida de Dinero</h4>
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            placeholder="Importe €"
                                            className="w-full p-3 bg-white rounded-xl outline-none border border-red-100 focus:border-red-400 font-bold text-red-600"
                                            value={expense.amount}
                                            onChange={e => setExpense({ ...expense, amount: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Concepto (Ej: Proveedor fruta)"
                                            className="w-full p-3 bg-white rounded-xl outline-none border border-red-100 focus:border-red-400 text-sm"
                                            value={expense.desc}
                                            onChange={e => setExpense({ ...expense, desc: e.target.value })}
                                        />
                                        <button
                                            onClick={handleAddExpense}
                                            className="w-full py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase hover:bg-red-600 transition-all shadow-md shadow-red-200"
                                        >
                                            💸 Descontar de Caja
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* --- FIN SECCIÓN GASTOS --- */}

                            {!isClosing ? (
                                <button onClick={initCloseX} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black hover:bg-black transition-all">📉 CERRAR MI TURNO (X)</button>
                            ) : (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <input type="number" autoFocus placeholder="Contante en caja (€)" className="w-full p-4 bg-orange-50 rounded-2xl border-2 border-orange-200 outline-none text-center font-black text-2xl" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsClosing(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancelar</button>
                                        <button onClick={handleCloseFinal} className="flex-[2] py-3 bg-orange-500 text-white rounded-xl font-black">CONFIRMAR</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECCIÓN Z UNIFICADA */}
                        <div className="p-6 bg-slate-900 rounded-[2.5rem] text-center shadow-2xl">
                            {!isClosingZ ? (
                                <button onClick={initCloseZ} className="w-full py-4 text-orange-400 border-2 border-orange-400/30 rounded-2xl font-black hover:bg-orange-500 hover:text-white transition-all">🌙 CIERRE FINAL JORNADA (Z)</button>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-bottom-4 text-white">
                                    <p className="font-bold text-xs uppercase text-orange-400">Arqueo Final del Día</p>
                                    <input type="number" autoFocus placeholder="Total Efectivo (€)" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white text-center font-black text-3xl outline-none focus:border-orange-500" value={zClosingCash} onChange={e => setZClosingCash(e.target.value)} />
                                    <div className="flex gap-4">
                                        <button onClick={() => setIsClosingZ(false)} className="text-slate-500 font-bold uppercase text-xs">Atrás</button>
                                        <button onClick={handleZWithActiveSession} className="flex-1 py-3 bg-orange-600 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-orange-500">Generar Z</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL VISTA PREVIA REPORTE Z (DIARIO) --- */}
            {zReportPreview && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl flex flex-col animate-in zoom-in-95 max-h-[90vh]">

                        {/* Cabecera estilo Ticket */}
                        <div className="p-6 border-b border-dashed border-slate-200 text-center">
                            <h3 className="font-black text-xl uppercase italic">Cierre de Jornada (Z)</h3>
                            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mt-1">
                                {zReportPreview.date ? new Date(zReportPreview.date).toLocaleString() : '---'}
                            </p>
                        </div>

                        <div className="overflow-y-auto p-6 font-mono text-sm space-y-4">

                            {/* RESUMEN DE VENTAS */}
                            <div className="space-y-1 border-b pb-3">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>TOTAL VENTAS:</span>
                                    <span>{Number(zReportPreview.total_sales || 0).toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 italic">
                                    <span>OPERACIONES REALIZADAS:</span>
                                    <span>{zReportPreview.sales_count || 0} tickets</span>
                                </div>
                            </div>

                            {/* SECCIÓN DE GASTOS */}
                            {(zReportPreview.total_expenses || 0) > 0 && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-700">
                                    <p className="font-black text-[9px] uppercase mb-2 border-b border-red-200 pb-1">
                                        Gastos Pagados en la Jornada:
                                    </p>
                                    <div className="space-y-1">
                                        {(zReportPreview.expenses || []).map((exp, i) => (
                                            <div key={i} className="flex justify-between text-[10px]">
                                                <span className="truncate w-32">- {exp.description || 'Gasto'}</span>
                                                <span>-{Number(exp.amount || 0).toFixed(2)}€</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between font-black mt-2 border-t border-red-200 pt-1 text-xs">
                                        <span>TOTAL GASTOS:</span>
                                        <span>-{Number(zReportPreview.total_expenses || 0).toFixed(2)}€</span>
                                    </div>

                                    {/* NETO EN CAJA TRAS GASTOS (Aquí estaba el fallo principal) */}
                                    <div className="flex justify-between border-t-2 border-black mt-3 pt-2 text-sm font-black italic">
                                        <span>TOTAL NETO EFECTIVO:</span>
                                        <span className="text-blue-600">
                                            {(
                                                Number(zReportPreview.totals_by_method?.CASH || 0) -
                                                Number(zReportPreview.total_expenses || 0)
                                            ).toFixed(2)}€
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* DESGLOSE POR MÉTODO */}
                            <div className="py-3 px-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ventas por Método:</p>
                                <div className="flex justify-between">
                                    <span>Efectivo:</span>
                                    <span className="font-bold">{Number(zReportPreview.totals_by_method?.CASH || 0).toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tarjeta:</span>
                                    <span className="font-bold">{Number(zReportPreview.totals_by_method?.CARD || 0).toFixed(2)}€</span>
                                </div>
                            </div>

                            {/* DETALLE DE SESIONES/TURNOS */}
                            {/* DETALLE DE SESIONES/TURNOS */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase border-b pb-1">Turnos Incluidos:</p>
                                {(zReportPreview.sessions || []).map(s => (
                                    
                                    <div key={s.id} className="flex justify-between text-[11px] text-slate-600 py-1">
                                        <span className="uppercase font-semibold">{s.user_name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-400 uppercase">Ventas:</span>
                                            <span className="font-bold text-slate-900">
                                                {Number(s.net_cash || 0).toFixed(2)}€
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-dashed border-slate-200 text-center italic text-[10px] text-slate-400 uppercase tracking-widest">
                                *** Fin de Jornada Laboral ***
                            </div>
                        </div>

                        {/* BOTONES */}
                        <div className="p-4 bg-slate-50 flex gap-2 border-t">
                            <button
                                onClick={() => setZReportPreview(null)}
                                className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 text-xs uppercase hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmZReport}
                                className="flex-[2] py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-colors"
                            >
                                🖨️ Archivar Jornada
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- MODAL VISTA PREVIA REPORTE X --- */}
            {xReportPreview && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-dashed border-slate-200 text-center">
                            <h3 className="font-black text-xl uppercase italic">Arqueo de Turno (X)</h3>
                            <p className="text-[10px] text-slate-400 font-mono">ID SESIÓN: {xReportPreview.id}</p>
                        </div>

                        <div className="p-6 font-mono text-sm space-y-3">
                            <div className="flex justify-between font-bold text-lg border-b pb-2">
                                <span>EMPLEADO:</span>
                                <span>{xReportPreview.user_name}</span>
                            </div>

                            {/* VENTAS GENERALES */}
                            <div className="space-y-1">
                                <div className="flex justify-between"><span>FONDO INICIAL:</span><span>{xReportPreview.initial_cash.toFixed(2)}€</span></div>
                                <div className="flex justify-between font-bold"><span>TOTAL VENTAS:</span><span>{xReportPreview.total_sales.toFixed(2)}€</span></div>
                            </div>
                            {/* Sección de Gastos (Si existen) */}
                            {xReportPreview.total_expenses > 0 && (
                                <div className="bg-red-50 p-2 rounded-lg border border-red-100 text-red-700">
                                    <p className="font-black text-[9px] uppercase mb-1">Gastos Pagados:</p>
                                    {xReportPreview.expenses.map((exp, i) => (
                                        <div key={i} className="flex justify-between text-[10px]">
                                            <span className="truncate w-32">- {exp.description}</span>
                                            <span>-{exp.amount.toFixed(2)}€</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-black mt-1 border-t border-red-200 pt-1">
                                        <span>TOTAL GASTOS:</span>
                                        <span>-{xReportPreview.total_expenses.toFixed(2)}€</span>
                                    </div>
                                    {/* Resultado Final de Caja */}
                                    <div className="flex justify-between border-t-2 border-black pt-2 text-sm font-black italic">
                                        <span>ENTREGAR EN EFECTIVO:</span>
                                        <span className="text-blue-600">{xReportPreview.expected_cash.toFixed(2)}€</span>
                                    </div>
                                </div>

                            )}
                            {/* NUEVO: DESGLOSE POR MÉTODO (X) */}
                            <div className="py-2 px-3 bg-orange-50/50 rounded-xl border border-orange-100 space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span>Efectivo (Ventas):</span>
                                    <span>{xReportPreview.totals_by_method?.CASH?.toFixed(2) || "0.00"}€</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tarjeta:</span>
                                    <span>{xReportPreview.totals_by_method?.CARD?.toFixed(2) || "0.00"}€</span>
                                </div>
                            </div>

                            {/* ARQUEO FINAL */}
                            <div className="flex justify-between border-t pt-2 text-slate-500">
                                <span>ESPERADO CAJA:</span>
                                <span>{xReportPreview.expected_cash.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between font-black text-orange-600 text-lg">
                                <span>CONTADO:</span>
                                <span>{xReportPreview.closing_cash.toFixed(2)}€</span>
                            </div>

                            <div className="flex justify-between border-t border-dashed pt-2 font-bold italic text-slate-700">
                                <span>DIFERENCIA:</span>
                                <span className={(xReportPreview.closing_cash - xReportPreview.expected_cash) < 0 ? "text-red-600" : "text-green-600"}>
                                    {(xReportPreview.closing_cash - xReportPreview.expected_cash).toFixed(2)}€
                                </span>
                            </div>
                        </div>
                        {/* ... botones ... */}
                        <div className="p-4 bg-slate-50 flex flex-col gap-2">
                            <button onClick={() => { setXReportPreview(null); onRefresh(); }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest">
                                🖨️ IMPRIMIR Y FINALIZAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}