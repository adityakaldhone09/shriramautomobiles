/**
 * Shriram Automobiles - Trilingual Notification Templates
 * Supports English (en), Hindi (hi), and Marathi (mr).
 * Strictly transactional automotive updates with customer consent checks.
 */

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export type NotificationEventType =
  | 'BOOKING_CONFIRMED'
  | 'SERVICE_CHECKED_IN'
  | 'SERVICE_IN_PROGRESS'
  | 'ESTIMATE_APPROVAL_REQUEST'
  | 'SERVICE_COMPLETED'
  | 'INVOICE_GENERATED'
  | 'NEXT_SERVICE_DUE'
  | 'LOW_STOCK_ALERT'
  | 'OVERDUE_JOB_ALERT';

export interface NotificationPayload {
  customerName?: string;
  vehicleModel?: string;
  registrationNumber?: string;
  bookingNumber?: string;
  invoiceNumber?: string;
  amount?: number | string;
  estimateAmount?: number | string;
  partName?: string;
  currentStock?: number;
  workshopPhone?: string;
  pickupTime?: string;
}

export interface RenderedTemplate {
  title: string;
  body: string;
  smsText: string;
  whatsAppText: string;
}

export const NOTIFICATION_TEMPLATES: Record<
  NotificationEventType,
  Record<SupportedLanguage, (p: NotificationPayload) => RenderedTemplate>
