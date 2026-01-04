export const StorageService = {
  isSupported: () => 'storage' in navigator && !!navigator.storage,

  async isPersisted() {
    if (!StorageService.isSupported()) return false;
    return navigator.storage.persisted();
  },

  async requestPersistence() {
    if (!StorageService.isSupported()) return false;
    return navigator.storage.persist();
  },
};
