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

  // 1.  useEffect para que sea más específico
  useEffect(() => {
    loadStats(topLimit);
  }, [topLimit]);

  // 2. Efecto aparte para la carga inicial de ventas (solo al montar el componente)
  useEffect(() => {
    handleFilter();
  }, []);

  // 3. función dedicada solo a las estadísticas
  const loadStats = async (limit) => {
    const s = await window.electronAPI.getStats(limit);
    console.log("Datos para el gráfico de horas:", s.hourlyData); // Revisa esto en la consola
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
    setSelectedSale(null);
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
    await window.electronAPI.printTicket(printData);
    alert("Re-impresión enviada a la impresora.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
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
      {/* 2. GRÁFICO PROFESIONAL CON RECHARTS */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolución de Ingresos</h4>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
            <span className="text-xs font-bold text-slate-600">Ventas Diarias (€)</span>
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
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(value) => `${value}€`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                cursor={{ stroke: '#f97316', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="daily_total"
                stroke="#f97316"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorTotal)"
                animationDuration={1500}
              />
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

                <div className="mt-10 pt-6 border-t border-dashed border-slate-200">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>ID Transacción:</span>
                    <span>{selectedSale.id}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mt-2">
                    <span>Fecha:</span>
                    <span>{new Date(selectedSale.date).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center text-slate-300">
              <div className="text-6xl mb-4 opacity-20">🧾</div>
              <p className="font-bold text-sm uppercase tracking-widest opacity-40">Selecciona una venta<br />para ver el ticket</p>
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
    </div>


  );
}