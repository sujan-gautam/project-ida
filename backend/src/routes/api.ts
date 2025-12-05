import express, { Response } from 'express';
import multer from 'multer';
import { authenticateApiKey, trackApiUsage, requirePermission, ApiKeyRequest } from '../middleware/apiKeyAuth';
import { analyzeData } from '../utils/analysis';
import { preprocessData } from '../utils/preprocessing';
import { generateSummary } from '../utils/gemini';
import Dataset from '../models/Dataset';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  },
});

// Apply authentication and tracking to all routes
router.use(authenticateApiKey);
router.use(trackApiUsage);

/**
 * @route   POST /api/v1/analyze
 * @desc    Analyze uploaded dataset
 * @access  Private (API Key)
 */
router.post(
  '/analyze',
  requirePermission('analyze'),
  upload.single('file'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          message: 'Please upload a CSV or Excel file',
        });
      }

      const { name } = req.body;
      const file = req.file;

      // Analyze the data
      const analysis = await analyzeData(file.buffer, file.originalname);

      // Create dataset record
      const dataset = await Dataset.create({
        userId: req.apiKey.userId,
        name: name || file.originalname,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        analysis,
        rawData: [], // Don't store raw data for API requests (privacy)
      });

      res.status(200).json({
        success: true,
        data: {
          datasetId: dataset._id,
          analysis,
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      console.error('API analyze error:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message || 'An error occurred while analyzing the dataset',
      });
    }
  }
);

/**
 * @route   POST /api/v1/datasets/:datasetId/preprocess
 * @desc    Preprocess dataset
 * @access  Private (API Key)
 */
