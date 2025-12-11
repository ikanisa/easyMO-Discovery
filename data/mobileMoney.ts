
export interface CountryConfig {
  id: string;
  name: string;
  provider: string;
  sendFormat: string; // Use {p} for phone, {a} for amount, {m} for merchant code
  payFormat: string;
  currency: string;
  phoneHint: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    id: 'rw',
    name: 'Rwanda',
    provider: 'MTN MoMo',
    sendFormat: '*182*1*1*{p}*{a}#',
    payFormat: '*182*8*1*{m}*{a}#',
    currency: 'RWF',
    phoneHint: 'e.g. 078...'
  },
  {
    id: 'bi',
    name: 'Burundi',
    provider: 'Econet EcoCash',
    sendFormat: '*151*1*1*{p}*{a}#',
    payFormat: '*151*1*2*{m}*{a}#', // Inferred common format
    currency: 'BIF',
    phoneHint: 'e.g. 79...'
  },
  {
    id: 'cm',
    name: 'Cameroon',
    provider: 'MTN MoMo',
    sendFormat: '*126*2*{p}*{a}#',
    payFormat: '*126*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: 'e.g. 67...'
  },
  {
    id: 'mg',
    name: 'Madagascar',
    provider: 'Telma MVola',
    sendFormat: '#111*2*{p}*{a}#',
    payFormat: '#111*4*{m}*{a}#',
    currency: 'MGA',
    phoneHint: 'e.g. 34...'
  },
  {
    id: 'sc',
    name: 'Seychelles',
    provider: 'Airtel Money',
    sendFormat: '*202*{p}*{a}#',
    payFormat: '*202*{m}*{a}#',
    currency: 'SCR',
    phoneHint: 'e.g. 2...'
  },
  {
    id: 'tz',
    name: 'Tanzania',
    provider: 'Vodacom M-Pesa',
    sendFormat: '*150*00*{p}*{a}#',
    payFormat: '*150*00*{m}*{a}#',
    currency: 'TZS',
    phoneHint: 'e.g. 07...'
  },
  {
    id: 'zm',
    name: 'Zambia',
    provider: 'MTN MoMo',
    sendFormat: '*115*2*{p}*{a}#',
    payFormat: '*115*5*{m}*{a}#',
    currency: 'ZMW',
    phoneHint: 'e.g. 096...'
  },
  {
    id: 'zw',
    name: 'Zimbabwe',
    provider: 'Econet EcoCash',
    sendFormat: '*151*1*1*{p}*{a}#',
    payFormat: '*151*2*{m}*{a}#',
    currency: 'ZWL',
    phoneHint: 'e.g. 077...'
  },
  {
    id: 'mw',
    name: 'Malawi',
    provider: 'Airtel Money',
    sendFormat: '*211*{p}*{a}#',
    payFormat: '*211*{m}*{a}#',
    currency: 'MWK',
    phoneHint: 'e.g. 099...'
  },
  {
    id: 'na',
    name: 'Namibia',
    provider: 'MTC Money',
    sendFormat: '*140*682*{p}*{a}#',
    payFormat: '*140*682*{m}*{a}#',
    currency: 'NAD',
    phoneHint: 'e.g. 081...'
  },
  {
    id: 'gh',
    name: 'Ghana',
    provider: 'MTN MoMo',
    sendFormat: '*170*1*1*{p}*{a}#',
    payFormat: '*170*2*1*{m}*{a}#',
    currency: 'GHS',
    phoneHint: 'e.g. 024...'
  },
  {
    id: 'bj',
    name: 'Benin',
    provider: 'MTN MoMo',
    sendFormat: '*880*1*{p}*{a}#',
    payFormat: '*880*3*{m}*{a}#',
    currency: 'XOF',
    phoneHint: 'e.g. 01...'
  },
  {
    id: 'bf',
    name: 'Burkina Faso',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'XOF',
    phoneHint: 'e.g. 07...'
  },
  {
    id: 'cf',
    name: 'Central African Rep.',
    provider: 'Orange Money',
    sendFormat: '#150*2*{p}*{a}#',
    payFormat: '#150*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: 'e.g. 75...'
  },
  {
    id: 'td',
    name: 'Chad',
    provider: 'Airtel Money',
    sendFormat: '*211*{p}*{a}#',
    payFormat: '*211*{m}*{a}#',
    currency: 'XAF',
    phoneHint: 'e.g. 66...'
  },
  {
    id: 'km',
    name: 'Comoros',
    provider: 'Telma/YAZ MVola',
    sendFormat: '*150*01*1*1*{p}*{a}#',
    payFormat: '*150*01*1*2*{m}*{a}#',
    currency: 'KMF',
    phoneHint: 'e.g. 3...'
  },
  {
    id: 'cg',
    name: 'Congo (Republic)',
    provider: 'MTN MoMo',
    sendFormat: '*133*2*{p}*{a}#',
    payFormat: '*133*5*{m}*{a}#',
    currency: 'XAF',
    phoneHint: 'e.g. 06...'
  },
  {
    id: 'ci',
    name: 'Côte d’Ivoire',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'XOF',
    phoneHint: 'e.g. 07...'
  },
  {
    id: 'cd',
    name: 'DR Congo',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'CDF',
    phoneHint: 'e.g. 089...'
  },
  {
    id: 'dj',
    name: 'Djibouti',
    provider: 'Djibouti Telecom',
    sendFormat: '*131*{p}*{a}#',
    payFormat: '*133*{m}*{a}#',
    currency: 'DJF',
    phoneHint: 'e.g. 77...'
  },
  {
    id: 'gq',
    name: 'Equatorial Guinea',
    provider: 'GETESA',
    sendFormat: '*222*2*{p}*{a}#',
    payFormat: '*222*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: 'e.g. 222...'
  },
  {
    id: 'ga',
    name: 'Gabon',
    provider: 'Airtel Money',
    sendFormat: '*150*2*{p}*{a}#',
    payFormat: '*150*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: 'e.g. 074...'
  },
  {
    id: 'gn',
    name: 'Guinea (Conakry)',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'GNF',
    phoneHint: 'e.g. 622...'
  },
  {
    id: 'ml',
    name: 'Mali',
    provider: 'Orange Money',
    sendFormat: '#144#*1*{p}*{a}#',
    payFormat: '#144#*2*{m}*{a}#',
    currency: 'XOF',
    phoneHint: 'e.g. 70...'
  },
  {
    id: 'mr',
    name: 'Mauritania',
    provider: 'Moov Mauritel',
    sendFormat: '*900*2*{p}*{a}#',
    payFormat: '*900*4*{m}*{a}#',
    currency: 'MRU',
    phoneHint: 'e.g. 4...'
  },
  {
    id: 'ne',
    name: 'Niger',
    provider: 'Airtel Money',
    sendFormat: '*400*{p}*{a}#',
    payFormat: '*400*{m}*{a}#',
    currency: 'XOF',
    phoneHint: 'e.g. 9...'
  },
  {
    id: 'sn',
    name: 'Senegal',
    provider: 'Orange Money',
    sendFormat: '#144*1*{p}*{a}#',
    payFormat: '#144*2*{m}*{a}#',
    currency: 'XOF',
    phoneHint: 'e.g. 77...'
  },
  {
    id: 'tg',
    name: 'Togo',
    provider: 'Togocom T-Money',
    sendFormat: '*145*1*{a}*{p}#', // Note: amount before phone
    payFormat: '*145*3*{m}*{a}#', // Agent withdrawal format as proxy
    currency: 'XOF',
    phoneHint: 'e.g. 90...'
  }
];
