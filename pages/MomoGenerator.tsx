
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ICONS } from '../constants';
import { COUNTRIES } from '../data/mobileMoney';
import Button from '../components/Button';

interface MomoGeneratorProps {
  onBack: () => void;
}

const MomoGenerator: React.FC<MomoGeneratorProps> = ({ onBack }) => {
  const [selectedCountryId, setSelectedCountryId] = useState<string>('rw');
  const [txType, setTxType] = useState<'send' | 'pay'>('pay');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [merchantCode, setMerchantCode] = useState('');
  
  const [generatedUssd, setGeneratedUssd] = useState('');
  const [qrSrc, setQrSrc] = useState<string>('');
  const [isGenerated, setIsGenerated] = useState(false);

  const country = COUNTRIES.find(c => c.id === selectedCountryId) || COUNTRIES[0];

  // Reset generated state when inputs change to indicate staleness
  useEffect(() => {
    setIsGenerated(false);
  }, [selectedCountryId, txType, phoneNumber, amount, merchantCode]);

  const handleGenerate = async () => {
    // 1. Construct USSD Code
    const template = txType === 'send' ? country.sendFormat : country.payFormat;
    
    let code = template;
    code = code.replace('{p}', phoneNumber || '');
    code = code.replace('{m}', merchantCode || '');
    
    // Handle Optional Amount
    if (amount) {
      code = code.replace('{a}', amount);
    } else {
      // Clean removal of amount placeholder if empty
      // Try to remove preceding * as well if present
      code = code.replace('*{a}', '').replace('{a}', '');
    }

    // Clean up any potential double asterisks from empty replacements just in case
    code = code.replace(/\*\*/g, '*');

    setGeneratedUssd(code);

    // 2. Generate QR Image
    try {
        // Encode special characters for URI
        const qrValue = `tel:${code.replace(/#/g, '%23')}`;
        
        const url = await QRCode.toDataURL(qrValue, {
            width: 600, // High res
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
        });
        setQrSrc(url);
        setIsGenerated(true);
    } catch (e) {
        console.error("QR Gen Error", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] absolute inset-0 z-50 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="h-16 glass-panel flex items-center px-4 justify-between shrink-0 border-b border-white/5 bg-[#0f172a]/95 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
           <ICONS.ChevronDown className="w-6 h-6 rotate-90" />
        </button>
        <div className="font-bold text-lg">MoMo QR Generator</div>
        <div className="w-8" />
      </div>

      <div className="p-6 pb-32 max-w-lg mx-auto w-full">
        
        {/* Country Selector */}
        <div className="mb-8">
          <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">
            Select Country
          </label>
          <div className="relative">
            <select 
              value={selectedCountryId}
              onChange={(e) => {
                setSelectedCountryId(e.target.value);
                setPhoneNumber('');
                setMerchantCode('');
                setIsGenerated(false);
              }}
              className="w-full appearance-none bg-slate-800 border border-white/10 rounded-2xl px-5 py-4 text-lg font-bold text-white focus:outline-none focus:border-blue-500 shadow-lg"
            >
              {COUNTRIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.provider})
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ICONS.ChevronDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Transaction Type */}
        <div className="flex bg-slate-800 p-1.5 rounded-2xl mb-8 border border-white/5">
          <button 
            onClick={() => setTxType('pay')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${txType === 'pay' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Pay Merchant
          </button>
          <button 
            onClick={() => setTxType('send')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${txType === 'send' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Send Money
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-6 mb-8">
          {txType === 'pay' ? (
             <div>
               <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-2">
                 Merchant/Bill Code
               </label>
               <input 
                 type="number" 
                 value={merchantCode}
                 onChange={(e) => setMerchantCode(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-bold text-white focus:border-blue-500 outline-none font-mono placeholder-slate-600 transition-colors focus:bg-white/10"
                 placeholder="e.g. 123456"
               />
             </div>
          ) : (
             <div>
               <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-2">
                 Recipient Phone
               </label>
               <input 
                 type="tel" 
                 value={phoneNumber}
                 onChange={(e) => setPhoneNumber(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-bold text-white focus:border-blue-500 outline-none font-mono placeholder-slate-600 transition-colors focus:bg-white/10"
                 placeholder={country.phoneHint}
               />
             </div>
          )}

          <div>
             <div className="flex justify-between items-end mb-2">
               <label className="block text-sm font-black text-slate-400 uppercase tracking-widest">
                 Amount ({country.currency})
               </label>
               <span className="text-xs font-bold text-slate-500 uppercase bg-slate-800 px-2 py-1 rounded">Optional</span>
             </div>
             <input 
               type="number" 
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-bold text-white focus:border-blue-500 outline-none font-mono placeholder-slate-600 transition-colors focus:bg-white/10"
               placeholder="e.g. 5000"
             />
          </div>
        </div>

        {/* Action Button */}
        <Button 
          fullWidth 
          variant="primary" 
          onClick={handleGenerate}
          className="h-14 text-base shadow-xl mb-8"
          icon={<ICONS.QrCode className="w-5 h-5" />}
        >
          Generate QR Code
        </Button>

        {/* Output Section */}
        {isGenerated && (
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center shadow-2xl shadow-black/50 border border-white/10 animate-in slide-in-from-bottom-6 fade-in duration-500">
            <h3 className="text-slate-900 font-extrabold mb-4 text-center w-full border-b border-slate-100 pb-3 text-lg">
              Scan to Pay
            </h3>
            
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-inner">
               {qrSrc ? (
                 <img 
                   src={qrSrc} 
                   alt="Scan this QR" 
                   className="w-56 h-56 object-contain"
                 />
               ) : (
                 <div className="w-56 h-56 flex items-center justify-center text-slate-300 bg-slate-50 rounded-lg animate-pulse">
                   Generating...
                 </div>
               )}
            </div>

            <div className="mt-6 w-full bg-slate-100 rounded-xl p-4 text-center border border-slate-200">
               <div className="text-[10px] text-slate-500 font-black uppercase mb-1 tracking-widest">USSD Code</div>
               <div className="font-mono text-slate-900 font-bold text-xl break-all">
                 {generatedUssd}
               </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-4 text-center leading-tight max-w-[200px]">
               Use your phone camera or MoMo app to scan. 
               Ensure brightness is high.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default MomoGenerator;
