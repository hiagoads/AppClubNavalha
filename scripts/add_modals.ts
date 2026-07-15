import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(
  "const [activeTab, setActiveTab] = useState<'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log'>('queue');",
  "const [activeTab, setActiveTab] = useState<'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log'>('queue');\n  const [callingBooking, setCallingBooking] = useState<any>(null);\n  const [cancelingBooking, setCancelingBooking] = useState<any>(null);\n"
);

// We need to implement a returnToQueue function or just update removeBooking
const removeBookingReplacement = `
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

  const removeBooking = async (bookingId: string) => {
    const bookingToUndo = queue.find(b => b.id === bookingId) || activeBookings.find(b => b.id === bookingId);
    if (!bookingToUndo) return;

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: BookingStatus.CANCELLED
      });
      toast.success('Agendamento cancelado');
      setCancelingBooking(null);
    } catch(err) {
      toast.error('Erro ao cancelar agendamento');
    }
  };
`;

content = content.replace(
  /const removeBooking = async \([\s\S]*?toast\.error\('Erro ao cancelar agendamento'\);\n\s*\}\n\s*\};/,
  removeBookingReplacement
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
