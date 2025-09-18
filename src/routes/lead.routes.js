import { Router } from 'express';
import { validate } from '../middleware/validation.js';
import * as leadController from '../controllers/lead.controller.js';
import { BadRequestError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import { promisify } from 'util';
import csv from 'csv-parser';
import path from 'path';

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

const router = Router();

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    await mkdirAsync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Custom file upload validation middleware
const validateFileUpload = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new BadRequestError('No files were uploaded'));
  }

  const file = req.files.file;
  
  // Check if file exists
  if (!file) {
    return next(new BadRequestError('No file was uploaded'));
  }

  // Check file type
  const isCSV = file.mimetype === 'text/csv' || 
               file.mimetype === 'application/vnd.ms-excel' ||
               file.name.endsWith('.csv');
  
  if (!isCSV) {
    return next(new BadRequestError('Only CSV files are allowed'));
  }

  next();
};

/**
 * @route   POST /api/leads/upload
 * @desc    Upload leads from CSV file
 * @access  Public
 */
router.post('/upload', validateFileUpload, async (req, res, next) => {
  let filePath = null;
  const file = req.files.file;
  
  try {

    // Ensure uploads directory exists
    const uploadDir = await ensureUploadsDir();
    
    // Generate unique filename
    const fileName = `leads-${Date.now()}-${Math.floor(Math.random() * 1000000)}.csv`;
    filePath = path.join(uploadDir, fileName);

    // Save the file
    await new Promise((resolve, reject) => {
      file.mv(filePath, (err) => {
        if (err) {
          logger.error(`Error saving file: ${err.message}`, { error: err });
          reject(new Error('Error saving file'));
        } else {
          resolve();
        }
      });
    });
    
    logger.info(`File uploaded successfully: ${filePath}`);

    // Add file info to request object
    req.file = {
      path: filePath,
      originalname: file.name,
      mimetype: file.mimetype,
      size: file.size
    };

    // Process the file
    try {
      await leadController.uploadLeads(req, res, next);
    } catch (err) {
      // Remove the uploaded file if processing fails
      if (filePath) {
        await unlinkAsync(filePath);
      }
      logger.error('Error processing uploaded file:', { error: err.message });
      return next(new BadRequestError(`Error processing uploaded file: ${err.message}`));
    }
    
  } catch (err) {
    logger.error('File upload error:', { error: err.message });
    return next(new BadRequestError(`File upload failed: ${err.message}`));
  }
});

/**
 * @route   GET /api/leads
 * @desc    Get all leads
 * @access  Public
 */
router.get('/', validate('getLeads'), leadController.getLeads);

/**
 * @route   GET /api/leads/:id
 * @desc    Get lead by ID
 * @access  Public
 */
router.get('/:id', validate('getLead'), leadController.getLead);

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete lead
 * @access  Public
 */
router.delete('/:id', validate('deleteLead'), leadController.deleteLead);

export default router;
