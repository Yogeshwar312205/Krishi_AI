const logger = require('../utils/logger');

// Simulated / Twilio SMS Dispatch Gateway
exports.sendSMSAlert = async (req, res) => {
  try {
    const { phone, cropType, targetPrice, currentPrice, mandiName } = req.body;

    if (!phone || !cropType) {
      return res.status(400).json({ error: 'Mobile phone number and crop type are required.' });
    }

    const message = `[KrishiFlow Alert] 🌾 Good News! ${cropType} price at ${mandiName || 'Vashi APMC'} reached ₹${currentPrice || 48}/kg (Target: ₹${targetPrice || 45}/kg). Book your refrigerated transport now on KrishiFlow!`;

    logger.info(`[SMS GATEWAY] Dispatching SMS to ${phone}: ${message}`);

    // In production with Twilio/Gupshup credentials:
    // const twilioClient = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
    // await twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: phone });

    return res.status(200).json({
      success: true,
      message: `SMS alert dispatched successfully to ${phone}`,
      smsPayload: {
        to: phone,
        body: message,
        timestamp: new Date().toISOString(),
        gatewayStatus: 'DELIVERED_DEMO_SIMULATION'
      }
    });
  } catch (error) {
    logger.error('Error sending SMS alert:', error);
    return res.status(500).json({ error: 'Failed to dispatch SMS alert.' });
  }
};
