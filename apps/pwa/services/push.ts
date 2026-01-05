const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const PUSH_ENDPOINT = import.meta.env.VITE_PUSH_ENDPOINT;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const PushService = {
  isSupported: () =>
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,

  isConfigured: () => Boolean(VAPID_PUBLIC_KEY && PUSH_ENDPOINT),

  async getSubscription() {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  },

  async requestPermission() {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  async subscribe() {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('Missing VITE_VAPID_PUBLIC_KEY');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await PushService.sendSubscription(subscription);
    return subscription;
  },

  async unsubscribe() {
    const subscription = await PushService.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await PushService.sendSubscription(null);
    }
  },

  async sendSubscription(subscription: PushSubscription | null) {
    if (!PUSH_ENDPOINT) return;

    await fetch(PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });
  },
};
