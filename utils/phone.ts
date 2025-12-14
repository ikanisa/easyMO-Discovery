
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
  let raw = phone.toString().trim();

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
 * Valid Rwandan phone number prefixes after country code (250).
 * MTN Rwanda: 78x, 79x
 * Airtel Rwanda: 72x, 73x
 */
const VALID_RWANDA_PREFIXES = ['78', '79', '72', '73'];

/**
 * Validates if a phone number appears to be a legitimate Rwandan number.
 * This helps filter out AI-generated/hallucinated phone numbers before broadcast.
 * 
 * Checks:
 * 1. Must be in valid E.164 format
 * 2. Must be a Rwanda number (+250)
 * 3. Must have a valid Rwandan carrier prefix
 * 4. Must have exactly 12 digits total (+250 + 9 digits)
 * 5. Must not have suspicious patterns (e.g., sequential digits, all same digit)
 */
export const isValidRwandanPhoneNumber = (phone: string | null): boolean => {
  if (!phone) return false;
  
  // Must start with +250
  if (!phone.startsWith('+250')) return false;
  
  // Rwanda numbers should be exactly 12 characters (+250 + 9 digits)
  if (phone.length !== 12) return false;
  
  const localNumber = phone.substring(4); // Remove +250
  
  // Must start with valid carrier prefix
  const prefix = localNumber.substring(0, 2);
  if (!VALID_RWANDA_PREFIXES.includes(prefix)) return false;
  
  // Check for suspicious patterns that indicate AI hallucination
  // Pattern 1: Sequential digits (e.g., 123456789)
  const isSequential = '123456789'.includes(localNumber) || '987654321'.includes(localNumber);
  if (isSequential) return false;
  
  // Pattern 2: All same digit (e.g., 777777777)
  const allSameDigit = /^(\d)\1{8}$/.test(localNumber);
  if (allSameDigit) return false;
  
  // Pattern 3: Repeating pattern (e.g., 787878787)
  const repeatingPattern = /^(\d{1,3})\1{2,}/.test(localNumber);
  if (repeatingPattern && localNumber.length <= 9) return false;
  
  return true;
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
