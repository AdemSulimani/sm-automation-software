/**
 * Middleware për trajtimin e gabimeve në të gjithë aplikacionin.
 * Kap gabimet dhe kthen përgjigje të formatuara me status dhe mesazh.
 */

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Gabim i brendshëm i serverit',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = { errorHandler };
