import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Update startService
content = content.replace(
  /const startService = async \(bookingId: string\) => \{/,
  "const startService = async (bookingId: string, assignedBarberId: string) => {"
);
content = content.replace(
  /serviceStartTime: serverTimestamp\(\)\n\s*\}\);/,
  "serviceStartTime: serverTimestamp(),\n        barberId: assignedBarberId\n      });"
);

// Update pauseService to take just booking
// completeService needs activeInfo handling
content = content.replace(
  /const activeInfo = activeBooking\?\.id === bookingId \? activeBooking : null;/,
  "const activeInfo = activeBookings.find(b => b.id === bookingId);"
);

// Update resumeService
content = content.replace(
  /const resumeService = async \(booking: Booking\) => \{/,
  "const resumeService = async (booking: Booking) => {"
);

// Update removeBooking
content = content.replace(
  /const bookingToUndo = queue\.find\(b => b\.id === bookingId\) \|\| \(activeBooking\?\.id === bookingId \? activeBooking : null\);/,
  "const bookingToUndo = queue.find(b => b.id === bookingId) || activeBookings.find(b => b.id === bookingId);"
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
