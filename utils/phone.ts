
/**
 * Normalizes phone numbers to strict E.164 International format.
 * Format: +<CountryCode><SubscriberNumber>
 * Example: +250788123456
 * 
 * Handles:
 * - Removing non-numeric chars ((), -, spaces)
 * - Replacing leading '0' with defaultCountryCode
 * - Prepending '+' if missing
 * - Validating length (E.164 is max 15 digits)
 */
export const normalizePhoneNumber = (phone: string, defaultCountryCode: string = '250'): string | null => {
  if (!phone) return null;

  // 1. Remove all characters except digits and the leading '+'
  // Note: We intentionally strip '+' if it's not at the start to fix messy inputs like "++" or "+ 250"
  let cleaned = phone.trim();
  
  const hasLeadingPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, ''); // Remove non-digits

  // 2. Logic to construct the full number
  if (hasLeadingPlus) {
    // Already had a plus, so we treat the digits as full international
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // Local format (e.g., 078...) -> Remove 0, prepend country code
    cleaned = '+' + defaultCountryCode + cleaned.substring(1);
  } else if (cleaned.startsWith(defaultCountryCode)) {
    // Starts with country code but missing plus (e.g. 25078...)
    cleaned = '+' + cleaned;
  } else {
    // Heuristic: If length matches the default country's expected local length without 0 (e.g., 9 for RW)
    // prepend country code. Otherwise, assume it might be international without plus.
    if (cleaned.length === 9 && defaultCountryCode === '250') {
       cleaned = '+' + defaultCountryCode + cleaned;
    } else {
       // Fallback: Assume it's a full number missing the plus
       cleaned = '+' + cleaned;
    }
  }

  // 3. E.164 Validation
  // Must start with +, followed by 7 to 15 digits
  const e164Regex = /^\+\d{7,15}$/;
  
  if (!e164Regex.test(cleaned)) {
    return null; 
  }

  return cleaned;
};

/**
 * Batch normalizes a list of businesses, filtering out those without valid phones.
 * Also deduplicates based on phone number to prevent spamming the same merchant.
 */
export const normalizeBusinessContacts = (businesses: {name: string, phone?: string}[]) => {
    const seenPhones = new Set<string>();
    
    return businesses
        .map(b => ({
            ...b,
            phone: b.phone ? normalizePhoneNumber(b.phone) : null
        }))
        .filter((b): b is {name: string, phone: string} => {
            if (!b.phone) return false;
            if (seenPhones.has(b.phone)) return false;
            seenPhones.add(b.phone);
            return true;
        });
};
