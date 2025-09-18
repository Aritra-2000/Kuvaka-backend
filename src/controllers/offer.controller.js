import { ApiError, NotFoundError } from '../middleware/errorHandler.js';
import Offer from '../models/Offer.js';
import logger from '../utils/logger.js';
import APIFeatures from '../utils/apiFeatures.js';

/**
 * @desc    Get all offers
 * @route   GET /api/offers
 * @access  Public
 */
export const getOffers = async (req, res, next) => {
  try {
    // Build query
    const features = new APIFeatures(Offer.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // Execute query
    const offers = await features.query;

    res.status(200).json({
      status: 'success',
      results: offers.length,
      data: {
        offers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new offer
 * @route   POST /api/offers
 * @access  Public
 */
export const createOffer = async (req, res, next) => {
  try {
    const { name, value_props, ideal_use_cases } = req.body;

    const offer = new Offer({
      name,
      value_props,
      ideal_use_cases,
    });

    await offer.save();

    logger.info(`Created new offer: ${offer._id}`);

    res.status(201).json({
      status: 'success',
      data: {
        offer,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get offer by ID
 * @route   GET /api/offers/:id
 * @access  Public
 */
export const getOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    res.status(200).json({
      status: 'success',
      data: {
        offer,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update offer
 * @route   PUT /api/offers/:id
 * @access  Public
 */
export const updateOffer = async (req, res, next) => {
  try {
    const { name, value_props, ideal_use_cases } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { name, value_props, ideal_use_cases, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    logger.info(`Updated offer: ${offer._id}`);

    res.status(200).json({
      status: 'success',
      data: {
        offer,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete offer
 * @route   DELETE /api/offers/:id
 * @access  Public
 */
export const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    logger.info(`Deleted offer: ${offer._id}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
