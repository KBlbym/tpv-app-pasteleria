import { useState, useEffect } from 'react';
export default function HistorySectionZ({ settings }) {
    const [localSettings, setLocalSettings] = useState(settings);
    const [history, setHistory] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const data = await window.electronAPI.getArchivedHistory();
        setHistory(data || []);
    };

    const handleViewDetail = async (date) => {
        const report = await window.electronAPI.getPastZReport(date);
        setSelectedReport(report);
    };
    const handlePrintReport = async () => {
        try {
            await window.electronAPI.printReportZ(selectedReport);
            alert("Imprimiendo reporte...");
        } catch (err) {
            alert("Error al imprimir: " + err.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tighter">Auditoría de Cierres (Z)</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Historial de jornadas finalizadas y archivadas</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="p-6">Fecha Jornada</th>
                                <th className="p-6 text-center">Turnos</th>
                                <th className="p-6 text-right">Efectivo Total</th>
                                <th className="p-6 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.map((row) => (
                                <tr key={row.date} className="hover:bg-slate-50 transition-all">
                                    <td className="p-6 font-bold text-slate-700">{row.date}</td>
                                    <td className="p-6 text-center">
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">
                                            {row.session_count} SESIONES
                                        </span>
                                    </td>
                                    <td className="p-6 text-right font-black text-slate-900 text-lg">
                                        {row.total_cash.toFixed(2)}€
                                    </td>
                                    <td className="p-6 text-right">
                                        <button
                                            onClick={() => handleViewDetail(row.date)}
                                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-orange-500 transition-all"
                                        >
                                            Ver Reporte
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reutilizamos el Modal de Ticket Z que ya tenemos */}
            {selectedReport && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="p-8 border-b border-dashed border-slate-200 text-center">
                            <h3 className="font-black text-xl uppercase tracking-tighter">Reporte Z Histórico</h3>
                            {/* Cabecera Fiscal */}
                            <div className="text-center space-y-1 mb-6">
                                <h2 className="font-black text-xl uppercase tracking-tighter">{settings.business_name}</h2>
                                <p className="text-[11px] font-bold">NIF: {settings.business_nif}</p>
                                <p className="text-[11px]">{settings.business_address}</p>
                                <p className="text-[11px]">TEL: {settings.business_phone}</p>
                            </div>

                            <p className="text-[10px] text-slate-400 font-mono mt-1">{selectedReport.date}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 font-mono text-sm space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span>TOTAL VENTAS:</span>
                                <span className="font-black">{selectedReport.total_sales.toFixed(2)}€</span>
                            </div>

                            {/* NUEVO: DESGLOSE POR MÉTODO DE PAGO */}
                            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Desglose de Pagos</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>💵 EFECTIVO:</span>
                                    <span className="font-bold">{selectedReport.totals_by_method?.CASH.toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>💳 TARJETA:</span>
                                    <span className="font-bold">{selectedReport.totals_by_method?.CARD.toFixed(2)}€</span>
                                </div>
                            </div>
                            {/* LISTADO DE SESIONES (TURNOS) */}
                            <div className="pt-2 space-y-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Detalle por Turno
                                </div>
                                {selectedReport.sessions.map(s => (
                                    <div key={s.id} className="text-xs border-b border-slate-50 py-2">
                                        <div className="flex justify-between font-bold text-slate-700">
                                            <span>👤 {s.user_name}</span>
                                            {/* Aquí mostramos la venta real de esa sesión */}
                                            <span>{(s.closing_cash - s.initial_cash).toFixed(2)}€</span>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-slate-400">
                                            <span>Arqueo Físico: {s.closing_cash.toFixed(2)}€</span>
                                            <span>Fondo: {s.initial_cash.toFixed(2)}€</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex gap-2 rounded-b-[2rem]">
                            <button onClick={() => setSelectedReport(null)} className="flex-1 py-3 font-bold text-slate-400 text-xs uppercase">Cerrar</button>
                            <button
                                onClick={() => handlePrintReport()}
                                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-black text-xs uppercase"
                            >
                                🖨️ Re-imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}