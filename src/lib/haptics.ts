// Native Haptic Feedback Utility for 2026 Mobile Experience
export const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(8);
        break;
      case 'medium':
        navigator.vibrate(16);
        break;
      case 'success':
        navigator.vibrate([12, 40, 16]);
        break;
      case 'warning':
        navigator.vibrate([20, 60, 20]);
        break;
    }
  } catch {
    // Graceful fallback if not permitted
  }
};
