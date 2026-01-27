import { useState } from 'react';
import SalesView from './views/SalesView';
import AdminView from './views/AdminView';

function App() {
  const [currentView, setCurrentView] = useState('sales');

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans select-none">
      {/* Navbar Minimalista */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xl">D</div>
          <span className="font-black text-slate-800 tracking-tighter text-xl italic">DULCE TPV</span>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setCurrentView('sales')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${currentView === 'sales' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}
          >
            Terminal
          </button>
          <button 
            onClick={() => setCurrentView('admin')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${currentView === 'admin' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}
          >
            Administración
          </button>
        </div>
      </nav>

      {/* Contenido Dinámico */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'sales' ? <SalesView /> : <AdminView />}
      </main>
    </div>
  );
}

export default App;