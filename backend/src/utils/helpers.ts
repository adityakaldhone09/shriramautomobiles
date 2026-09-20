import crypto from 'crypto';

export function generateBookingId(): string {
  const year = new Date().getFullYear();
  const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SHA-${year}-${randomString}`;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/[\s\-\+]/g, ''));
}

export function isValidRegistrationNumber(regNumber: string): boolean {
  return regNumber.length >= 6 && regNumber.length <= 12;
}

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
