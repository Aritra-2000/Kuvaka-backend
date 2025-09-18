import { Readable } from 'stream';
import { stringify } from 'csv-stringify';
import { ApiError } from '../middleware/errorHandler.js';
import Lead from '../models/Lead.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get all scored leads with reasoning
 * @route   GET /api/results
 * @access  Public
 */
export const getResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-score' } = req.query;
    const skip = (page - 1) * limit;

    // Only get processed leads
    const query = Lead.find({ is_processed: true })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const [results, total] = await Promise.all([
      query.exec(),
      Lead.countDocuments({ is_processed: true }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        total,
        totalPages,
        currentPage: parseInt(page),
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export results as CSV
 * @route   GET /api/results/export
 * @access  Public
 */
export const exportResults = async (req, res, next) => {
  try {
    // Get all processed leads
    const leads = await Lead.find({ is_processed: true })
      .sort('-score')
      .lean();

    if (leads.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No results found to export',
      });
    }

    // Define CSV columns
    const columns = [
      'Name',
      'Email',
      'Role',
      'Company',
      'Industry',
      'Score',
      'Score Reason',
      'Processed At',
    ];

    // Prepare data for CSV
    const data = [];
    leads.forEach((lead) => {
      data.push([
        lead.name,
        lead.email,
        lead.role,
        lead.company,
        lead.industry,
        lead.score,
        lead.score_reason,
        new Date(lead.processed_at).toISOString(),
      ]);
    });

    // Create CSV string
    stringify([columns, ...data], (err, output) => {
      if (err) {
        logger.error('Error generating CSV:', err);
        throw new ApiError('Error generating CSV export');
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=lead_scores_export.csv'
      );

      // Send the CSV file
      res.status(200).send(output);
    });
  } catch (error) {
    next(error);
  }
};
