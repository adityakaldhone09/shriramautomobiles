import { logger } from '../utils/logger';

export const emailService = {
  sendEmail: async (to: string, subject: string, body: string) => {
    logger.info(`Sending email to ${to}: ${subject}`);
    return { success: true };
  },
};

export const smsService = {
  sendSms: async (phone: string, message: string) => {
    logger.info(`Sending SMS to ${phone}: ${message}`);
    return { success: true };
  },
};

export const whatsappService = {
  sendWhatsApp: async (phone: string, message: string) => {
    logger.info(`Sending WhatsApp message to ${phone}: ${message}`);
    return { success: true };
  },
};

export const paymentGateway = {
  createPaymentOrder: async (amount: number, orderId: string) => {
    logger.info(`Initiating payment order for ${orderId}, amount: ${amount}`);
    return { orderId, amount, status: 'created' };
  },
  verifyPayment: async (paymentId: string) => {
    return { paymentId, status: 'success' };
  },
};
