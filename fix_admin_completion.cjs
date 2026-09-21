const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// First, we need to import `query, collection, where, getDocs` and `increment` from firestore if not there.
if (!code.includes('increment')) {
    code = code.replace(
        "import { doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';",
        "import { doc, updateDoc, deleteDoc, serverTimestamp, setDoc, query, collection, where, getDocs, increment } from 'firebase/firestore';"
    );
}

const targetLogic = `const bookingRef = doc(db, 'bookings', completingBooking.id);
      await updateDoc(bookingRef, {
        status: BookingStatus.COMPLETED,
        estimatedEndTime: serverTimestamp(),
        price: finalPrice > 0 ? finalPrice : null, // Save price snapshot
        barberId: completionBarberId, // Assign actual barber
        isPaid: true,
        paidAt: serverTimestamp()
      });`;

const replacementLogic = `const bookingRef = doc(db, 'bookings', completingBooking.id);
      await updateDoc(bookingRef, {
        status: BookingStatus.COMPLETED,
        estimatedEndTime: serverTimestamp(),
        price: finalPrice > 0 ? finalPrice : null, // Save price snapshot
        barberId: completionBarberId, // Assign actual barber
        isPaid: true,
        paidAt: serverTimestamp()
      });

      // Gamification: Give points to client if registered
      if (finalPrice > 0 && activeInfo && activeInfo.clientWhatsapp) {
        try {
          // Normalize whatsapp number (just numbers)
          const cleanPhone = activeInfo.clientWhatsapp.replace(/\\D/g, '');
          const clientsRef = collection(db, 'clients');
          const q = query(clientsRef, where('whatsapp', '==', cleanPhone));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            // Client found! Add points
            const pointsToGive = Math.floor(finalPrice * 100);
            const clientDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'clients', clientDoc.id), {
              points: increment(pointsToGive)
            });
            toast.success(\`\${pointsToGive} pontos creditados para \${clientDoc.data().username}!\`);
          }
        } catch (e) {
          console.error("Error giving points:", e);
        }
      }`;

if (code.includes(targetLogic)) {
    code = code.replace(targetLogic, replacementLogic);
    fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
    console.log('AdminDashboard updated for Gamification points engine.');
} else {
    console.log('Target logic not found in AdminDashboard.tsx');
}
