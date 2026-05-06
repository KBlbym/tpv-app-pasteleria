import { useState, useEffect } from 'react';
// 1. Importamos los trozos (componentes) que creamos antes
import DashboardSection from '../components/DashboardSection';
import InventorySection from '../components/InventorySection';
import BusinessSection from '../components/BusinessSection';
import HistorySection from '../components/HistorySection';
import HistorySectionZ from '../components/HistorySectionZ';

export default function AdminView() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [reportSubTab, setReportSubTab] = useState('ventas');

  // Estados para los datos que vienen de la DB
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [dailyTotal, setDailyTotal] = useState(0);
  const [totalCash, setTotalCash] = useState(0);
  const [totalCard, setTotalCard] = useState(0);
  const [activeSessionTotal, setActiveSessionTotal] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [activeExpenses, setActiveExpenses] = useState(0);
  const [history, setHistory] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  // 2. Función para cargar TODO de golpe desde la base de datos
  const loadAllData = async () => {
    const p = await window.electronAPI.getProductsWithCategory();
    const c = await window.electronAPI.getCategories();
    const s = await window.electronAPI.getSettings();
    //const t = await window.electronAPI.getDailySales();
    const { dailyTotal, totalCash, totalCard } = await window.electronAPI.getDailySales();
    const ast = await window.electronAPI.getActiveSessionSales();
    const data = await window.electronAPI.getArchivedHistory();

    const de = await window.electronAPI.getDailyExpenses();
    const ae = await window.electronAPI.getActiveSessionExpenses();

    setProducts(p || []);
    setCategories(c || []);
    setSettings(s || {});
    setDailyTotal(dailyTotal || 0);
    setTotalCash(totalCash || 0);
    setTotalCard(totalCard || 0);
    setActiveSessionTotal(ast || 0);
    setHistory(data);
    setDailyExpenses(de || 0);
    setActiveExpenses(ae || 0);

  };

  useEffect(() => {
    loadAllData();
  }, []);

  // 3. Renderizado condicional mejorado
  const renderContent = () => {
    switch (activeTab) {
      case 'resumen':
        return <DashboardSection
          dailyTotal={dailyTotal}
          totalCash={totalCash}
          totalCard={totalCard}
          activeSessionTotal={activeSessionTotal}
          productCount={products.length}
          dailyExpenses={dailyExpenses}
          activeExpenses={activeExpenses}
        />;
      case 'inventario':
        return <InventorySection products={products} categories={categories} onRefresh={loadAllData} />;
      case 'empresa':
        return <BusinessSection settings={settings} onSave={async (newS) => {
          await window.electronAPI.updateSettings(newS);
          loadAllData();
        }} />;
      case 'reportes':
        return (
          <div className="space-y-6">
            {/* Selector de tipo de reporte */}
            <div className="flex bg-white p-1 rounded-2xl w-fit shadow-sm border border-slate-200">
              <button
                onClick={() => setReportSubTab('ventas')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${reportSubTab === 'ventas' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                ANÁLISIS DE VENTAS
              </button>
              <button
                onClick={() => setReportSubTab('cierres')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${reportSubTab === 'cierres' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                HISTORIAL DE CIERRES Z
              </button>
            </div>

            {/* Renderizado del componente según el sub-tab */}
            {reportSubTab === 'ventas' ? <HistorySection /> : <HistorySectionZ settings={settings} />}
          </div>
        );
      default:
        return <DashboardSection dailyTotal={dailyTotal} activeSessionTotal={activeSessionTotal} productCount={products.length} totalCash={totalCash} totalCard={totalCard} />;
    }
  };

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 gap-2 shadow-sm">
        <div className="mb-8 px-2 text-2xl font-black text-slate-800">
          Admin<span className="text-orange-500">Panel</span>
        </div>

        <TabButton icon="📊" label="Resumen" id="resumen" active={activeTab} set={setActiveTab} />
        <TabButton icon="🥐" label="Inventario" id="inventario" active={activeTab} set={setActiveTab} />
        <TabButton icon="🏢" label="Mi Empresa" id="empresa" active={activeTab} set={setActiveTab} />
        <TabButton icon="📈" label="Historial" id="reportes" active={activeTab} set={setActiveTab} />
      </aside>

      <main className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function TabButton({ icon, label, id, active, set }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => set(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive
        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
        : 'text-slate-500 hover:bg-slate-100'
        }`}
    >
      <span className="text-xl">{icon}</span> {label}
    </button>
  );
}