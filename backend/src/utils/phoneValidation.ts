export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates and normalizes Indian phone numbers
 * Accepts formats: 9876543210, +919876543210, 919876543210, 98765 43210, etc.
 * Returns normalized 10-digit format
 */
export function validateIndianPhoneNumber(phoneNumber: string): PhoneValidationResult {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'Phone number is required'
    };
  }

  // Remove spaces, dashes, parentheses, and other formatting characters
  const cleaned = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  
  // Handle country code prefixes (91 or +91)
  let normalized = cleaned;
  if (normalized.startsWith('91') && normalized.length === 12) {
    normalized = normalized.substring(2);
  }
  
  // Validate 10-digit format starting with 6, 7, 8, or 9 (valid Indian mobile prefixes)
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Invalid Indian mobile number format. Must be 10 digits starting with 6, 7, 8, or 9'
    };
  }
  
  return {
    isValid: true,
    normalized
  };
}

/**
 * Validates multiple phone numbers and returns categorized results
 */
export function validatePhoneNumbers(phoneNumbers: string[]): {
  valid: string[];
  invalid: { phoneNumber: string; error: string }[];
  duplicates: string[];
} {
  const valid: string[] = [];
  const invalid: { phoneNumber: string; error: string }[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const phoneNumber of phoneNumbers) {
    const trimmed = phoneNumber.trim();
    if (!trimmed) continue; // Skip empty lines

    const validation = validateIndianPhoneNumber(trimmed);
    
    if (!validation.isValid) {
      invalid.push({
        phoneNumber: trimmed,
        error: validation.error || 'Invalid format'
      });
      continue;
    }

    // Check for duplicates within the input
    if (seen.has(validation.normalized)) {
      duplicates.push(trimmed);
      continue;
    }

    seen.add(validation.normalized);
    valid.push(validation.normalized);
  }

  return { valid, invalid, duplicates };
}
