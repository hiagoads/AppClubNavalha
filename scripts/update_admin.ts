import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Update useQueue destructuring
content = content.replace(
  /const \{ queue, activeBooking, loading \} = useQueue\(\);/,
  "const { queue, activeBookings, loading } = useQueue();"
);

// Update useQueueTimers call
content = content.replace(
  /const queueTimers = useQueueTimers\(activeBooking, queue, services, breaks\);/,
  "const queueTimers = useQueueTimers(activeBookings, queue, services, breaks, barbers);"
);

// Update useNotifications call
content = content.replace(
  /useNotifications\(queue, activeBooking\);/,
  "useNotifications(queue, activeBookings[0] || null);" // Simplification for notifications
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
