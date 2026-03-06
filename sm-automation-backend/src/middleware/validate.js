/**
 * Middleware për validimin e të dhënave të request-it (body, params, query).
 * Mund të përdoret për të validuar payload për regjistrim, login, etj.
 */

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return res.status(400).json({ success: false, message: messages });
    }
    req.body = value;
    next();
  };
};

module.exports = { validate };
