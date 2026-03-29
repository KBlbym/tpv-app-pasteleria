import { useState, useEffect } from 'react';
import SalesView from './views/SalesView';
import AdminView from './views/AdminView';
import CashView from './views/CashView';

function App() {
  const [currentView, setCurrentView] = useState('sales');
  const [activeSession, setActiveSession] = useState(null);

  // 1. Función para verificar si hay una caja abierta en la DB
  const checkSession = async () => {
    try {
      const session = await window.electronAPI.getActiveSession();
      setActiveSession(session || null);
      //setActiveSession(session);
    } catch (error) {
      console.error("Error al recuperar sesión:", error);
      setActiveSession(null);
    }
  };

  // 2. Carga inicial al montar la aplicación
  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans select-none">
      {/* Navbar Minimalista */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-sm">D</div>
          <span className="font-black text-slate-800 tracking-tighter text-xl italic">DULCE TPV</span>
          
          {/* Indicador de estado sutil */}
          {activeSession && (
            <div className="ml-4 flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                {activeSession.user_name}
              </span>
            </div>
          )}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <NavButton id="sales" label="Terminal" current={currentView} set={setCurrentView} />
          <NavButton id="cash" label="Caja / Turnos" current={currentView} set={setCurrentView} />
          <NavButton id="admin" label="Administración" current={currentView} set={setCurrentView} />
        </div>
      </nav>

      {/* Contenido Dinámico */}
      <main className="flex-1 overflow-hidden relative">
        {/* Usamos renderizado condicional para mostrar la vista correcta */}
        {currentView === 'sales' && (
          <SalesView activeSession={activeSession} />
        )}
        
        {currentView === 'cash' && (
          <CashView 
            activeSession={activeSession} 
            onRefresh={checkSession} 
          />
        )}
        
        {currentView === 'admin' && (
          <AdminView />
        )}
      </main>
    </div>
  );
}

// Helper para los botones del Nav (Manteniendo tu estilo original)
function NavButton({ id, label, current, set }) {
  const active = current === id;
  return (
    <button 
      onClick={() => set(id)} 
      className={`px-6 py-2 rounded-lg font-bold transition-all ${
        active 
          ? 'bg-white shadow-sm text-orange-600' 
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

export default App;