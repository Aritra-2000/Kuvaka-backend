import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import { ApiError, BadRequestError, NotFoundError } from '../middleware/errorHandler.js';
import Lead from '../models/Lead.js';
import Offer from '../models/Offer.js';
import logger from '../utils/logger.js';

// Initialize Google's Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Calculate rule-based score for a lead
 * @param {Object} lead - Lead document
 * @param {Object} offer - Offer document
 * @returns {Object} - Score and reason
 */
const calculateRuleScore = (lead, offer) => {
  let score = 0;
  const reasons = [];

  // 1. Role relevance (Max 20 points)
  const role = lead.role ? lead.role.toLowerCase() : '';
  if (role.includes('ceo') || role.includes('founder') || role.includes('owner')) {
    score += 20; // Decision maker
    reasons.push('Role: Decision maker (+20)');
  } else if (
    role.includes('manager') ||
    role.includes('director') ||
    role.includes('vp') ||
    role.includes('head of')
  ) {
    score += 10; // Influencer
    reasons.push('Role: Influencer (+10)');
  } else if (role) {
    reasons.push('Role: No matching role (0)');
  } else {
    reasons.push('Role: Not provided (0)');
  }

  // 2. Industry match (Max 20 points)
  const industry = lead.industry ? lead.industry.toLowerCase() : '';
  let industryMatch = 0;
  
  if (industry && offer.ideal_use_cases && offer.ideal_use_cases.length > 0) {
    const isExactMatch = offer.ideal_use_cases.some((useCase) =>
      industry.includes(useCase.toLowerCase()) || 
      useCase.toLowerCase().includes(industry)
    );

    if (isExactMatch) {
      score += 20; // Exact ICP match
      industryMatch = 20;
      reasons.push('Industry: Exact ICP match (+20)');
    } else {
      // Check for adjacent industries (simplified example)
      const adjacentKeywords = ['tech', 'saas', 'software', 'enterprise', 'startup', 'technology'];
      const isAdjacent = adjacentKeywords.some((keyword) =>
        industry.includes(keyword) || 
        offer.ideal_use_cases.some(uc => uc.toLowerCase().includes(keyword))
      );

      if (isAdjacent) {
        score += 10; // Adjacent industry
        industryMatch = 10;
        reasons.push('Industry: Adjacent industry match (+10)');
      } else {
        reasons.push('Industry: No match (0)');
      }
    }
  } else {
    reasons.push('Industry: Not provided or no ideal use cases defined (0)');
  }

  // 3. Data completeness (Max 10 points)
  const requiredFields = ['name', 'email', 'role', 'company', 'industry'];
  const missingFields = requiredFields.filter(field => !lead[field] || lead[field].trim() === '');
  
  if (missingFields.length === 0) {
    score += 10; // All required fields present
    reasons.push('Data: Complete (+10)');
  } else if (missingFields.length < requiredFields.length) {
    score += 5; // Some fields missing
    reasons.push(`Data: Partially complete (${requiredFields.length - missingFields.length}/${requiredFields.length} fields, +5)`);
  } else {
    reasons.push('Data: Incomplete (0)');
  }

  // Ensure score doesn't exceed 50 (max for rule-based)
  score = Math.min(score, 50);
  
  return {
    score,
    reason: reasons.join(' | ')
  };
};

/**
 * Get AI-based score using Gemini
 * @param {Object} lead - Lead document
 * @param {Object} offer - Offer document
 * @returns {Promise<Object>} - AI score and reasoning
 */
const getAIScore = async (lead, offer) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Given the following lead and offer details, analyze the potential buying intent and provide a score (High/Medium/Low) with a brief explanation (1-2 sentences).

Lead:
- Name: ${lead.name}
- Role: ${lead.role}
- Company: ${lead.company || 'N/A'}
- Industry: ${lead.industry}
- LinkedIn: ${lead.linkedin || 'N/A'}

Offer:
- Name: ${offer.name}
- Value Propositions: ${offer.value_props.join(', ')}
- Ideal Use Cases: ${offer.ideal_use_cases.join(', ')}

Analysis (be concise):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Parse the response to extract score and reason
    let aiScore = 0;
    let aiReason = text;

    if (text.toLowerCase().includes('high')) {
      aiScore = 50;
    } else if (text.toLowerCase().includes('medium')) {
      aiScore = 30;
    } else {
      aiScore = 10; // Default to low
    }

    return {
      score: aiScore,
      reason: `AI Analysis: ${text}`,
    };
  } catch (error) {
    logger.error('Error getting AI score:', error);
    // Fallback to a default score if AI fails
    return {
      score: 10, // Default to low
      reason: 'AI analysis unavailable. Default score assigned.',
    };
  }
};

/**
 * @desc    Process leads and assign scores based on offer criteria
 * @route   POST /api/scores/process
 * @access  Public
 */
