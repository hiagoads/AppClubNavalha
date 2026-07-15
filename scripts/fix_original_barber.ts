import fs from 'fs';

let typesContent = fs.readFileSync('src/types/index.ts', 'utf8');
typesContent = typesContent.replace(
  /barberId: string; \/\/ 'any' or specific ID/,
  "barberId: string; // 'any' or specific ID\n  originalBarberId?: string;"
);
fs.writeFileSync('src/types/index.ts', typesContent, 'utf8');

let adminContent = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Update startService
adminContent = adminContent.replace(
  /const startService = async \(bookingId: string, assignedBarberId: string\) => \{/,
  "const startService = async (bookingId: string, assignedBarberId: string) => {\n    const bookingToUpdate = queue.find(b => b.id === bookingId) || activeBookings.find(b => b.id === bookingId);"
);

adminContent = adminContent.replace(
  /serviceStartTime: serverTimestamp\(\),\n\s*barberId: assignedBarberId\n\s*\}\);/,
  "serviceStartTime: serverTimestamp(),\n        barberId: assignedBarberId,\n        originalBarberId: bookingToUpdate?.originalBarberId || bookingToUpdate?.barberId || 'any'\n      });"
);

// Update returnToQueue
const returnToQueueOld = /const returnToQueue = async \(bookingId: string\) => \{\n\s*try \{\n\s*await updateDoc\(doc\(db, 'bookings', bookingId\), \{\n\s*status: BookingStatus.WAITING,\n\s*serviceStartTime: null,\n\s*pausedAt: null\n\s*\}\);/;

const returnToQueueNew = `const returnToQueue = async (bookingId: string) => {
    try {
      const bookingToUndo = queue.find(b => b.id === bookingId) || activeBookings.find(b => b.id === bookingId);
      const updateData: any = {
        status: BookingStatus.WAITING,
        serviceStartTime: null,
        pausedAt: null
      };
      
      if (bookingToUndo && bookingToUndo.originalBarberId) {
        updateData.barberId = bookingToUndo.originalBarberId;
      }

      await updateDoc(doc(db, 'bookings', bookingId), updateData);`;

adminContent = adminContent.replace(returnToQueueOld, returnToQueueNew);

fs.writeFileSync('src/pages/AdminDashboard.tsx', adminContent, 'utf8');
