
/**
 * Share Target API Handler
 * 
 * Handles incoming shares from other apps
 * Processes shared text, URLs, and files
 */

export interface SharedData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/**
 * Parse shared data from FormData (Share Target API)
 */
export function parseSharedData(formData: FormData): SharedData {
  const title = formData.get('title') as string | null;
  const text = formData.get('text') as string | null;
  const url = formData.get('url') as string | null;
  const files = formData.getAll('media') as File[];

  return {
    title: title || undefined,
    text: text || undefined,
    url: url || undefined,
    files: files.length > 0 ? files : undefined,
  };
}

/**
 * Handle shared data and route to appropriate feature
 */
export function handleSharedData(data: SharedData): {
  route: string;
  mode?: string;
  params?: Record<string, any>;
} {
  // If URL shared, try to extract useful info
  if (data.url) {
    // Check if it's a QR code URL or payment link
    if (data.url.includes('momo') || data.url.includes('payment')) {
      return {
        route: '/?mode=momo',
        mode: 'momo',
        params: { sharedUrl: data.url },
      };
    }
    // Check if it's a business/marketplace link
    if (data.url.includes('business') || data.url.includes('marketplace')) {
      return {
        route: '/?mode=business',
        mode: 'business',
        params: { sharedUrl: data.url },
      };
    }
  }

  // If text shared, check if it's a search query
  if (data.text) {
    return {
      route: '/',
      mode: 'home',
      params: { searchQuery: data.text },
    };
  }

  // If files shared (images), could be for QR scanning or business listing
  if (data.files && data.files.length > 0) {
    // Check if image files
    const imageFiles = data.files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      return {
        route: '/?mode=scanner',
        mode: 'scanner',
        params: { sharedFiles: imageFiles },
      };
    }
  }

  // Default: route to home with shared data
  return {
    route: '/',
    mode: 'home',
    params: { sharedData: data },
  };
}

/**
 * Check if app was launched via Share Target
 */
export function isShareTargetLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check URL params for share indicator
  const params = new URLSearchParams(window.location.search);
  return params.has('share') || params.has('shared');
}

/**
 * Get shared data from URL or session storage
 */
export function getSharedData(): SharedData | null {
  try {
    const stored = sessionStorage.getItem('easymo_shared_data');
    if (stored) {
      const data = JSON.parse(stored);
      // Clear after reading
      sessionStorage.removeItem('easymo_shared_data');
      return data;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Store shared data temporarily
 */
export function storeSharedData(data: SharedData): void {
  try {
    sessionStorage.setItem('easymo_shared_data', JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