router.post(
  '/datasets/:datasetId/preprocess',
  requirePermission('preprocess'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { datasetId } = req.params;
      const preprocessingOptions = req.body;

      // Find dataset (must belong to API key owner)
      const dataset = await Dataset.findOne({
        _id: datasetId,
        userId: req.apiKey.userId,
      });

      if (!dataset) {
        return res.status(404).json({
          error: 'Dataset not found',
          message: 'The specified dataset does not exist or you do not have access to it',
        });
      }

      // Load raw data if not already loaded
      let data = dataset.rawData;
      if (!data || data.length === 0) {
        // For API, we need the original file - this would require storing it
        // For now, return error
        return res.status(400).json({
          error: 'Raw data not available',
          message: 'The dataset raw data is not available. Please upload a new dataset.',
        });
      }

      // Preprocess data
      const preprocessedData = await preprocessData(data, preprocessingOptions);

      // Update dataset
      dataset.preprocessedData = preprocessedData;
      dataset.preprocessingSteps = dataset.preprocessingSteps || [];
      dataset.preprocessingSteps.push(
        `Applied preprocessing: ${JSON.stringify(preprocessingOptions)}`
      );
      await dataset.save();

      res.status(200).json({
        success: true,
        data: {
          datasetId: dataset._id,
          preprocessedData,
          preprocessingSteps: dataset.preprocessingSteps,
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      console.error('API preprocess error:', error);
      res.status(500).json({
        error: 'Preprocessing failed',
        message: error.message || 'An error occurred while preprocessing the dataset',
      });
    }
  }
);

/**
 * @route   GET /api/v1/datasets/:datasetId/analysis
 * @desc    Get dataset analysis
 * @access  Private (API Key)
 */
router.get(
  '/datasets/:datasetId/analysis',
  requirePermission('analyze'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { datasetId } = req.params;

      const dataset = await Dataset.findOne({
        _id: datasetId,
        userId: req.apiKey.userId,
      });

      if (!dataset) {
        return res.status(404).json({
          error: 'Dataset not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          datasetId: dataset._id,
          name: dataset.name,
          analysis: dataset.analysis,
          preprocessingSteps: dataset.preprocessingSteps,
          createdAt: dataset.createdAt,
          updatedAt: dataset.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('API get analysis error:', error);
      res.status(500).json({
        error: 'Failed to retrieve analysis',
        message: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/v1/datasets/:datasetId/summarize
 * @desc    Generate AI summary
 * @access  Private (API Key)
 */
router.post(
  '/datasets/:datasetId/summarize',
  requirePermission('summarize'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { datasetId } = req.params;
      const { mode = 'intermediate', prompt } = req.body;

      const dataset = await Dataset.findOne({
        _id: datasetId,
        userId: req.apiKey.userId,
      });

      if (!dataset || !dataset.analysis) {
        return res.status(404).json({
          error: 'Dataset not found',
          message: 'Dataset or analysis not found',
        });
      }

      // Check if pre-generated summary exists
      if (!prompt && dataset.preGeneratedSummary && dataset.preGeneratedSummaryMode === mode) {
        return res.status(200).json({
          success: true,
          data: {
            datasetId: dataset._id,
            summary: dataset.preGeneratedSummary,
            mode,
            cached: true,
            timestamp: new Date(),
          },
        });
      }

      // Generate new summary
      const summary = await generateSummary(
        dataset.analysis,
        prompt,
        mode as 'beginner' | 'intermediate' | 'advanced'
      );

      // Update pre-generated summary if no custom prompt
      if (!prompt) {
        dataset.preGeneratedSummary = summary;
        dataset.preGeneratedSummaryMode = mode;
        await dataset.save();
      }

      res.status(200).json({
        success: true,
        data: {
          datasetId: dataset._id,
          summary,
          mode,
          cached: false,
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      console.error('API summarize error:', error);
      res.status(500).json({
        error: 'Summary generation failed',
        message: error.message || 'An error occurred while generating the summary',
      });
    }
  }
);

/**
 * @route   GET /api/v1/datasets
 * @desc    List all datasets
 * @access  Private (API Key)
 */
router.get('/datasets', async (req: ApiKeyRequest, res: Response) => {
  try {
    const datasets = await Dataset.find({
      userId: req.apiKey.userId,
    })
      .select('_id name fileName fileSize createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: {
        datasets,
        count: datasets.length,
      },
    });
  } catch (error: any) {
    console.error('API list datasets error:', error);
    res.status(500).json({
      error: 'Failed to retrieve datasets',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/usage
 * @desc    Get API usage statistics
 * @access  Private (API Key)
 */
router.get('/usage', async (req: ApiKeyRequest, res: Response) => {
  try {
    const ApiUsage = (await import('../models/ApiUsage')).default;
    const ApiKey = (await import('../models/ApiKey')).default;

    const apiKey = await ApiKey.findById(req.apiKeyId);

    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    // Get usage statistics
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayUsage, monthUsage, totalUsage, recentCalls] = await Promise.all([
      ApiUsage.countDocuments({
        apiKeyId: req.apiKeyId,
        timestamp: { $gte: today },
      }),
      ApiUsage.countDocuments({
        apiKeyId: req.apiKeyId,
        timestamp: { $gte: thisMonth },
      }),
      ApiUsage.countDocuments({
        apiKeyId: req.apiKeyId,
      }),
      ApiUsage.find({
        apiKeyId: req.apiKeyId,
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .select('endpoint method statusCode responseTime timestamp'),
    ]);

    const avgResponseTime = await ApiUsage.aggregate([
      { $match: { apiKeyId: apiKey._id } },
      { $group: { _id: null, avg: { $avg: '$responseTime' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        quota: apiKey.quota,
        rateLimit: apiKey.rateLimit,
        usage: {
          today: todayUsage,
          thisMonth: monthUsage,
          total: totalUsage,
        },
        statistics: {
          averageResponseTime: avgResponseTime[0]?.avg || 0,
          lastUsedAt: apiKey.lastUsedAt,
          totalRequests: apiKey.usageCount,
        },
        recentCalls,
      },
    });
  } catch (error: any) {
    console.error('API usage stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve usage statistics',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    version: '1.0.0',
  });
});

export default router;

