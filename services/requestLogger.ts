
import { getCurrentPosition } from './location';

const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwz5dainA_f7SPKxLBvlN7yDuP53ZPyQOxVRXkbxrMpLOFy-52unhxy94VTcr7qX_yO/exec";

export const sendCategoryRequest = async (categoryName: string) => {
  // 1. Show Toast immediately for instant feedback
  const toast = document.createElement('div');
  // Styling to match the glassmorphism/tailwind theme
  toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md border border-white/10 z-[100] flex items-center gap-2 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300";
  toast.innerHTML = `<span class="animate-pulse">🔍</span> <span>Searching for ${categoryName} near you...</span>`;
  document.body.appendChild(toast);

  // Auto-remove toast after 2.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 2500);

  // 2. Gather Data
  const phone = localStorage.getItem('easyMO_user_phone') || 'Unknown';
  let location = 'Unknown';

  try {
    // Attempt to get location
    const pos = await getCurrentPosition();
    location = `${pos.lat},${pos.lng}`;
  } catch (e) {
    console.debug("Location unavailable for background log", e);
  }

  // 3. Send Request to Google Sheet
  const payload = {
    action: "create_request",
    phone: phone,
    need: categoryName,
    location: location
  };

  try {
    // Using no-cors mode for simple fire-and-forget to Google Scripts
    await fetch(BACKEND_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("Failed to send category request log", e);
  }
};
