import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// The active session Cancel button:
content = content.replace(
  /<button \n\s*onClick=\{([^}]*)removeBooking\(activeB\.id\)\}\n\s*className="flex-1 bg-white\/5 hover:bg-white\/10 text-white\/40 border border-white\/10 py-2 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors font-bold"\n\s*>/g,
  `<button 
                                 onClick={() => setCancelingBooking(activeB)}
                                 className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 py-2 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors font-bold"
                              >`
);

// The queue Call button:
const queueCallOld = /<button \n\s*onClick=\{([^}]+)if \(item\.barberId !== 'any'\) \{[\s\S]*?className="flex items-center gap-1\.5 sm:gap-2 whitespace-nowrap bg-gold\/10 hover:bg-gold text-gold hover:text-carbon px-3 py-1\.5 sm:px-4 sm:py-2\.5 rounded-lg font-bold text-\[10px\] sm:text-sm transition-all shrink-0"\n\s*>\n\s*<Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" \/>\n\s*CHAMAR\n\s*<\/button>/g;

const queueCallNew = `<button 
                               onClick={() => setCallingBooking(item)}
                               className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap bg-gold/10 hover:bg-gold text-gold hover:text-carbon px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm transition-all shrink-0"
                             >
                               <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                               CHAMAR
                             </button>`;

content = content.replace(queueCallOld, queueCallNew);

// Add Modals to UI
const modalsUI = `
      {/* Modals */}
      {callingBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
            <button onClick={() => setCallingBooking(null)} className="absolute top-4 right-4 text-white/40 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-display font-bold mb-6">Selecionar Barbeiro</h3>
            <p className="text-sm text-white/60 mb-6">Selecione qual barbeiro irá atender <strong className="text-white">{callingBooking.clientName}</strong>.</p>
            <div className="grid grid-cols-2 gap-4">
              {barbers.filter(b => b.isActive).map(barber => (
                <button
                  key={barber.id}
                  onClick={() => {
                    startService(callingBooking.id, barber.id);
                    setCallingBooking(null);
                  }}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-gold/20 hover:border-gold/50 transition-colors flex flex-col items-center gap-2"
                >
                  <Scissors className="w-6 h-6 text-gold" />
                  <span className="font-bold">{barber.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {cancelingBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
            <button onClick={() => setCancelingBooking(null)} className="absolute top-4 right-4 text-white/40 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-display font-bold mb-6 text-red-500">Cancelar Ação</h3>
            <p className="text-sm text-white/60 mb-6">O que deseja fazer com <strong className="text-white">{cancelingBooking.clientName}</strong>?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => returnToQueue(cancelingBooking.id)}
                className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/40 p-4 rounded-xl hover:bg-yellow-500/30 transition-colors font-bold flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Devolver para a Fila
              </button>
              <button
                onClick={() => removeBooking(cancelingBooking.id)}
                className="bg-red-500/20 text-red-500 border border-red-500/40 p-4 rounded-xl hover:bg-red-500/30 transition-colors font-bold flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Cancelar Agendamento Totalmente
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  /\{editingServicesBooking && \(/,
  modalsUI + "\n      {editingServicesBooking && ("
);

// We need to import ArrowLeft, X from lucide-react if they are not there
if (!content.includes('ArrowLeft')) {
  content = content.replace(
    /import \{ (.*?) \} from 'lucide-react';/,
    "import { $1, ArrowLeft, X } from 'lucide-react';"
  );
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
