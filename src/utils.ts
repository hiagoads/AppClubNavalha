export function parsePrice(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function parseServiceString(serviceStr: string) {
  if (!serviceStr) return [];
  const items = serviceStr.split(',').map(s => s.trim()).filter(Boolean);
  return items.map(item => {
    const match = item.match(/^(\d+)x\s*(.*)$/i);
    if (match) {
      return { quantity: parseInt(match[1], 10), name: match[2].trim() };
    }
    return { quantity: 1, name: item };
  });
}

export function stringifyServices(parsed: {quantity: number, name: string}[]) {
  return parsed.map(p => p.quantity > 1 ? `${p.quantity}x ${p.name}` : p.name).join(', ');
}

export function formatTime(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes < 0) return '0 min';
  if (totalMinutes < 60) return `${Math.floor(totalMinutes)} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
