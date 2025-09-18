import { Router } from 'express';
import { validate } from '../middleware/validation.js';
import * as resultController from '../controllers/result.controller.js';

const router = Router();

/**
 * @route   GET /api/results
 * @desc    Get all scored leads with reasoning
 * @access  Public
 */
router.get('/', validate('getResults'), resultController.getResults);

/**
 * @route   GET /api/results/export
 * @desc    Export results as CSV
 * @access  Public
 */
router.get('/export', resultController.exportResults);

export default router;
