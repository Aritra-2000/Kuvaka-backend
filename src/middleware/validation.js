import { validationResult, body, param, query } from 'express-validator';
import { BadRequestError } from './errorHandler.js';

/**
 * Validation middleware
 * @param {Object} validations - Array of validation rules
 * @returns {Function} - Express middleware function
 */
export const validate = (validations) => {
  // If validations is a string, treat it as a key in validationSchemas
  const validationRules = typeof validations === 'string' 
    ? validationSchemas[validations] 
    : validations;

  // Ensure validationRules is an array
  if (!Array.isArray(validationRules)) {
    throw new Error(`Invalid validation rules: ${validations}`);
  }

  return async (req, res, next) => {
    await Promise.all(validationRules.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    throw new BadRequestError('Validation failed', {
      errors: errors.array(),
    });
  };
};

// Validation schemas
export const validationSchemas = {
  createOffer: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Name must be between 3 and 100 characters'),
    body('value_props')
      .isArray({ min: 1 })
      .withMessage('At least one value proposition is required'),
    body('value_props.*')
      .trim()
      .notEmpty()
      .withMessage('Value proposition cannot be empty'),
    body('ideal_use_cases')
      .isArray({ min: 1 })
      .withMessage('At least one ideal use case is required'),
    body('ideal_use_cases.*')
      .trim()
      .notEmpty()
      .withMessage('Ideal use case cannot be empty'),
  ],

  getOffer: [
    param('id')
      .isMongoId()
      .withMessage('Invalid offer ID format')
  ],

  updateOffer: [
    param('id')
      .isMongoId()
      .withMessage('Invalid offer ID format'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Name must be between 3 and 100 characters'),
    body('value_props')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one value proposition is required'),
    body('value_props.*')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Value proposition cannot be empty'),
    body('ideal_use_cases')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one ideal use case is required'),
    body('ideal_use_cases.*')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Ideal use case cannot be empty'),
  ],

  deleteOffer: [
    param('id')
      .isMongoId()
      .withMessage('Invalid offer ID format')
  ],

  getLeads: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sortBy')
      .optional()
      .isString()
      .trim()
      .isIn(['name', 'email', 'score', 'createdAt'])
      .withMessage('Invalid sort field'),
    query('orderBy')
      .optional()
      .isString()
      .trim()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be either asc or desc'),
    query('minScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Minimum score must be between 0 and 100')
      .toInt(),
    query('maxScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Maximum score must be between 0 and 100')
      .toInt(),
    query('industry')
      .optional()
      .isString()
      .trim()
      .escape(),
    query('search')
      .optional()
      .isString()
      .trim()
      .escape()
  ],

  getLead: [
    param('id')
      .isMongoId()
      .withMessage('Invalid lead ID format')
  ],

  deleteLead: [
    param('id')
      .isMongoId()
      .withMessage('Invalid lead ID format')
  ],
  
  processScores: [
    body('offerId')
      .notEmpty()
      .withMessage('Offer ID is required')
      .isMongoId()
      .withMessage('Invalid Offer ID format'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
  ],

  uploadLeads: [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('CSV file is required');
        }
        if (req.file.mimetype !== 'text/csv') {
          throw new Error('Only CSV files are allowed');
        }
        return true;
      }),
  ],
  
  scoreLeads: [
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
  ],
  
  getResults: [
    query('limit').optional().isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('sort').optional().isIn(['score', '-score', 'createdAt', '-createdAt'])
      .withMessage('Invalid sort parameter'),
  ],
};

export default {
  validate,
  ...validationSchemas,
};
