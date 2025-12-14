import type { PropertyListing } from '../types';

export type RealEstateFavorite = {
  id: string;
  saved_at: number;
  property: PropertyListing;
  notes?: string;
};

export type ViewingRequest = {
  id: string;
  created_at: number;
  property: PropertyListing;
  preferred_date?: string;
  preferred_time?: string;
  user_phone?: string;
  notes?: string;
  status: 'pending' | 'requested';
};

const FAVORITES_KEY = 'easyMO_keza_favorites_v1';
const VIEWINGS_KEY = 'easyMO_keza_viewings_v1';

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

const buildStableId = (property: PropertyListing) => {
  if (property.source_url) return `url:${property.source_url}`;
  const phone = property.contact_phone || '';
  return `prop:${property.id}:${property.title}:${phone}`;
};

export const getFavorites = (): RealEstateFavorite[] => {
  const data = readJson<unknown>(FAVORITES_KEY, []);
  return Array.isArray(data) ? (data as RealEstateFavorite[]) : [];
};

export const addFavorite = (property: PropertyListing, notes?: string): RealEstateFavorite => {
  const favorites = getFavorites();
  const id = buildStableId(property);
  const existingIndex = favorites.findIndex((f) => f.id === id);
  const next: RealEstateFavorite = {
    id,
    saved_at: Date.now(),
    property,
    ...(notes ? { notes } : {}),
  };

  if (existingIndex >= 0) favorites[existingIndex] = next;
  else favorites.unshift(next);

  writeJson(FAVORITES_KEY, favorites.slice(0, 200));
  return next;
};

export const removeFavorite = (favoriteId: string) => {
  const favorites = getFavorites().filter((f) => f.id !== favoriteId);
  writeJson(FAVORITES_KEY, favorites);
};

export const getViewings = (): ViewingRequest[] => {
  const data = readJson<unknown>(VIEWINGS_KEY, []);
  return Array.isArray(data) ? (data as ViewingRequest[]) : [];
};

export const addViewingRequest = (input: Omit<ViewingRequest, 'id' | 'created_at'>): ViewingRequest => {
  const viewings = getViewings();
  const request: ViewingRequest = {
    ...input,
    id: `view:${Date.now()}`,
    created_at: Date.now(),
  };
  viewings.unshift(request);
  writeJson(VIEWINGS_KEY, viewings.slice(0, 200));
  return request;
};

export const getUserPhoneFromStorage = (): string | null => {
  if (typeof localStorage === 'undefined') return null;
  const phone = localStorage.getItem('easyMO_user_phone');
  if (!phone) return null;
  return phone.trim() || null;
};

