import { Router } from 'express';
import { validate } from '../middleware/validation.js';
import * as offerController from '../controllers/offer.controller.js';

const router = Router();

/**
 * @route   GET /api/offers
 * @desc    Get all offers
 * @access  Public
 */
router.get('/', offerController.getOffers);

/**
 * @route   POST /api/offers
 * @desc    Create a new offer
 * @access  Public
 */
router.post('/', validate('createOffer'), offerController.createOffer);

/**
 * @route   GET /api/offers/:id
 * @desc    Get offer by ID
 * @access  Public
 */
router.get('/:id', validate('getOffer'), offerController.getOffer);

/**
 * @route   PUT /api/offers/:id
 * @desc    Update offer
 * @access  Public
 */
router.put('/:id', validate('updateOffer'), offerController.updateOffer);

/**
 * @route   DELETE /api/offers/:id
 * @desc    Delete offer
 * @access  Public
 */
router.delete('/:id', validate('deleteOffer'), offerController.deleteOffer);

export default router;
