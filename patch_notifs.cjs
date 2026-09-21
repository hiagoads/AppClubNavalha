const fs = require('fs');
let code = fs.readFileSync('src/hooks/useNotificationsManager.ts', 'utf8');

code = code.replace(/await updateDoc\(doc\(db, 'bookings', booking\.id\), \{ ([a-zA-Z0-9_]+): true \}\);/g, 
"try { await updateDoc(doc(db, 'bookings', booking.id), { $1: true }); } catch(err: any) { if(err.code !== 'permission-denied') console.error(err); }");

code = code.replace(/await updateDoc\(doc\(db, 'bookings', activeBooking\.id\), \{ notifiedTurnArrived: true \}\);/g, 
"try { await updateDoc(doc(db, 'bookings', activeBooking.id), { notifiedTurnArrived: true }); } catch(err: any) { if(err.code !== 'permission-denied') console.error(err); }");

fs.writeFileSync('src/hooks/useNotificationsManager.ts', code);
