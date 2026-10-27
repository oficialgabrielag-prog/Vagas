// Native Browser Push Notifications Utility for CuneneVagas
// Supports Web Notification API + Service Worker Push + Haptic Vibration

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export const isPushNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getPushNotificationPermission = (): PushPermissionStatus => {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission as PushPermissionStatus;
};

export const requestPushNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.info('[Push] Notificações não são suportadas neste navegador.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Trigger Welcome native push notification
      sendNativePushNotification('🔔 Notificações Ativadas!', {
        body: 'Receberá avisos instantâneos de novas vagas, seguidores, candidaturas e mensagens.',
        icon: '/icons/icon-192x192.png',
        tag: 'cunene-welcome-push'
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Push] Erro ao solicitar permissão de notificações:', err);
    return false;
  }
};

export interface PushNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: any;
}

export const sendNativePushNotification = (
  title: string,
  options: PushNotificationOptions = {}
): void => {
  if (!isPushNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const defaultIcon = '/icons/icon-192x192.png';
  const defaultBadge = '/icons/icon-192x192.png';

  const notificationOptions: NotificationOptions = {
    body: options.body || '',
    icon: options.icon || defaultIcon,
    badge: options.badge || defaultBadge,
    tag: options.tag || 'cunene-push-' + Date.now(),
    data: options.data || { url: options.url || '/' }
  };

  // Haptic feedback
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch {}
  }

  // Direct Standard Browser Notification
  try {
    new Notification(title, notificationOptions);
  } catch (e) {
    console.warn('Notification display failed:', e);
  }
};
