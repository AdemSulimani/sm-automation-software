/**
 * Skedari kryesor i backend-it – nis serverin Express dhe lidh bazën e të dhënave.
 * Monton rrugët (routes) dhe middleware (error handling).
 */

require('dotenv').config();
const express = require('express');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const metaWebhookRoutes = require('./routes/metaWebhookRoutes');
const viberWebhookRoutes = require('./routes/viberWebhookRoutes');
const channelRoutes = require('./routes/channelRoutes');
const automationRuleRoutes = require('./routes/automationRuleRoutes');
const keywordResponseRoutes = require('./routes/keywordResponseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware për JSON
app.use(express.json());

// Rrugët e API
app.use('/api/auth', authRoutes);
app.use('/api/webhooks/meta', metaWebhookRoutes);
app.use('/api/webhooks/viber', viberWebhookRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/automation-rules', automationRuleRoutes);
app.use('/api/keyword-responses', keywordResponseRoutes);

// Rrugë test
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SM Automation API është aktiv.' });
});

// Error handler duhet të jetë i fundit
app.use(errorHandler);

// Lidhja me DB dhe nisja e serverit
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveri në portën ${PORT}`);
  });
});
