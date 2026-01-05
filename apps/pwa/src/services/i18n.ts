/**
 * i18n Service - Localization scaffold for low-literacy friendly labels
 */

export type Language = 'en' | 'rw' | 'fr';

interface Labels {
  quickActions: {
    nearbyDrivers: string;
    nearbyPassengers: string;
    buySell: string;
    generateQR: string;
    scanQR: string;
    onboardBusiness: string;
  };
  location: {
    permissionTitle: string;
    permissionMessage: string;
    allowLocation: string;
    enterManually: string;
    notNow: string;
    lastUpdated: string;
    goOffline: string;
    goOnline: string;
  };
  chat: {
    placeholder: string;
    send: string;
    typing: string;
  };
  cards: {
    requestRide: string;
    accept: string;
    viewDetails: string;
    contact: string;
    shareQR: string;
    copyUSSD: string;
    pay: string;
    copy: string;
  };
}

const labels: Record<Language, Labels> = {
  en: {
    quickActions: {
      nearbyDrivers: 'Nearby Drivers',
      nearbyPassengers: 'Nearby Passengers',
      buySell: 'Buy/Sell',
      generateQR: 'Generate MoMo QR',
      scanQR: 'Scan QR',
      onboardBusiness: 'Onboard Business',
    },
    location: {
      permissionTitle: 'We Need Your Location',
      permissionMessage: 'We need your location to find nearby drivers and businesses.',
      allowLocation: 'Allow Location Access',
      enterManually: 'Enter Address Manually',
      notNow: 'Not Now',
      lastUpdated: 'Location updated {minutes} min ago',
      goOffline: 'Go Offline',
      goOnline: 'Go Online',
    },
    chat: {
      placeholder: 'Type a message...',
      send: 'Send',
      typing: 'AI is thinking...',
    },
    cards: {
      requestRide: 'Request Ride',
      accept: 'Accept',
      viewDetails: 'View Details',
      contact: 'Contact',
      shareQR: 'Share QR',
      copyUSSD: 'Copy USSD',
      pay: 'Pay',
      copy: 'Copy',
    },
  },
  rw: {
    quickActions: {
      nearbyDrivers: 'Abashoferi Bari Hafi',
      nearbyPassengers: 'Abagenzi Bari Hafi',
      buySell: 'Gura/Gurisha',
      generateQR: 'Kora MoMo QR',
      scanQR: 'Skena QR',
      onboardBusiness: 'Ongeramo Ubucuruzi',
    },
    location: {
      permissionTitle: 'Dukeneye Aho Uri',
      permissionMessage: 'Dukeneye aho uri kugirango dushake abashoferi n\'amabwiriza bari hafi.',
      allowLocation: 'Emera Gukoresha Aho Uri',
      enterManually: 'Andika Aderesi',
      notNow: 'Oya Ubu',
      lastUpdated: 'Aho uri vugururwa amashimwe {minutes}',
      goOffline: 'Genda Offline',
      goOnline: 'Genda Online',
    },
    chat: {
      placeholder: 'Andika ubutumwa...',
      send: 'Ohereza',
      typing: 'AI iri gutekereza...',
    },
    cards: {
      requestRide: 'Saba Gari',
      accept: 'Emera',
      viewDetails: 'Reba Ibindi',
      contact: 'Vugana',
      shareQR: 'Sangiza QR',
      copyUSSD: 'Koporora USSD',
      pay: 'Kwishyura',
      copy: 'Koporora',
    },
  },
  fr: {
    quickActions: {
      nearbyDrivers: 'Conducteurs Proches',
      nearbyPassengers: 'Passagers Proches',
      buySell: 'Acheter/Vendre',
      generateQR: 'Générer QR MoMo',
      scanQR: 'Scanner QR',
      onboardBusiness: 'Inscrire Entreprise',
    },
    location: {
      permissionTitle: 'Nous Avons Besoin de Votre Localisation',
      permissionMessage: 'Nous avons besoin de votre localisation pour trouver des conducteurs et des entreprises à proximité.',
      allowLocation: 'Autoriser l\'Accès à la Localisation',
      enterManually: 'Entrer l\'Adresse Manuellement',
      notNow: 'Pas Maintenant',
      lastUpdated: 'Localisation mise à jour il y a {minutes} min',
      goOffline: 'Passer Hors Ligne',
      goOnline: 'Passer En Ligne',
    },
    chat: {
      placeholder: 'Tapez un message...',
      send: 'Envoyer',
      typing: 'L\'IA réfléchit...',
    },
    cards: {
      requestRide: 'Demander un Trajet',
      accept: 'Accepter',
      viewDetails: 'Voir Détails',
      contact: 'Contacter',
      shareQR: 'Partager QR',
      copyUSSD: 'Copier USSD',
      pay: 'Payer',
      copy: 'Copier',
    },
  },
};

class I18nService {
  private currentLanguage: Language = 'en';

  constructor() {
    // Load from localStorage or detect browser language
    const stored = localStorage.getItem('easymo_language') as Language;
    if (stored && (stored === 'en' || stored === 'rw' || stored === 'fr')) {
      this.currentLanguage = stored;
    } else {
      // Detect browser language
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'rw' || browserLang === 'fr') {
        this.currentLanguage = browserLang;
      }
    }
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  setLanguage(lang: Language): void {
    this.currentLanguage = lang;
    localStorage.setItem('easymo_language', lang);
  }

  t(key: keyof Labels): Labels[keyof Labels] {
    return labels[this.currentLanguage][key];
  }

  format(key: keyof Labels, params: Record<string, string | number>): string {
    let text = this.t(key) as any;
    if (typeof text === 'string') {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, String(value));
      });
    }
    return text;
  }
}

export const i18n = new I18nService();