> = {
  BOOKING_CONFIRMED: {
    en: (p) => ({
      title: `Service Booking Confirmed: ${p.bookingNumber || 'Service'}`,
      body: `Hello ${p.customerName || 'Valued Customer'}, your service booking for ${p.vehicleModel || 'vehicle'} (${p.registrationNumber || ''}) is confirmed at Shriram Automobiles, Sangola.`,
      smsText: `Shriram Auto: Booking ${p.bookingNumber} confirmed for ${p.vehicleModel}. Workshop: Sangola (Ph: 9822000000).`,
      whatsAppText: `🏍️ *Shriram Automobiles - Service Booking Confirmed*\n\nNamaste ${p.customerName || 'Customer'},\nYour booking *${p.bookingNumber}* for *${p.vehicleModel}* (${p.registrationNumber}) has been confirmed.\n\n📍 Workshop: Kadlas Naka, Sangola, Solapur\n📞 Helpdesk: +91 9822000000`,
    }),
    hi: (p) => ({
      title: `सर्विस बुकिंग कन्फर्म: ${p.bookingNumber || 'सर्विस'}`,
      body: `नमस्ते ${p.customerName || 'ग्राहक'}, आपके वाहन ${p.vehicleModel || ''} (${p.registrationNumber || ''}) की सर्विस बुकिंग श्रीराम ऑटोमोबाइल्स, सांगोला में कन्फर्म हो गई है।`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} के लिए बुकिंग ${p.bookingNumber} कन्फर्म हुई। संपर्क: 9822000000.`,
      whatsAppText: `🏍️ *श्रीराम ऑटोमोबाइल्स - सर्विस बुकिंग कन्फर्म*\n\nनमस्ते ${p.customerName || 'ग्राहक'},\nआपके वाहन *${p.vehicleModel}* (${p.registrationNumber}) की बुकिंग *${p.bookingNumber}* कन्फर्म हो गई है।\n\n📍 वर्कशॉप: कडलास नाका, सांगोला\n📞 फोन: +91 9822000000`,
    }),
    mr: (p) => ({
      title: `सर्व्हिस बुकिंग निश्चित झाली: ${p.bookingNumber || 'सर्व्हिस'}`,
      body: `नमस्कार ${p.customerName || 'ग्राहक'}, आपल्या ${p.vehicleModel || ''} (${p.registrationNumber || ''}) वाहनाची सर्व्हिस बुकिंग श्रीराम ऑटोमोबाईल्स, सांगोला येथे निश्चित झाली आहे.`,
      smsText: `श्रीराम ऑटो: आपल्या ${p.vehicleModel} ची बुकिंग ${p.bookingNumber} निश्चित झाली. संपर्क: 9822000000.`,
      whatsAppText: `🏍️ *श्रीराम ऑटोमोबाईल्स - सर्व्हिस बुकिंग निश्चित*\n\nनमस्कार ${p.customerName || 'ग्राहक'},\nआपल्या *${p.vehicleModel}* (${p.registrationNumber}) वाहनाची बुकिंग *${p.bookingNumber}* यशस्वीरित्या निश्चित झाली आहे.\n\n📍 वर्कशॉप पत्ता: कडलास नाका, सांगोला, जि. सोलापूर\n📞 मदत कक्ष: +91 9822000000`,
    }),
  },

  SERVICE_CHECKED_IN: {
    en: (p) => ({
      title: `Vehicle Checked-In for Inspection`,
      body: `Your ${p.vehicleModel || 'vehicle'} has arrived at bay and 10-point mechanical inspection is underway.`,
      smsText: `Shriram Auto: ${p.vehicleModel} checked-in at workshop bay for inspection.`,
      whatsAppText: `🔧 *Vehicle Checked-In*\n\nYour *${p.vehicleModel}* (${p.registrationNumber}) is now on the lift for 10-point standard safety inspection.`,
    }),
    hi: (p) => ({
      title: `वाहन वर्कशॉप में दाखिल हुआ (चेक-इन)`,
      body: `आपका वाहन ${p.vehicleModel || ''} वर्कशॉप में आ चुका है और 10-पॉइंट तकनीकी निरीक्षण जारी है।`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} वर्कशॉप बे में चेक-इन हो गया है।`,
      whatsAppText: `🔧 *वाहन चेक-इन सूचना*\n\nआपका *${p.vehicleModel}* (${p.registrationNumber}) निरीक्षण के लिए लिफ्ट पर ले लिया गया है।`,
    }),
    mr: (p) => ({
      title: `वाहन वर्कशॉपमध्ये दाखल झाले (चेक-इन)`,
      body: `आपले वाहन ${p.vehicleModel || ''} वर्कशॉप बे वर आले असून १०-मुद्यांची सुरक्षा तपासणी सुरू आहे.`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} वर्कशॉप बे वर तपासणीसाठी दाखल झाले.`,
      whatsAppText: `🔧 *वाहन चेक-इन सूचना*\n\nआपले *${p.vehicleModel}* (${p.registrationNumber}) वाहन १०-मुद्यांच्या सुरक्षा तपासणीसाठी बे वर दाखल झाले आहे.`,
    }),
  },

  SERVICE_IN_PROGRESS: {
    en: (p) => ({
      title: `Service In-Progress on Bay Lift`,
      body: `Technician has begun repair and servicing operations for ${p.vehicleModel || 'vehicle'}.`,
      smsText: `Shriram Auto: Servicing in progress for ${p.vehicleModel}.`,
      whatsAppText: `⚙️ *Service In-Progress*\n\nTechnicians are servicing your *${p.vehicleModel}* with genuine spare parts.`,
    }),
    hi: (p) => ({
      title: `सर्विस कार्य प्रगति पर है`,
      body: `वाहन ${p.vehicleModel || ''} पर ऑरिजनल पार्ट्स के साथ सर्विसिंग कार्य चालू है।`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} का सर्विस कार्य प्रगति पर है।`,
      whatsAppText: `⚙️ *सर्विस प्रगति सूचना*\n\nआपके *${p.vehicleModel}* पर तकनीशियन द्वारा सर्विस कार्य चालू है।`,
    }),
    mr: (p) => ({
      title: `सर्व्हिसचे काम सुरू आहे`,
      body: `आपल्या ${p.vehicleModel || ''} वाहनावर अस्सल सुट्या भागांसह सर्व्हिसिंगचे काम चालू आहे.`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} चे सर्व्हिसिंग काम सुरू आहे.`,
      whatsAppText: `⚙️ *सर्व्हिस सुरू असल्याची सूचना*\n\nआपल्या *${p.vehicleModel}* वाहनावर मेकॅनिककडून प्राधान्याने काम केले जात आहे.`,
    }),
  },

  ESTIMATE_APPROVAL_REQUEST: {
    en: (p) => ({
      title: `Estimate Approval Required: ₹${p.estimateAmount || '0'}`,
      body: `Inspection complete for ${p.vehicleModel}. Estimated cost: ₹${p.estimateAmount}. Please review and approve in your customer garage portal.`,
      smsText: `Shriram Auto: Estimate of Rs.${p.estimateAmount} generated for ${p.vehicleModel}. Please approve on portal.`,
      whatsAppText: `📋 *Estimate Approval Required*\n\nInspection completed for *${p.vehicleModel}*.\nEstimated Total: *₹${p.estimateAmount}*\n\nPlease approve or request changes via your portal or reply YES to proceed.`,
    }),
    hi: (p) => ({
      title: `सर्विस एस्टीमेट अनुमोदन अपेक्षित: ₹${p.estimateAmount || '0'}`,
      body: `वाहन ${p.vehicleModel} का निरीक्षण पूर्ण हुआ। अनुमानित खर्च: ₹${p.estimateAmount}। कृपया पोर्टल पर अनुमति दें।`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} का एस्टीमेट रु.${p.estimateAmount}। कृपया पोर्टल पर स्वीकृत करें।`,
      whatsAppText: `📋 *सर्विस एस्टीमेट अनुमोदन*\n\n*${p.vehicleModel}* का तकनीकी निरीक्षण पूरा हुआ।\nअनुमानित राशि: *₹${p.estimateAmount}*\n\nकाम शुरू करने के लिए कृपया पोर्टल पर अनुमति दें।`,
    }),
    mr: (p) => ({
      title: `सर्व्हिस अंदाजपत्रक (एस्टीमेट) मंजुरी: ₹${p.estimateAmount || '0'}`,
      body: `आपल्या ${p.vehicleModel} वाहनाची तपासणी पूर्ण झाली आहे. अंदाजे खर्च: ₹${p.estimateAmount}। काम सुरू करण्यासाठी कृपया मंजुरी द्या.`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} चे एस्टीमेट रु.${p.estimateAmount}। कृपया मंजुरी द्या.`,
      whatsAppText: `📋 *सर्व्हिस अंदाजपत्रक मंजुरी*\n\nआपल्या *${p.vehicleModel}* वाहनाची तपासणी पूर्ण झाली आहे.\nअंदाजे एकूण रक्कम: *₹${p.estimateAmount}*\n\nकाम पुढे सुरू ठेवण्यासाठी कृपया पोर्टलवर मंजुरी द्या किंवा YES पाठवा.`,
    }),
  },

  SERVICE_COMPLETED: {
    en: (p) => ({
      title: `Service Completed! Ready for Delivery`,
      body: `Your ${p.vehicleModel || 'vehicle'} has passed quality inspection and is ready for pickup at Sangola workshop.`,
      smsText: `Shriram Auto: ${p.vehicleModel} is ready for pickup! Quality check passed.`,
      whatsAppText: `✅ *Service Completed & Quality Checked*\n\nNamaste ${p.customerName || 'Customer'},\nYour *${p.vehicleModel}* (${p.registrationNumber}) is fully serviced, road-tested, and ready for pickup!\n\n📍 Workshop: Kadlas Naka, Sangola`,
    }),
    hi: (p) => ({
      title: `सर्विस पूर्ण हुई! वाहन डिलीवरी के लिए तैयार है`,
      body: `आपका वाहन ${p.vehicleModel || ''} सर्विसिंग और क्वालिटी टेस्ट के बाद डिलीवरी के लिए तैयार है।`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} डिलीवरी के लिए तैयार है!`,
      whatsAppText: `✅ *सर्विस पूर्ण सूचना*\n\nनमस्ते ${p.customerName || 'ग्राहक'},\nआपका वाहन *${p.vehicleModel}* (${p.registrationNumber}) पूरी तरह तैयार है। कृपया वर्कशॉप से डिलीवरी लें।\n\n📍 वर्कशॉप: कडलास नाका, सांगोला`,
    }),
    mr: (p) => ({
      title: `सर्व्हिस पूर्ण झाली! वाहन वितरणासाठी (डिलिव्हरी) सज्ज`,
      body: `आपले वाहन ${p.vehicleModel || ''} सर्व्हिसिंग व गुणवत्ता चाचणी पूर्ण होऊन वितरणासाठी सज्ज आहे.`,
      smsText: `श्रीराम ऑटो: आपले ${p.vehicleModel} डिलिव्हरीसाठी सज्ज आहे!`,
      whatsAppText: `✅ *सर्व्हिस पूर्ण झाल्याची सूचना*\n\nनमस्कार ${p.customerName || 'ग्राहक'},\nआपल्या *${p.vehicleModel}* (${p.registrationNumber}) वाहनाची सर्व्हिस व रोड टेस्ट यशस्वीपणे पूर्ण झाली असून वाहन घेऊन जाण्यासाठी सज्ज आहे.\n\n📍 वर्कशॉप पत्ता: कडलास नाका, सांगोला`,
    }),
  },

  INVOICE_GENERATED: {
    en: (p) => ({
      title: `GST Tax Invoice Generated: ${p.invoiceNumber || ''} (₹${p.amount || '0'})`,
      body: `Tax invoice ${p.invoiceNumber} of ₹${p.amount} has been issued with SAC 9987 (Labour) & HSN 8714 (Parts).`,
      smsText: `Shriram Auto: Invoice ${p.invoiceNumber} for Rs.${p.amount} issued.`,
      whatsAppText: `🧾 *GST Tax Invoice Issued*\n\nInvoice No: *${p.invoiceNumber}*\nTotal Amount: *₹${p.amount}*\nGSTIN: 27AABCS1429B1Z8\n\nYou can download the printable tax invoice directly from your customer portal.`,
    }),
    hi: (p) => ({
      title: `जीएसटी टैक्स इनवॉइस जारी: ${p.invoiceNumber || ''} (₹${p.amount || '0'})`,
      body: `बिल ${p.invoiceNumber} कुल राशि ₹${p.amount} जनरेट हो चुका है।`,
      smsText: `श्रीराम ऑटो: बिल ${p.invoiceNumber} राशि रु.${p.amount} जारी हुआ।`,
      whatsAppText: `🧾 *जीएसटी टैक्स इनवॉइस*\n\nइनवॉइस नंबर: *${p.invoiceNumber}*\nकुल देय राशि: *₹${p.amount}*\nजीएसटी नं: 27AABCS1429B1Z8\n\nआप अपने पोर्टल से पक्का जीएसटी बिल डाउनलोड कर सकते हैं।`,
    }),
    mr: (p) => ({
      title: `जीएसटी कर पावती (इनव्हॉइस) तयार: ${p.invoiceNumber || ''} (₹${p.amount || '0'})`,
      body: `पावती क्रमांक ${p.invoiceNumber} एकूण रक्कम ₹${p.amount} जनरेट झाली आहे.`,
      smsText: `श्रीराम ऑटो: पावती ${p.invoiceNumber} रक्कम रु.${p.amount} जारी झाली.`,
      whatsAppText: `🧾 *अधिकृत जीएसटी कर पावती*\n\nइनव्हॉइस क्र: *${p.invoiceNumber}*\nएकूण रक्कम: *₹${p.amount}*\nजीएसटी क्र: 27AABCS1429B1Z8\n\nआपल्या ग्राहक पोर्टलवरून अधिकृत कर पावती डाऊनलोड करू शकता.`,
    }),
  },

  NEXT_SERVICE_DUE: {
    en: (p) => ({
      title: `Periodic Maintenance Reminder for ${p.vehicleModel || 'Vehicle'}`,
      body: `It has been over 90 days since your last periodic check. Keep your engine running efficiently by booking a routine checkup.`,
      smsText: `Shriram Auto: ${p.vehicleModel} is due for scheduled periodic service. Call 9822000000.`,
      whatsAppText: `🔔 *Periodic Service Reminder*\n\nNamaste ${p.customerName || 'Customer'},\nYour *${p.vehicleModel}* (${p.registrationNumber}) has completed its scheduled service interval.\n\nKeep your motorcycle running smoothly with an engine oil refresh and safety check.\nBook online: https://shriramautomobiles.in/book-service`,
    }),
    hi: (p) => ({
      title: `वाहन सर्विसिंग रिमाइंडर: ${p.vehicleModel || ''}`,
      body: `आपके वाहन की अंतिम सर्विस को 90 दिन से अधिक समय हो गया है। सुचारू प्रदर्शन के लिए नियमित सर्विसिंग कराएं।`,
      smsText: `श्रीराम ऑटो: ${p.vehicleModel} की समयबद्ध सर्विस बाकी है। फोन: 9822000000.`,
      whatsAppText: `🔔 *समयबद्ध सर्विस रिमाइंडर*\n\nनमस्ते ${p.customerName || 'ग्राहक'},\nआपके *${p.vehicleModel}* की नियमित सर्विस का समय आ गया है।\nइंजन की सुरक्षा और बेहतर माइलेज के लिए सर्विस बुक करें: https://shriramautomobiles.in/book-service`,
    }),
    mr: (p) => ({
      title: `नियमित सर्व्हिसिंग स्मरणपत्र: ${p.vehicleModel || ''}`,
      body: `आपल्या वाहनाच्या शेवटच्या सर्व्हिसिंगला ९० पेक्षा जास्त दिवस झाले आहेत. सुरळीत प्रवासासाठी नियमित देखभाल आवश्यक आहे.`,
      smsText: `श्रीराम ऑटो: आपल्या ${p.vehicleModel} ची वेळेवर सर्व्हिसिंग करा. संपर्क: 9822000000.`,
      whatsAppText: `🔔 *नियमित सर्व्हिसिंग स्मरणपत्र*\n\nनमस्कार ${p.customerName || 'ग्राहक'},\nआपल्या *${p.vehicleModel}* वाहनाच्या नियमित सर्व्हिसिंगची वेळ झाली आहे.\nचांगले मायलेज व इंजिनच्या सुरक्षेसाठी आजच सर्व्हिस बुक करा: https://shriramautomobiles.in/book-service`,
    }),
  },

  LOW_STOCK_ALERT: {
    en: (p) => ({
      title: `Inventory Low Stock Alert: ${p.partName || 'Spare Part'}`,
      body: `Stock for ${p.partName} has dropped to ${p.currentStock} units (at or below threshold). Automated PO recommendation generated.`,
      smsText: `Shriram Auto Alert: Low stock on ${p.partName} (${p.currentStock} left).`,
      whatsAppText: `⚠️ *Low Stock Alert*\n\nPart: *${p.partName}*\nCurrent Balance: *${p.currentStock} units*\nAction: Recommended Purchase Order generated in admin procurement bay.`,
    }),
    hi: (p) => ({
      title: `इन्वेंटरी लो-स्टॉक अलर्ट: ${p.partName || ''}`,
      body: `${p.partName} का स्टॉक घटकर ${p.currentStock} यूनिट रह गया है। कृपया रीऑर्डर करें।`,
      smsText: `श्रीराम ऑटो अलर्ट: ${p.partName} का स्टॉक कम है (${p.currentStock} शेष).`,
      whatsAppText: `⚠️ *इन्वेंटरी स्टॉक अलर्ट*\n\nपार्ट: *${p.partName}*\nवर्तमान स्टॉक: *${p.currentStock} यूनिट्स*\nकार्यवाही: एडमिन पोर्टल पर खरीद आदेश (PO) जनरेट करें।`,
    }),
    mr: (p) => ({
      title: `सुट्या भागांचा साठा कमी झाला आहे: ${p.partName || ''}`,
      body: `${p.partName} चा साठा कमी होऊन फक्त ${p.currentStock} नग शिल्लक आहे. त्वरित खरेदी ऑर्डर करा.`,
      smsText: `श्रीराम ऑटो अलर्ट: ${p.partName} चा साठा कमी (${p.currentStock} शिल्लक).`,
      whatsAppText: `⚠️ *कमी साठा (Low Stock) अलर्ट*\n\nपार्टचे नाव: *${p.partName}*\nशिल्लक साठा: *${p.currentStock} नग*\nकार्यवाही: कार्यशाळा खरेदी विभागाने तात्काळ पीओ (Purchase Order) बनवावा.`,
    }),
  },

  OVERDUE_JOB_ALERT: {
    en: (p) => ({
      title: `Overdue Service Alert: Booking ${p.bookingNumber || ''}`,
      body: `Vehicle ${p.vehicleModel} has been in workshop for over 48 hours without completion. Technician intervention required.`,
      smsText: `Shriram Auto Alert: Job ${p.bookingNumber} is overdue (>48h).`,
      whatsAppText: `⏰ *Overdue Workshop Job Alert*\n\nBooking: *${p.bookingNumber}*\nVehicle: *${p.vehicleModel}*\nStatus: Exceeded 48-hour workshop turnaround threshold. Immediate bay manager review needed.`,
    }),
    hi: (p) => ({
      title: `ओवरड्यू सर्विस अलर्ट: बुकिंग ${p.bookingNumber || ''}`,
      body: `वाहन ${p.vehicleModel} का कार्य 48 घंटे से अधिक समय से प्रलंबित है। तुरंत समीक्षा करें।`,
      smsText: `श्रीराम ऑटो अलर्ट: बुकिंग ${p.bookingNumber} 48 घंटे से अधिक समय से लंबित है।`,
      whatsAppText: `⏰ *ओवरड्यू सर्विस अलर्ट*\n\nबुकिंग: *${p.bookingNumber}*\nवाहन: *${p.vehicleModel}*\nस्थिति: वर्कशॉप में 48 घंटे से अधिक समय व्यतीत। कृपया तुरंत कार्य पूर्ण करें।`,
    }),
    mr: (p) => ({
      title: `प्रलंबित सर्व्हिस अलर्ट: बुकिंग ${p.bookingNumber || ''}`,
      body: `${p.vehicleModel} वाहनाचे काम ४८ तासांपेक्षा जास्त वेळ प्रलंबित आहे. त्वरित लक्ष द्या.`,
      smsText: `श्रीराम ऑटो अलर्ट: बुकिंग ${p.bookingNumber} ४८ तासांपेक्षा जास्त वेळ प्रलंबित आहे.`,
      whatsAppText: `⏰ *प्रलंबित कामाचा अलर्ट*\n\nबुकिंग क्र: *${p.bookingNumber}*\nवाहन: *${p.vehicleModel}*\nस्थिती: कार्यशाळेत ४८ तासांपेक्षा जास्त वेळ काम रखडले आहे. त्वरित मेकॅनिककडून काम पूर्ण करून घ्यावे.`,
    }),
  },
};