export const processScores = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { offerId, limit = 100 } = req.body;

    // Validate offer exists
    const offer = await Offer.findById(offerId).session(session);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Get unprocessed leads with a lock to prevent concurrent processing
    const leads = await Lead.find({ is_processed: false })
      .limit(parseInt(limit))
      .session(session)
      .lean();
    
    if (leads.length === 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(200).json({
        status: 'success',
        message: 'No unprocessed leads found',
        data: {
          processed: 0,
          totalScore: 0,
          averageScore: 0,
        },
      });
    }

    // Process each lead
    const processedLeads = [];
    let totalScore = 0;

    for (const lead of leads) {
      try {
        // Calculate rule-based score
        const ruleScore = calculateRuleScore(lead, offer);
        
        // Get AI score
        const aiScore = await getAIScore(lead, offer);
        
        // Calculate final score (50% rule-based, 50% AI)
        const finalScore = Math.round(ruleScore.score * 0.5 + aiScore.score * 0.5);
        totalScore += finalScore;
        
        // Combine reasons
        const combinedReason = `Rule-based: ${ruleScore.reason} | AI: ${aiScore.reason}`;
        
        // Mark as processed and update lead
        const updatedLead = await Lead.findByIdAndUpdate(
          lead._id,
          {
            $set: {
              is_processed: true,
              score: finalScore,
              score_reason: combinedReason,
              processed_at: new Date(),
              offer: offer._id,
            },
          },
          { new: true, session }
        );
        
        processedLeads.push(updatedLead);
      } catch (error) {
        logger.error(`Error processing lead ${lead._id}:`, error);
        // Continue with next lead even if one fails
      }
    }
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    // Calculate average score
    const averageScore = processedLeads.length > 0 
      ? Math.round((totalScore / processedLeads.length) * 100) / 100 // Round to 2 decimal places
      : 0;

    logger.info(`Processed ${processedLeads.length} leads with average score: ${averageScore}`);
    
    res.status(200).json({
      status: 'success',
      message: `${processedLeads.length} leads processed successfully`,
      data: {
        processed: processedLeads.length,
        totalScore,
        averageScore,
        leadIds: processedLeads.map(lead => lead._id),
      },
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * @desc    Get scoring summary
 * @route   GET /api/scores/summary
 * @access  Public
 */
export const getScoringSummary = async (req, res, next) => {
  try {
    const [
      totalLeads,
      processedLeads,
      highIntentLeads,
      mediumIntentLeads,
      lowIntentLeads,
      averageScore
    ] = await Promise.all([
      // Total number of leads
      Lead.countDocuments(),
      
      // Number of processed leads
      Lead.countDocuments({ is_processed: true }),
      
      // High intent leads (score >= 70)
      Lead.countDocuments({ is_processed: true, score: { $gte: 70 } }),
      
      // Medium intent leads (score >= 40 and < 70)
      Lead.countDocuments({ 
        is_processed: true, 
        score: { $gte: 40, $lt: 70 } 
      }),
      
      // Low intent leads (score < 40)
      Lead.countDocuments({ is_processed: true, score: { $lt: 40 } }),
      
      // Average score (using aggregation for better performance)
      Lead.aggregate([
        { $match: { is_processed: true } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } }
      ]).then(results => results[0]?.avgScore || 0)
    ]);
    
    // Calculate percentages
    const processedPercentage = totalLeads > 0 
      ? Math.round((processedLeads / totalLeads) * 100) 
      : 0;
      
    const highIntentPercentage = processedLeads > 0
      ? Math.round((highIntentLeads / processedLeads) * 100)
      : 0;
      
    const mediumIntentPercentage = processedLeads > 0
      ? Math.round((mediumIntentLeads / processedLeads) * 100)
      : 0;
      
    const lowIntentPercentage = processedLeads > 0
      ? Math.round((lowIntentLeads / processedLeads) * 100)
      : 0;
    
    // Get most recent processed leads
    const recentLeads = await Lead.find({ is_processed: true })
      .sort({ processed_at: -1 })
      .limit(5)
      .select('name email company role score processed_at')
      .lean();
    
    res.status(200).json({
      status: 'success',
      data: {
        totals: {
          all: totalLeads,
          processed: processedLeads,
          unprocessed: totalLeads - processedLeads,
          processedPercentage,
        },
        scores: {
          average: parseFloat(averageScore.toFixed(2)),
          high: {
            count: highIntentLeads,
            percentage: highIntentPercentage,
          },
          medium: {
            count: mediumIntentLeads,
            percentage: mediumIntentPercentage,
          },
          low: {
            count: lowIntentLeads,
            percentage: lowIntentPercentage,
          },
        },
        recentLeads: recentLeads.map(lead => ({
          ...lead,
          processed_at: lead.processed_at?.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting scoring summary:', error);
    next(error);
  }
};
