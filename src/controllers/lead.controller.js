import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { ApiError, BadRequestError, NotFoundError } from '../middleware/errorHandler.js';
import Lead from '../models/Lead.js';
import logger from '../utils/logger.js';

/**
 * @desc    Upload leads from CSV file
 * @route   POST /api/leads/upload
 * @access  Public
 */
export const uploadLeads = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    const results = [];
    const errors = [];
    let rowCount = 0;

    // Create a readable stream from the buffer
    const stream = Readable.from(req.file.buffer.toString());

    // Parse the CSV file
    const parser = parse({
      delimiter: ',',
      columns: true,
      trim: true,
      skip_empty_lines: true,
      skip_records_with_error: true,
    });

    // Process each record
    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rowCount++;
        
        // Validate required fields
        if (!record.name || !record.email || !record.role || !record.industry) {
          errors.push({
            row: rowCount,
            message: 'Missing required fields',
            data: record,
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.email)) {
          errors.push({
            row: rowCount,
            message: 'Invalid email format',
            data: record,
          });
          continue;
        }

        results.push({
          name: record.name,
          email: record.email.toLowerCase(),
          role: record.role,
          industry: record.industry,
          company: record.company || '',
          linkedin: record.linkedin || '',
          phone: record.phone || '',
          score: 0,
          score_reason: '',
        });
      }
    });

    // Handle parser errors
    parser.on('error', (error) => {
      logger.error('CSV parsing error:', error);
      throw new BadRequestError('Error parsing CSV file');
    });

    // Wait for parsing to complete
    await new Promise((resolve, reject) => {
      parser.on('end', resolve);
      parser.on('error', reject);
      stream.pipe(parser);
    });

    // Insert valid records in bulk
    let insertedCount = 0;
    if (results.length > 0) {
      const { insertedCount: count } = await Lead.insertMany(results, {
        ordered: false,
      });
      insertedCount = count;
    }

    logger.info(`Processed ${rowCount} rows, inserted ${insertedCount} leads`);

    res.status(200).json({
      status: 'success',
      data: {
        totalRows: rowCount,
        inserted: insertedCount,
        errors: errors.length,
        errorDetails: errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all leads
 * @route   GET /api/leads
 * @access  Public
 */
export const getLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;

    const query = Lead.find()
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const [leads, total] = await Promise.all([
      query.exec(),
      Lead.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        total,
        totalPages,
        currentPage: parseInt(page),
        leads,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get lead by ID
 * @route   GET /api/leads/:id
 * @access  Public
 */
export const getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id).lean();

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    res.status(200).json({
      status: 'success',
      data: {
        lead,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete lead
 * @route   DELETE /api/leads/:id
 * @access  Public
 */
export const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    logger.info(`Deleted lead: ${lead._id}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
