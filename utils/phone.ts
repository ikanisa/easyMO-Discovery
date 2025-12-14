
/**
 * Normalizes phone numbers to strict E.164 International format.
 * Format: +<CountryCode><SubscriberNumber>
 * Example: +250788123456
 *
 * Logic:
 * 1. Cleans input (removes spaces, parens, dashes).
 * 2. Detects International format (+... or 00...).
 * 3. Detects Local format (0...) -> strips 0, adds default code.
 * 4. Detects Raw Local (78...) -> adds default code.
 * 5. Handles "Double Prefix" edge case (e.g. +250078...) by stripping the extra 0.
 * 6. Validates length (7-15 digits per E.164).
 */
export const normalizePhoneNumber = (phone: string, defaultCountryCode: string = '250'): string | null => {
  if (!phone) return null;

  // 1. Initial cleanup: Remove common separators
  const raw = phone.toString().trim();

  // Check for international prefix '+' before stripping non-digits
  const hasLeadingPlus = raw.startsWith('+');

  // Strip all non-numeric characters
  let digits = raw.replace(/\D/g, '');

  // Handle empty after strip
  if (!digits) return null;

  // 2. Handle International Prefix "00" (Standard E.164 replacement)
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // 3. Logic Tree for Country Code application

  // If the number starts with the default country code (e.g., 250...)
  if (digits.startsWith(defaultCountryCode)) {
     // Edge Case Correction: User typed "250" then "078..." resulting in "250078..."
     const remainder = digits.substring(defaultCountryCode.length);
     if (remainder.startsWith('0')) {
        // Strip the '0' after the country code
        digits = defaultCountryCode + remainder.substring(1);
     }
  } 
  // If it starts with '0' (Local format e.g. 078...)
  else if (digits.startsWith('0')) {
    // Remove '0' and prepend country code
    digits = defaultCountryCode + digits.substring(1);
  }
  // If it doesn't start with country code AND wasn't explicitly marked international with '+'
  // We assume it's a raw local number (e.g. 788...)
  else if (!hasLeadingPlus) {
    digits = defaultCountryCode + digits;
  }
  
  // 4. E.164 Validation
  // Format: +[1-15 digits]
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return '+' + digits;
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
