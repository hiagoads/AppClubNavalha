export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  if (!('PushManager' in window)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    const pubKeyResponse = await fetch('/api/push/public-key');
    const pubKeyData = await pubKeyResponse.json();
    const VAPID_PUBLIC_KEY = pubKeyData.publicKey;

    if (!VAPID_PUBLIC_KEY) {
      console.warn('VAPID_PUBLIC_KEY is missing from backend.');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    return subscription;
  } catch (error) {
    console.error('Error during push subscription:', error);
    return null;
  }
}

export async function sendWebPush(subscription: any, title: string, body: string) {
  if (!subscription) return false;
  
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription, title, body }),
    });

    if (!response.ok) {
      throw new Error('Failed to send push');
    }
    return true;
  } catch (error) {
    console.error('Error sending web push:', error);
    return false;
  }
}
