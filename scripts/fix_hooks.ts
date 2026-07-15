import fs from 'fs';

let content = fs.readFileSync('src/hooks/useQueueTimers.ts', 'utf8');
content = content.replace(
  /return \{ activeRemainingMinutes, queueWaitTimes, queueIntervals, sortedQueue, exactStartTimes \};/,
  "const allOccupiedIntervals = Object.values(barberOccupiedIntervals).flat();\n  return { activeRemainingMinutes, queueWaitTimes, queueIntervals, sortedQueue, exactStartTimes, allOccupiedIntervals };"
);
fs.writeFileSync('src/hooks/useQueueTimers.ts', content, 'utf8');

let clientContent = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');
clientContent = clientContent.replace(
  /const \{ queue, activeBooking, loading \} = useQueue\(\);/,
  "const { queue, activeBookings, loading } = useQueue();"
);
clientContent = clientContent.replace(
  /const \{ activeRemainingMinutes, queueWaitTimes, sortedQueue, queueIntervals \} = useQueueTimers\(activeBooking, queue, services, breaks\);/,
  "const { activeRemainingMinutes, queueWaitTimes, sortedQueue, queueIntervals, allOccupiedIntervals } = useQueueTimers(activeBookings, queue, services, breaks, barbers);"
);

// Fix occupied intervals in ClientPanel
clientContent = clientContent.replace(
  /const occupied = Object\.values\(queueIntervals\);\n\s*if \(activeBooking\) \{\n\s*occupied\.push\(\{ start: Date\.now\(\), end: Date\.now\(\) \+ activeRemainingMinutes \* 60000 \}\);\n\s*\}/,
  "const occupied = allOccupiedIntervals || [];"
);

// Fix myBooking
clientContent = clientContent.replace(
  /const myBooking = sortedQueue\?\.find\(b => b\.id === myBookingId\) \|\| \n\s*\(activeBooking\?\.id === myBookingId \? activeBooking : null\);/,
  "const myBooking = sortedQueue?.find(b => b.id === myBookingId) || activeBookings?.find(b => b.id === myBookingId);"
);

// Fix Active Session UI
// Instead of showing just one, maybe map activeBookings?
const activeSessionOld = /\{\/\* Active Session \*\/\}\n\s*\{activeBooking && \([\s\S]*?<\/section>\n\s*\)\}/;
const activeSessionNew = `        {/* Active Session */}
        {activeBookings && activeBookings.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gold mb-3 font-semibold px-2">Agora Atendendo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {activeBookings.map(ab => (
                 <div key={ab.id} className="glass-card p-6 border-gold/30 bg-gold/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                       <span className="flex h-2 w-2 relative">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                       </span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xl">
                         {ab.clientName[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                         <h3 className="font-display text-xl font-bold truncate">{ab.clientName}</h3>
                         <div className="flex items-center gap-2">
                           <p className="text-white/40 text-sm flex items-center gap-1 truncate">
                             <Clock className="w-3 h-3" /> 
                             {ab.serviceStartTime ? \`Restam aprox. \${formatTime(activeRemainingMinutes[ab.id] || 0)}\` : "Iniciando..."}
                           </p>
                         </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </section>
        )}`;
clientContent = clientContent.replace(activeSessionOld, activeSessionNew);

fs.writeFileSync('src/pages/ClientPanel.tsx', clientContent, 'utf8');
