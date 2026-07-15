import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. Update state definition
content = content.replace(
  "const [editingServicesBooking, setEditingServicesBooking] = useState<{id: string, serviceId: string} | null>(null);",
  "const [editingServicesBooking, setEditingServicesBooking] = useState<{id: string, serviceId: string, expectedPrice: number | string} | null>(null);"
);

// 2. Update setEditingServicesBooking calls
content = content.replace(
  "setEditingServicesBooking({id: activeB.id, serviceId: activeB.serviceId})",
  "setEditingServicesBooking({id: activeB.id, serviceId: activeB.serviceId, expectedPrice: activeB.expectedPrice})"
);
content = content.replace(
  "setEditingServicesBooking({id: item.id, serviceId: item.serviceId})",
  "setEditingServicesBooking({id: item.id, serviceId: item.serviceId, expectedPrice: item.expectedPrice})"
);

// 3. Update handleUpdateServices
content = content.replace(
  /const handleUpdateServices = async \(e: React\.FormEvent\) => \{[\s\S]*?setEditingServicesBooking\(null\);\n    \} catch \(err\) \{/m,
  `const handleUpdateServices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServicesBooking || editingServicesBooking.serviceId.trim() === '') {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', editingServicesBooking.id), {
        serviceId: editingServicesBooking.serviceId,
        expectedPrice: Number(editingServicesBooking.expectedPrice)
      });
      toast.success('Serviços e valor atualizados com sucesso');
      setEditingServicesBooking(null);
    } catch (err) {`
);

// 4. Update the manual service buttons to recalculate expectedPrice
// When clicking a service button, it updates the serviceId. We can also recalculate the price in that state update.

fs.writeFileSync('scripts/temp.ts', content, 'utf8');
