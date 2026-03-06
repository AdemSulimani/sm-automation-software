/**
 * Konfigurimi i lidhjes me bazën e të dhënave.
 * Eksporton funksion connectDB() për të lidhur me MongoDB.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sm-automation');
    console.log(`MongoDB i lidhur: ${conn.connection.host}`);
  } catch (error) {
    console.error('Gabim në lidhjen me MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
