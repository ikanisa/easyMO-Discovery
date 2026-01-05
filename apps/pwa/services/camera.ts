
/**
 * Camera Service
 * 
 * Provides camera access with permission gating and fallbacks
 * Just-in-time permission requests with clear explanations
 */

export interface CameraPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  facingMode?: 'user' | 'environment';
}

/**
 * Check camera permission state
 */
export async function checkCameraPermission(): Promise<CameraPermissionState> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      denied: false,
      prompt: false,
      error: 'Camera API not supported on this device',
    };
  }

  try {
    // Query permission state (if supported)
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return {
        granted: result.state === 'granted',
        denied: result.state === 'denied',
        prompt: result.state === 'prompt',
      };
    }

    // Fallback: Try to enumerate devices (requires permission)
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideoDevices = devices.some(device => device.kind === 'videoinput');
    
    if (!hasVideoDevices) {
      return {
        granted: false,
        denied: false,
        prompt: false,
        error: 'No camera found on this device',
      };
    }

    // If we can enumerate, permission might be granted or we need to prompt
    return {
      granted: false,
      denied: false,
      prompt: true,
    };
  } catch (error: any) {
    return {
      granted: false,
      denied: true,
      prompt: false,
      error: error.message || 'Permission check failed',
    };
  }
}

/**
 * Request camera permission with explanation
 */
export async function requestCameraPermission(
  explanation?: string
): Promise<{ granted: boolean; error?: string }> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      error: 'Camera API not supported on this device',
    };
  }

  try {
    // Request permission by attempting to access camera
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    // Stop stream immediately (we just needed permission)
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true };
  } catch (error: any) {
    let errorMessage = 'Camera permission denied';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera permission was denied. Please enable it in your browser settings.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found on this device.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is in use by another application.';
    }
    
    return {
      granted: false,
      error: errorMessage,
    };
  }
}

/**
 * Get available camera devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || 'Camera',
        facingMode: device.label.toLowerCase().includes('back') || 
                   device.label.toLowerCase().includes('rear') 
                   ? 'environment' 
                   : 'user',
      }));
  } catch (error) {
    console.error('Failed to enumerate cameras:', error);
    return [];
  }
}

/**
 * Check if camera is available (hardware check)
 */
export async function isCameraAvailable(): Promise<boolean> {
  const devices = await getCameraDevices();
  return devices.length > 0;
}

