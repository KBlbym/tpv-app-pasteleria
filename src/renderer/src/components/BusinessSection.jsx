import { useState } from 'react';

export default function BusinessSection({ settings, onSave }) {
  const [localSettings, setLocalSettings] = useState(settings);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-in slide-in-from-right-4 duration-500">
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold mb-6 text-slate-800 tracking-tight">Datos Fiscales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre del Negocio</label>
              <input
                className="w-full p-3 bg-slate-50 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                value={localSettings.business_name}
                onChange={e => setLocalSettings({ ...localSettings, business_name: e.target.value })}
              />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">NIF / CIF</label>
              <input
                className="w-full p-3 bg-slate-50 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                value={localSettings.business_nif}
                onChange={e => setLocalSettings({ ...localSettings, business_nif: e.target.value })}
              />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">TEL</label>
              <input
                className="w-full p-3 bg-slate-50 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                value={localSettings.business_phone}
                onChange={e => setLocalSettings({ ...localSettings, business_phone: e.target.value })}
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Dirección</label>
              <input
                className="w-full p-3 bg-slate-50 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                value={localSettings.business_address}
                onChange={e => setLocalSettings({ ...localSettings, business_address: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Texto</label>
              <input
                className="w-full p-3 bg-slate-50 rounded-xl ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                value={localSettings.ticket_footer}
                onChange={e => setLocalSettings({ ...localSettings, ticket_footer: e.target.value })}
              />
            </div>
            <button
              onClick={() => onSave(localSettings)}
              className="col-span-2 mt-4 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-orange-500 transition-all shadow-lg active:scale-95"
            >
              ACTUALIZAR DATOS DEL TICKET
            </button>
          </div>
        </div>
      </div>

      {/* MINI VISTA PREVIA TICKET */}

      <div className="lg:col-span-2 bg-slate-800 p-8 rounded-[2.5rem] text-white flex flex-col items-center justify-start">
        <span className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest text-center">Simulación Impresión 80mm</span>

        <div className="bg-white w-[380px] shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

          {/* "Papel" del Ticket */}
          <div className="p-8 font-mono text-[13px] text-slate-800 leading-tight border-b-8 border-dotted border-slate-200">

            {/* Cabecera Fiscal */}
            <div className="text-center space-y-1 mb-6">
              <h2 className="font-black text-xl uppercase tracking-tighter">{settings.business_name}</h2>
              <p className="text-[11px] font-bold">NIF: {settings.business_nif}</p>
              <p className="text-[11px]">{settings.business_address}</p>
              <p className="text-[11px]">TEL: {settings.business_phone}</p>
            </div>

            <div className="border-b border-dashed border-slate-400 my-4"></div>

            {/* Info del Ticket */}
            <div className="flex justify-between text-[11px] mb-4 font-bold">
              <span>TICKET: #00{2 || '---'}</span>
              <span>{new Date().toLocaleString()}</span>
            </div>

            {/* Productos */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-start">
                <span>1x PRODUCTO TEST</span><span>2.50€</span>
              </div>
            </div>

            <div className="border-b-2 border-slate-800 my-4"></div>

            {/* Total */}
            <div className="flex justify-between items-center py-2">
              <span className="font-black text-lg text-slate-900 uppercase">Total</span>
              <span className="font-black text-2xl text-slate-900">200€</span>
            </div>

            {/* Pie de página */}
            <div className="text-center mt-8 space-y-2">
              <p className="italic text-slate-500 text-[11px]">{settings.ticket_footer}</p>
              <p className="text-[10px] font-bold text-slate-400">--- IVA INCLUIDO ---</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}