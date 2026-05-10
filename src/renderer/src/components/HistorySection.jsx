import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function HistorySection() {
  // Estados para datos
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({ topProducts: [], busyHour: null });
  const [chartData, setChartData] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [items, setItems] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHourModal, setShowHourModal] = useState(false);
  const [hourMetric, setHourMetric] = useState('count'); // 'count' o 'total_amount'
  // Estados para filtros
  const [topLimit, setTopLimit] = useState(5);
  const today = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [businessSummary, setBusinessSummary] = useState({ today: 0, weekly: 0, monthly: 0, avgTicket: 0 });
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      const summary = await window.electronAPI.getBusinessSummary(); // Añade este canal al preload
      setBusinessSummary(summary);
      console.log("summary:", businessSummary); // Log para verificar la estructura de los datos
    };
    loadSummary();
  }, [sales]); // Se actualiza cuando cambian las ventas

  // 1.  useEffect para que sea más específico
  useEffect(() => {
    loadStats(topLimit);
  }, [topLimit]);

  // 2. Efecto aparte para la carga inicial de ventas (solo al montar el componente)
  useEffect(() => {
    handleFilter();
  }, []);

  const openPreview = (title, data) => {
    if (!data || !data.details) return;

    console.log("Datos recibidos para el reporte:", data); // Log para verificar la estructura de los datos

    const { details } = data;

    // Mapeamos directamente lo que viene del backend
    const employeeMetrics = details.employees.map(emp => ({
      name: emp.user_name,
      total: emp.total || 0,
      cash: emp.cash || 0,   // Ya viene calculado del SQL
      card: emp.card || 0    // Ya viene calculado del SQL
    }));

    setSelectedReport({
      title: title,
      date: new Date().toLocaleString(),
      total_sales: data.total || 0,
      totals_by_method: {
        CASH: details.payments?.find(p => p.payment_method === 'CASH')?.total || 0,
        CARD: details.payments?.find(p => p.payment_method === 'CARD')?.total || 0
      },
      expenses: details.expenses || 0,
      employees: employeeMetrics
    });
  };
  // 3. función dedicada solo a las estadísticas
  const loadStats = async (limit) => {
    const s = await window.electronAPI.getStats(limit);
    setStats(s);
  };

  const handleFilter = async () => {
    const range = {
      start: `${dateRange.start} 00:00:00`,
      end: `${dateRange.end} 23:59:59`
    };
    const data = await window.electronAPI.getSalesRange(range);
    const chart = await window.electronAPI.getDailySalesChart(range);


    // Formateamos la fecha para que el gráfico se vea limpio (DD/MM)
    const formattedChart = chart.map(d => ({
      ...d,
      displayDate: d.day.split('-').reverse().slice(0, 2).join('/')
    }));
    setSales(data);
    setChartData(formattedChart);

    // FORZAR RECARGA DEL RESUMEN
    const summary = await window.electronAPI.getBusinessSummary();
    setBusinessSummary(summary);
  };

  const viewDetail = async (sale) => {
    const saleItems = await window.electronAPI.getSaleItems(sale.id);
    setSelectedSale(sale);
    setItems(saleItems || []);
  };

  const handleReprint = async () => {
    if (!selectedSale) return;
    const printData = {
      total: selectedSale.total,
      cart: items.map(item => ({
        name: item.name,
        price: item.price,
        qty: item.qty
      }))
    };
    await window.electronAPI.printSales(printData);
    alert("Re-impresión enviada a la impresora.");
  };

  const handlePrintReport = async () => {
    if (!selectedReport) return;

    // Preparamos los datos para que coincidan exactamente con la estructura de printReportZ
    const printData = {
      date: selectedReport.date,
      total_sales: selectedReport.total_sales,
      sales_count: sales.length, // Opcional: total de tickets en el rango actual
      totals_by_method: selectedReport.totals_by_method,
      total_expenses: selectedReport.expenses,
      expenses: [], // Aquí podrías pasar el desglose si lo tienes, o dejarlo vacío
      // Reutilizamos el campo 'sessions' para mostrar los empleados en el ticket
      sessions: selectedReport.employees.map(emp => ({
        user_name: emp.name,
        net_cash: emp.total // El diseño del reporte Z usa net_cash para el monto
      }))
    };

    try {
      await window.electronAPI.printReportZ(printData);
      alert("Reporte enviado a la impresora.");
    } catch (error) {
      console.error("Error al imprimir:", error);
      alert("Error de conexión con la impresora.");
    }
  };
  const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
  const sections = [
    { title: "Jornada Actual", data: businessSummary.today, color: "bg-orange-500" },
    { title: "Resumen Semanal", data: businessSummary.weekly, color: "bg-blue-600" },
    { title: "Resumen Mensual", data: businessSummary.monthly, color: "bg-slate-800" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 ${section.color} opacity-5 rounded-bl-full`}></div>

              <h3 className="text-slate-400 font-black uppercase text-xs tracking-widest mb-2">{section.title}</h3>
              <p className="text-4xl font-black text-slate-900 mb-6">{(section.data?.total || 0).toFixed(2)}€</p>

              <div className="space-y-3 mb-6">
                {/* Desglose de Pagos */}
                {section.data?.details?.payments?.map(p => (
                  <div key={p.payment_method} className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      {p.payment_method === 'CASH' ? '💵' : '💳'}
                      {p.payment_method === 'CASH' ? 'EFECTIVO' : 'TARJETA'}:
                    </span>
                    <span className="font-bold text-slate-700">{(p.total || 0).toFixed(2)}€</span>
                  </div>
                ))}

                {/* Gastos */}
                <div className="flex justify-between items-center text-sm text-red-500 pt-2 border-t border-dashed">
                  <span className="flex items-center gap-2 font-medium">
                    <span>📉 Gastos</span>
                  </span>
                  <span className="font-bold">-{(section.data?.details?.expenses || 0).toFixed(2)}€</span>
                </div>


              </div>

              <button
                onClick={() => openPreview(section.title, section.data)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-500 transition-colors font-bold text-xs"
              >
                📊 VER REPORTE
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- SECCIÓN 1: INSIGHTS DE NEGOCIO --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-100">
          <span className="text-3xl">🏆</span>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mt-4">Producto Estrella</h4>
          {stats.topProducts[0] ? (
            <div className="mt-2">
              <p className="text-3xl font-black truncate">{stats.topProducts[0].name}</p>
              <p className="text-sm font-medium opacity-90">{stats.topProducts[0].total_qty} unidades vendidas</p>
              {/* BOTÓN DE DETALLES */}
              <button
                onClick={() => setShowProductModal(true)}
                className="mt-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white text-[10px] font-black uppercase py-2 px-4 rounded-xl transition-all flex items-center gap-2 group"
              >
                Ver Ranking 📊
              </button>
            </div>
          ) : <p className="mt-2 font-bold italic opacity-60">Sin datos aún</p>}
        </div>

        <div className="bg-slate-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
          <span className="text-3xl">🔥</span>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mt-4">Hora de Máxima Venta</h4>
          {stats.busyHour ? (
            <div className="mt-2">
              <p className="text-4xl font-black">{stats.busyHour.hour}:00h</p>
              <p className="text-sm font-medium opacity-70">Franja con más actividad</p>
              <button
                onClick={() => setShowHourModal(true)}
                className="mt-4 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase py-2 px-4 rounded-xl transition-all"
              >
                Analizar Flujo 📈
              </button>
            </div>
          ) : <p className="mt-2 font-bold italic opacity-40">Analizando datos...</p>}
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Filtrar por Fecha</h4>
          <div className="flex gap-2">
            <input
              type="date"
              className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <input
              type="date"
              className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <button
            onClick={handleFilter}
            className="mt-4 w-full py-3 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95"
          >
            Actualizar Lista
          </button>
        </div>
      </div>
      {/* 3. GRÁFICO DE TENDENCIA */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolución de Ingresos</h4>
            <p className="text-2xl font-black text-slate-800">Tendencia de Ventas</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
            <span className="text-xs font-bold text-slate-600">Ventas (€)</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `${val}€`} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="daily_total" stroke="#f97316" strokeWidth={4} fill="url(#colorTotal)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- SECCIÓN 2: LISTADO Y DETALLE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* TABLA DE VENTAS */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h3 className="font-black text-slate-800 uppercase tracking-tighter">Registros de Venta</h3>
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black italic">
              {sales.length} transacciones
            </span>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur shadow-sm z-10">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-6">Ticket</th>
                  <th className="p-6">Fecha y Hora</th>
                  <th className="p-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map(sale => (
                  <tr
                    key={sale.id}
                    onClick={() => viewDetail(sale)}
                    className={`cursor-pointer transition-all ${selectedSale?.id === sale.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-6 font-mono text-xs font-bold text-slate-400">#{sale.id.toString().padStart(5, '0')}</td>
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-700">{new Date(sale.date).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(sale.date).toLocaleTimeString()}</p>
                    </td>
                    <td className="p-6 text-right font-black text-slate-900 text-lg">
                      {sale.total.toFixed(2)}€
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-20 text-center text-slate-400 italic">No hay ventas en este rango de fechas.</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-white border-t border-slate-200">
                <tr className="text-sm font-black text-slate-800">
                  <td className="p-6" colSpan="2">
                    TOTAL
                  </td>
                  <td className="p-6 text-right text-lg text-orange-600">
                    {totalSales.toFixed(2)}€
                  </td>
                </tr>
              </tfoot>
            </table>





          </div>
        </div>

        {/* PANEL DE DETALLE (TICKET) */}
        <div className="lg:col-span-2">
          {selectedSale ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-900 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-1">Resumen de Venta</h4>
                    <p className="text-3xl font-black">{selectedSale.total.toFixed(2)}€</p>
                  </div>
                  <button
                    onClick={handleReprint}
                    className="p-4 bg-white/10 rounded-2xl hover:bg-orange-500 transition-all active:scale-90"
                    title="Imprimir Copia"
                  >
                    🖨️
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Artículos</h5>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                        <span className="text-[10px] text-slate-400">{item.qty} x {item.price.toFixed(2)}€</span>
                      </div>
                      <span className="font-mono font-bold text-slate-600">
                        {(item.qty * item.price).toFixed(2)}€
                      </span>
                    </div>
                  ))}
                </div>

                {/* --- ESTE ES EL FRAGMENTO INTEGRADO --- */}
                <div className="mt-10 pt-6 border-t border-dashed border-slate-200">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                    <span>Método de Pago:</span>
                    <span className="text-slate-900">
                      {selectedSale.payment_method === 'CASH' ? '💵 EFECTIVO' : '💳 TARJETA'}
                    </span>
                  </div>

                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>ID Transacción:</span>
                    <span className="text-slate-600">#{selectedSale.id.toString().padStart(5, '0')}</span>
                  </div>

                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mt-2">
                    <span>Fecha y Hora:</span>
                    <span className="text-slate-600">{new Date(selectedSale.date).toLocaleString()}</span>
                  </div>
                </div>
                {/* --- FIN DEL FRAGMENTO --- */}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center text-slate-300">
              <div className="text-6xl mb-4 opacity-20">🧾</div>
              <p className="font-bold text-sm uppercase tracking-widest opacity-40">
                Selecciona una venta<br />para ver el ticket
              </p>
            </div>
          )}
        </div>
      </div>
      {/* --- MODAL DE DETALLES DEL PRODUCTO (Renderizar al final del return) --- */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Fondo oscuro con desenfoque */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowProductModal(false)}
          ></div>

          {/* Contenido del Modal */}
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">

              <div>
                <h3 className="text-2xl font-black text-slate-800">Ranking de Ventas</h3>
                <p className="text-sm text-slate-400 font-medium">Top {topLimit} productos más demandados</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-400 font-medium">Ver el Top</span>
                  <select
                    value={topLimit}
                    onChange={(e) => setTopLimit(parseInt(e.target.value))}
                    className="bg-slate-100 border-none text-xs font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                  <span className="text-xs text-slate-400 font-medium">productos</span>
                </div>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="bg-slate-100 hover:bg-red-100 hover:text-red-500 w-10 h-10 rounded-full flex items-center justify-center transition-colors text-slate-400 font-bold"
              >
                ✕
              </button>

            </div>

            {/* GRÁFICO DE BARRAS VERTICALES PARA PRODUCTOS */}
            <div style={{ height: stats.topProducts.length * 40 + 'px', minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={topLimit}
                  data={stats.topProducts}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                    width={100}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar
                    dataKey="total_qty"
                    fill="#f97316"
                    radius={[0, 10, 10, 0]}
                    barSize={topLimit > 10 ? 15 : 30}
                    animationDuration={1000}
                    label={{ position: 'right', fill: '#f97316', fontSize: 12, fontWeight: 'bold' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex justify-center">
              <button
                onClick={() => setShowProductModal(false)}
                className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
              >
                Cerrar Análisis
              </button>
            </div>
          </div>
        </div>
      )}
      {showHourModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHourModal(false)}></div>

          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Análisis de Flujo Horario</h3>
                <p className="text-sm text-slate-400 font-medium">Rendimiento del negocio por franja horaria</p>

                {/* SELECTOR DE MÉTRICA */}
                <div className="flex bg-slate-100 p-1 rounded-2xl mt-4 w-fit">
                  <button
                    onClick={() => setHourMetric('count')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${hourMetric === 'count' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    🎟️ NÚMERO DE TICKETS
                  </button>
                  <button
                    onClick={() => setHourMetric('total_amount')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${hourMetric === 'total_amount' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    💰 FACTURACIÓN (€)
                  </button>
                </div>
              </div>
              <button onClick={() => setShowHourModal(false)} className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}:00`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Franja: {data.hour}:00 - {data.hour}:59</p>
                            <p className="text-sm font-bold text-slate-800">🎟️ {data.count} tickets</p>
                            <p className="text-sm font-bold text-orange-600">💰 {data.total_amount?.toFixed(2)}€ facturados</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={hourMetric}
                    radius={[10, 10, 0, 0]}
                    animationDuration={1000}
                  >
                    {/* Resaltar la barra más alta */}
                    {(stats.hourlyData || []).map((entry, index) => (
                      <cell
                        key={`cell-${index}`}
                        fill={entry[hourMetric] === Math.max(...stats.hourlyData.map(d => d[hourMetric])) ? '#f97316' : '#e2e8f0'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase">Pico de Clientes</p>
                <p className="text-xl font-black text-slate-700">
                  {stats.busyHour?.hour}:00h <span className="text-sm font-normal text-slate-400">({stats.busyHour?.count} tickets)</span>
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <p className="text-[10px] font-black text-orange-400 uppercase">Pico de Dinero</p>
                <p className="text-xl font-black text-orange-600">
                  {/* Supongamos que calculamos la hora con más dinero */}
                  {stats.hourlyData?.reduce((prev, curr) => prev.total_amount > curr.total_amount ? prev : curr).hour}:00h
                  <span className="text-sm font-normal opacity-70"> ({stats.hourlyData?.reduce((prev, curr) => prev.total_amount > curr.total_amount ? prev : curr).total_amount?.toFixed(2)}€)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">

            {/* Cabecera */}
            <div className="p-8 border-b border-dashed border-slate-200 text-center">
              <h3 className="font-black text-xl uppercase tracking-tighter">Vista Previa Reporte</h3>
              <div className="mt-4 space-y-1">
                <h2 className="font-black text-lg uppercase tracking-tight text-orange-500">
                  {selectedReport.title}
                </h2>
                <p className="text-[10px] text-slate-400 font-mono italic">
                  Generado: {selectedReport.date}
                </p>
              </div>
            </div>

            {/* Cuerpo del Ticket */}
            <div className="flex-1 overflow-y-auto p-8 font-mono text-sm space-y-6">

              {/* Total Principal */}
              <div className="flex justify-between border-b-2 border-slate-900 pb-2">
                <span className="font-bold">TOTAL VENTAS:</span>
                <span className="font-black text-lg">{(selectedReport.total_sales || 0).toFixed(2)}€</span>
              </div>

              {/* Desglose de Pagos */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metodos de Pago</p>
                <div className="flex justify-between text-slate-600">
                  <span>💵 EFECTIVO:</span>
                  <span className="font-bold">{(selectedReport.totals_by_method?.CASH || 0).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>💳 TARJETA:</span>
                  <span className="font-bold">{(selectedReport.totals_by_method?.CARD || 0).toFixed(2)}€</span>
                </div>
                {selectedReport.expenses > 0 && (
                  <div className="flex justify-between text-red-500 pt-2 border-t border-slate-200 border-dashed">
                    <span>📉 GASTOS:</span>
                    <span className="font-bold">-{(selectedReport.expenses || 0).toFixed(2)}€</span>
                  </div>
                )}
              </div>

              {/* Sección de Ventas por Empleado */}
              {/* Empleados */}
              {/* Ventas por Empleado */}
              <div className="mt-4 border-t pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Detalle por Empleado</p>

                {selectedReport?.employees?.map((emp, idx) => (
                  <div key={idx} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-slate-800 uppercase text-[11px]">👤 {emp.name}</span>
                      <span className="font-black text-slate-900">{emp.total.toFixed(2)}€</span>
                    </div>
                    <div className="flex gap-4 text-[10px] text-slate-500 font-bold">
                      <span className="flex items-center gap-1">💵 EFECTIVO: {emp.cash.toFixed(2)}€</span>
                      <span className="flex items-center gap-1">💳 TARJETA: {emp.card.toFixed(2)}€</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center text-[9px] text-slate-300 pt-4 uppercase">
                *** Fin del Reporte ***
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="p-6 bg-slate-50 flex gap-3 rounded-b-[2rem]">
              <button
                onClick={() => setSelectedReport(null)}
                className="flex-1 py-3 font-bold text-slate-500 text-xs uppercase hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handlePrintReport(selectedReport.title, selectedReport);
                  setSelectedReport(null);
                }}
                className="flex-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <span>🖨️ Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>


  );
}