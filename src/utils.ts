export function parsePrice(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    let cleaned = val.replace(/[^\d.,]/g, '');
    const lastCommaIndex = cleaned.lastIndexOf(',');
    const lastDotIndex = cleaned.lastIndexOf('.');
    const lastSeparatorIndex = Math.max(lastCommaIndex, lastDotIndex);
    
    if (lastSeparatorIndex !== -1) {
       const before = cleaned.substring(0, lastSeparatorIndex).replace(/[.,]/g, '');
       const after = cleaned.substring(lastSeparatorIndex + 1).replace(/[.,]/g, '');
       cleaned = before + '.' + after;
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function parseServiceString(serviceStr: string | string[]) {
  if (!serviceStr) return [];
  
  let items: string[] = [];
  if (Array.isArray(serviceStr)) {
    items = serviceStr.map(s => String(s).trim()).filter(Boolean);
  } else {
    items = String(serviceStr).split(',').map(s => s.trim()).filter(Boolean);
  }
  
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

export function formatPhone(val: string): string {
  if (!val) return '';
  const numeric = val.replace(/\D/g, '');
  if (numeric.length === 0) return '';
  if (numeric.length <= 2) return `(${numeric}`;
  if (numeric.length <= 7) return `(${numeric.slice(0, 2)}) ${numeric.slice(2)}`;
  return `(${numeric.slice(0, 2)}) ${numeric.slice(2, 7)}-${numeric.slice(7, 11)}`;
}

export function parsePhone(val: string): string {
  if (!val) return '';
  return val.replace(/\D/g, '').slice(0, 11);
}

/**
 * Remove acentos, converte para minúsculas e remove espaços e caracteres especiais não permitidos.
 * Mantém apenas letras minúsculas (a-z), números (0-9) e underscores opcionais se digitados.
 */
export function sanitizeUsername(val: string): string {
  if (!val) return '';
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, '') // remove qualquer espaço
    .replace(/[^a-z0-9_.]/g, ''); // apenas a-z, números e _
}

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validação rigorosa do nome de usuário:
 * - Apenas letras minúsculas e números (sem acentos nem espaços)
 * - Mínimo de 5 caracteres
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username) {
    return { isValid: false, error: 'O nome de usuário é obrigatório.' };
  }

  // Verifica se tem espaços
  if (/\s/.test(username)) {
    return { isValid: false, error: 'O nome de usuário não pode conter espaços.' };
  }

  // Verifica se tem letras maiúsculas
  if (/[A-Z]/.test(username)) {
    return { isValid: false, error: 'Use apenas letras minúsculas.' };
  }

  // Verifica se tem acentos ou caracteres especiais acentuados
  const normalized = username.normalize('NFD');
  if (/[\u0300-\u036f]/.test(normalized)) {
    return { isValid: false, error: 'O nome de usuário não pode conter acentos.' };
  }

  // Verifica comprimento mínimo de 5 caracteres
  if (username.length < 5) {
    return { isValid: false, error: 'O nome de usuário deve ter no mínimo 5 caracteres.' };
  }

  // Deve conter apenas a-z, 0-9 e _
  if (!/^[a-z0-9_.]+$/.test(username)) {
    return { isValid: false, error: 'Apenas letras minúsculas (sem acentos), números e sublinhados são permitidos.' };
  }

  return { isValid: true };
}
