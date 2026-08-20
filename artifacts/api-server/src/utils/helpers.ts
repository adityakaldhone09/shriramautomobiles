import crypto from 'crypto';

/**
 * Generate a unique booking ID
 * Format: SHA-YYYY-XXXXXX (e.g., SHA-2026-A7F92X)
 */
export function generateBookingId(): string {
  const year = new Date().getFullYear();
  const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SHA-${year}-${randomString}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (Indian)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/[\s\-\+]/g, ''));
}

/**
 * Validate registration number format
 */
export function isValidRegistrationNumber(regNumber: string): boolean {
  // Basic validation - can be enhanced
  return regNumber.length >= 6 && regNumber.length <= 12;
}

/**
 * Get time slots for a given date
 */
export function getAvailableTimeSlots(): string[] {
  return [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
  ];
}

/**
 * Check if a date is valid and not in the past
 */
export function isValidFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Format response for API responses
 */
export function createResponse<T>(
  success: boolean,
  message: string,
  data?: T,
  error?: string
) {
  return {
    success,
    message,
    data,
    error,
  };
}
