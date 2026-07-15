import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Insert returnToQueue above removeBooking
if (!content.includes('const returnToQueue = async')) {
  const returnToQueue = `
  const returnToQueue = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: BookingStatus.WAITING,
        serviceStartTime: null,
        pausedAt: null
      });
      toast.success('Retornado para a fila');
      setCancelingBooking(null);
    } catch (err) {
      toast.error('Erro ao retornar');
    }
  };

  `;
  content = content.replace('const removeBooking = async', returnToQueue + 'const removeBooking = async');
}

// Ensure setCancelingBooking(null) is called inside removeBooking
content = content.replace(
  /const removeBooking = async \(bookingId: string\) => \{/,
  "const removeBooking = async (bookingId: string) => {\n    setCancelingBooking(null);"
);

// Add ArrowLeft to lucide-react if missing
if (!content.match(/import \{.*ArrowLeft.*\} from 'lucide-react'/)) {
  content = content.replace(
    /import \{ (.*?) \} from 'lucide-react';/,
    "import { $1, ArrowLeft } from 'lucide-react';"
  );
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
