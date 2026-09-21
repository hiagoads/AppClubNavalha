import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const snap = await getDocs(collection(db, 'clients'));
  const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(clients.map(c => ({ id: c.id, username: c.username, points: c.points, seasonalPoints: c.seasonalPoints })));
  process.exit(0);
}
run();
