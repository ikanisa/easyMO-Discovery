export const vibrate = (pattern: number | number[] = 15) => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore haptic failures on unsupported devices
  }
};
