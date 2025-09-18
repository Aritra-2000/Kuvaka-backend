import { Router } from 'express';
import { validate } from '../middleware/validation.js';
import * as scoreController from '../controllers/score.controller.js';

const router = Router();

/**
 * @route   POST /api/scores/process
 * @desc    Process leads and assign scores based on offer criteria
 * @access  Public
 */
router.post('/process', validate('processScores'), scoreController.processScores);

/**
 * @route   GET /api/scores/summary
 * @desc    Get scoring summary
 * @access  Public
 */
router.get('/summary', scoreController.getScoringSummary);

export default router;
