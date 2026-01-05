
export interface CountryConfig {
  id: string;
  name: string;
  provider: string;
  sendFormat: string; // Use {p} for phone, {a} for amount, {m} for merchant code
  payFormat: string;
  currency: string;
  phoneHint: string;
  callingCode: string;
  flag: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    id: 'rw',
    name: 'Rwanda',
    provider: 'MTN MoMo',
    sendFormat: '*182*1*1*{p}*{a}#',
    payFormat: '*182*8*1*{m}*{a}#',
    currency: 'RWF',
    phoneHint: '78...',
    callingCode: '+250',
    flag: '🇷🇼'
  },
  {
    id: 'bi',
    name: 'Burundi',
    provider: 'Econet EcoCash',
    sendFormat: '*151*1*1*{p}*{a}#',
    payFormat: '*151*1*2*{m}*{a}#', 
    currency: 'BIF',
    phoneHint: '79...',
    callingCode: '+257',
    flag: '🇧🇮'
  },
  {
    id: 'cm',
    name: 'Cameroon',
    provider: 'MTN MoMo',
    sendFormat: '*126*2*{p}*{a}#',
    payFormat: '*126*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: '67...',
    callingCode: '+237',
    flag: '🇨🇲'
  },
  {
    id: 'mg',
    name: 'Madagascar',
    provider: 'Telma MVola',
    sendFormat: '#111*2*{p}*{a}#',
    payFormat: '#111*4*{m}*{a}#',
    currency: 'MGA',
    phoneHint: '34...',
    callingCode: '+261',
    flag: '🇲🇬'
  },
  {
    id: 'sc',
    name: 'Seychelles',
    provider: 'Airtel Money',
    sendFormat: '*202*{p}*{a}#',
    payFormat: '*202*{m}*{a}#',
    currency: 'SCR',
    phoneHint: '2...',
    callingCode: '+248',
    flag: '🇸🇨'
  },
  {
    id: 'tz',
    name: 'Tanzania',
    provider: 'Vodacom M-Pesa',
    sendFormat: '*150*00*{p}*{a}#',
    payFormat: '*150*00*{m}*{a}#',
    currency: 'TZS',
    phoneHint: '07...',
    callingCode: '+255',
    flag: '🇹🇿'
  },
  {
    id: 'zm',
    name: 'Zambia',
    provider: 'MTN MoMo',
    sendFormat: '*115*2*{p}*{a}#',
    payFormat: '*115*5*{m}*{a}#',
    currency: 'ZMW',
    phoneHint: '096...',
    callingCode: '+260',
    flag: '🇿🇲'
  },
  {
    id: 'zw',
    name: 'Zimbabwe',
    provider: 'Econet EcoCash',
    sendFormat: '*151*1*1*{p}*{a}#',
    payFormat: '*151*2*{m}*{a}#',
    currency: 'ZWL',
    phoneHint: '077...',
    callingCode: '+263',
    flag: '🇿🇼'
  },
  {
    id: 'mw',
    name: 'Malawi',
    provider: 'Airtel Money',
    sendFormat: '*211*{p}*{a}#',
    payFormat: '*211*{m}*{a}#',
    currency: 'MWK',
    phoneHint: '099...',
    callingCode: '+265',
    flag: '🇲🇼'
  },
  {
    id: 'na',
    name: 'Namibia',
    provider: 'MTC Money',
    sendFormat: '*140*682*{p}*{a}#',
    payFormat: '*140*682*{m}*{a}#',
    currency: 'NAD',
    phoneHint: '081...',
    callingCode: '+264',
    flag: '🇳🇦'
  },
  {
    id: 'gh',
    name: 'Ghana',
    provider: 'MTN MoMo',
    sendFormat: '*170*1*1*{p}*{a}#',
    payFormat: '*170*2*1*{m}*{a}#',
    currency: 'GHS',
    phoneHint: '024...',
    callingCode: '+233',
    flag: '🇬🇭'
  },
  {
    id: 'bj',
    name: 'Benin',
    provider: 'MTN MoMo',
    sendFormat: '*880*1*{p}*{a}#',
    payFormat: '*880*3*{m}*{a}#',
    currency: 'XOF',
    phoneHint: '01...',
    callingCode: '+229',
    flag: '🇧🇯'
  },
  {
    id: 'bf',
    name: 'Burkina Faso',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'XOF',
    phoneHint: '07...',
    callingCode: '+226',
    flag: '🇧🇫'
  },
  {
    id: 'cf',
    name: 'Central African Rep.',
    provider: 'Orange Money',
    sendFormat: '#150*2*{p}*{a}#',
    payFormat: '#150*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: '75...',
    callingCode: '+236',
    flag: '🇨🇫'
  },
  {
    id: 'td',
    name: 'Chad',
    provider: 'Airtel Money',
    sendFormat: '*211*{p}*{a}#',
    payFormat: '*211*{m}*{a}#',
    currency: 'XAF',
    phoneHint: '66...',
    callingCode: '+235',
    flag: '🇹🇩'
  },
  {
    id: 'km',
    name: 'Comoros',
    provider: 'Telma/YAZ MVola',
    sendFormat: '*150*01*1*1*{p}*{a}#',
    payFormat: '*150*01*1*2*{m}*{a}#',
    currency: 'KMF',
    phoneHint: '3...',
    callingCode: '+269',
    flag: '🇰🇲'
  },
  {
    id: 'cg',
    name: 'Congo (Republic)',
    provider: 'MTN MoMo',
    sendFormat: '*133*2*{p}*{a}#',
    payFormat: '*133*5*{m}*{a}#',
    currency: 'XAF',
    phoneHint: '06...',
    callingCode: '+242',
    flag: '🇨🇬'
  },
  {
    id: 'ci',
    name: 'Côte d’Ivoire',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'XOF',
    phoneHint: '07...',
    callingCode: '+225',
    flag: '🇨🇮'
  },
  {
    id: 'cd',
    name: 'DR Congo',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'CDF',
    phoneHint: '089...',
    callingCode: '+243',
    flag: '🇨🇩'
  },
  {
    id: 'dj',
    name: 'Djibouti',
    provider: 'Djibouti Telecom',
    sendFormat: '*131*{p}*{a}#',
    payFormat: '*133*{m}*{a}#',
    currency: 'DJF',
    phoneHint: '77...',
    callingCode: '+253',
    flag: '🇩🇯'
  },
  {
    id: 'gq',
    name: 'Equatorial Guinea',
    provider: 'GETESA',
    sendFormat: '*222*2*{p}*{a}#',
    payFormat: '*222*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: '222...',
    callingCode: '+240',
    flag: '🇬🇶'
  },
  {
    id: 'ga',
    name: 'Gabon',
    provider: 'Airtel Money',
    sendFormat: '*150*2*{p}*{a}#',
    payFormat: '*150*4*{m}*{a}#',
    currency: 'XAF',
    phoneHint: '074...',
    callingCode: '+241',
    flag: '🇬🇦'
  },
  {
    id: 'gn',
    name: 'Guinea (Conakry)',
    provider: 'Orange Money',
    sendFormat: '*144*1*{p}*{a}#',
    payFormat: '*144*4*{m}*{a}#',
    currency: 'GNF',
    phoneHint: '622...',
    callingCode: '+224',
    flag: '🇬🇳'
  },
  {
    id: 'ml',
    name: 'Mali',
    provider: 'Orange Money',
    sendFormat: '#144#*1*{p}*{a}#',
    payFormat: '#144#*2*{m}*{a}#',
    currency: 'XOF',
    phoneHint: '70...',
    callingCode: '+223',
    flag: '🇲🇱'
  },
  {
    id: 'mr',
    name: 'Mauritania',
    provider: 'Moov Mauritel',
    sendFormat: '*900*2*{p}*{a}#',
    payFormat: '*900*4*{m}*{a}#',
    currency: 'MRU',
    phoneHint: '4...',
    callingCode: '+222',
    flag: '🇲🇷'
  },
  {
    id: 'ne',
    name: 'Niger',
    provider: 'Airtel Money',
    sendFormat: '*400*{p}*{a}#',
    payFormat: '*400*{m}*{a}#',
    currency: 'XOF',
    phoneHint: '9...',
    callingCode: '+227',
    flag: '🇳🇪'
  },
  {
    id: 'sn',
    name: 'Senegal',
    provider: 'Orange Money',
    sendFormat: '#144*1*{p}*{a}#',
    payFormat: '#144*2*{m}*{a}#',
    currency: 'XOF',
    phoneHint: '77...',
    callingCode: '+221',
    flag: '🇸🇳'
  },
  {
    id: 'tg',
    name: 'Togo',
    provider: 'Togocom T-Money',
    sendFormat: '*145*1*{a}*{p}#',
    payFormat: '*145*3*{m}*{a}#',
    currency: 'XOF',
    phoneHint: '90...',
    callingCode: '+228',
    flag: '🇹🇬'
  }
];
