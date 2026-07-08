const { badRequest } = require('../utils/response');

/**
 * Validation middleware factory
 * @param {Object} rules - Validation rules object
 * @returns {Function} Express middleware
 */
const validate = (rules) => {
  return (req, res, next) => {
    const errors = [];
    const data = { ...req.body, ...req.params, ...req.query };

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = data[field];
      
      if (fieldRules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      if (fieldRules.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({ field, message: `${field} must be a valid email` });
        }
      }

      if (fieldRules.type === 'string' && typeof value !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
      }

      if (fieldRules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ field, message: `${field} must be a number` });
        }
      }

      if (fieldRules.minLength && String(value).length < fieldRules.minLength) {
        errors.push({ field, message: `${field} must be at least ${fieldRules.minLength} characters` });
      }

      if (fieldRules.maxLength && String(value).length > fieldRules.maxLength) {
        errors.push({ field, message: `${field} must not exceed ${fieldRules.maxLength} characters` });
      }

      if (fieldRules.min !== undefined && Number(value) < fieldRules.min) {
        errors.push({ field, message: `${field} must be at least ${fieldRules.min}` });
      }

      if (fieldRules.max !== undefined && Number(value) > fieldRules.max) {
        errors.push({ field, message: `${field} must not exceed ${fieldRules.max}` });
      }

      if (fieldRules.enum && !fieldRules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${fieldRules.enum.join(', ')}` });
      }

      if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
        errors.push({ field, message: `${field} format is invalid` });
      }

      if (fieldRules.custom && typeof fieldRules.custom === 'function') {
        const customError = fieldRules.custom(value, data);
        if (customError) {
          errors.push({ field, message: customError });
        }
      }
    }

    if (errors.length > 0) {
      return badRequest(res, 'Validation failed', errors);
    }

    next();
  };
};

module.exports = { validate };