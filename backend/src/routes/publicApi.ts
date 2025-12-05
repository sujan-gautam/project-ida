import express, { Response } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ApiRequest } from '../middleware/apiAuth';
import { apiKeyAuth, requirePermission, trackApiUsage } from '../middleware/apiAuth';
import { apiRateLimiter, checkMonthlyLimit } from '../middleware/rateLimiter';
import {
  analyzeData,
  detectInfiniteValues,
  detectDuplicates,
} from '../utils/analysis';
import {
  replaceInfiniteWithNaN,
  handleMissingValues,
  applyCategoricalEncoding,
  applyNormalization,
} from '../utils/preprocessing';
import { generateSummary, chatWithGemini } from '../utils/gemini';

const router = express.Router();

// Apply API key auth to all routes
router.use(apiKeyAuth);
router.use(checkMonthlyLimit);
router.use(apiRateLimiter);
router.use(trackApiUsage);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Health check endpoint
router.get('/health', (req: ApiRequest, res: Response) => {
  res.json({
    status: 'ok',
    message: 'API is operational',
    timestamp: new Date().toISOString(),
  });
});

// Analyze dataset
router.post(
  '/analyze',
  upload.single('file'),
  requirePermission('analyze'),
  async (req: ApiRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a CSV or Excel file in the "file" field',
        });
      }

      const file = req.file;
      const isExcel = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');
      let jsonData: any[] = [];

      if (isExcel) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        const csvText = file.buffer.toString('utf-8');
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        jsonData = result.data;
      }

      if (jsonData.length === 0) {
        return res.status(400).json({
          error: 'Empty dataset',
          message: 'The uploaded file contains no data',
        });
      }

      // Perform analysis
      const analysis = analyzeData(jsonData);
      const infiniteStats = detectInfiniteValues(jsonData);
      const duplicateStats = detectDuplicates(jsonData);

      res.json({
        success: true,
        data: {
          analysis: {
            ...analysis,
            infiniteValueStats: infiniteStats,
            hasInfiniteValues: Object.keys(infiniteStats).length > 0,
            duplicateStats,
          },
          rowCount: jsonData.length,
          columnCount: Object.keys(jsonData[0] || {}).length,
        },
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message || 'An error occurred while analyzing the dataset',
      });
    }
  }
);

// Preprocess dataset
router.post(
  '/preprocess',
  upload.single('file'),
  requirePermission('preprocess'),
  async (req: ApiRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a CSV or Excel file in the "file" field',
        });
      }

      const {
        handleInfinite,
        handleMissing,
        missingMethod,
        encodingMethod,
        normalizationMethod,
      } = req.body;

      const file = req.file;
      const isExcel = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');
      let jsonData: any[] = [];

      if (isExcel) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        const csvText = file.buffer.toString('utf-8');
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        jsonData = result.data;
      }

      if (jsonData.length === 0) {
        return res.status(400).json({
          error: 'Empty dataset',
          message: 'The uploaded file contains no data',
        });
      }

      let processedData = jsonData;

      // Apply preprocessing steps
      if (handleInfinite === 'true' || handleInfinite === true) {
        processedData = replaceInfiniteWithNaN(processedData);
      }

      if (handleMissing === 'true' || handleMissing === true) {
        processedData = handleMissingValues(processedData, missingMethod || 'mean');
      }

      if (encodingMethod && encodingMethod !== 'none') {
        processedData = applyCategoricalEncoding(processedData, encodingMethod);
      }

      if (normalizationMethod && normalizationMethod !== 'none') {
        processedData = applyNormalization(processedData, normalizationMethod);
      }

      // Re-analyze processed data
      const analysis = analyzeData(processedData);

      res.json({
        success: true,
        data: {
          processedData,
          analysis,
          rowCount: processedData.length,
          columnCount: Object.keys(processedData[0] || {}).length,
        },
      });
    } catch (error: any) {
      console.error('Preprocessing error:', error);
      res.status(500).json({
        error: 'Preprocessing failed',
        message: error.message || 'An error occurred while preprocessing the dataset',
      });
    }
  }
);

// Generate AI summary
router.post(
  '/summarize',
  upload.single('file'),
  requirePermission('summarize'),
  async (req: ApiRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a CSV or Excel file in the "file" field',
        });
      }

      const { mode = 'intermediate', prompt } = req.body;

      const file = req.file;
      const isExcel = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');
      let jsonData: any[] = [];

      if (isExcel) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        const csvText = file.buffer.toString('utf-8');
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        jsonData = result.data;
      }

      if (jsonData.length === 0) {
        return res.status(400).json({
          error: 'Empty dataset',
          message: 'The uploaded file contains no data',
        });
      }

      // Analyze data first
      const analysis = analyzeData(jsonData);

      // Generate summary
      const summary = await generateSummary(
        analysis,
        prompt || undefined,
        mode as 'beginner' | 'intermediate' | 'advanced'
      );

      res.json({
        success: true,
        data: {
          summary,
          mode,
          analysis: {
            rowCount: jsonData.length,
            columnCount: Object.keys(jsonData[0] || {}).length,
          },
        },
      });
    } catch (error: any) {
      console.error('Summarization error:', error);
      res.status(500).json({
        error: 'Summarization failed',
        message: error.message || 'An error occurred while generating the summary',
      });
    }
  }
);

// Chat with AI about dataset
router.post(
  '/chat',
  upload.single('file'),
  requirePermission('summarize'),
  async (req: ApiRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a CSV or Excel file in the "file" field',
        });
      }

      const { message, history = [] } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message required',
          message: 'Please provide a message in the request body',
        });
      }

      const file = req.file;
      const isExcel = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');
      let jsonData: any[] = [];

      if (isExcel) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        const csvText = file.buffer.toString('utf-8');
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        jsonData = result.data;
      }

      if (jsonData.length === 0) {
        return res.status(400).json({
          error: 'Empty dataset',
          message: 'The uploaded file contains no data',
        });
      }

      // Analyze data
      const analysis = analyzeData(jsonData);

      // Chat with AI
      const response = await chatWithGemini(analysis, message, history);

      res.json({
        success: true,
        data: {
          response,
          message,
        },
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({
        error: 'Chat failed',
        message: error.message || 'An error occurred while processing your message',
      });
    }
  }
);

// Get API usage stats for the authenticated API key
router.get('/usage', async (req: ApiRequest, res: Response) => {
  try {
    const ApiUsage = (await import('../models/ApiUsage')).default;
    const ApiKey = (await import('../models/ApiKey')).default;

    const apiKey = await ApiKey.findById(req.apiKey?._id);
    
    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    // Get recent usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usage = await ApiUsage.find({
      apiKeyId: apiKey._id,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Calculate stats
    const stats = {
      totalRequests: apiKey.usageCount,
      monthlyUsage: apiKey.monthlyUsage,
      monthlyLimit: apiKey.monthlyLimit,
      rateLimit: apiKey.rateLimit,
      lastUsedAt: apiKey.lastUsedAt,
      recentUsage: usage.map((u) => ({
        endpoint: u.endpoint,
        method: u.method,
        statusCode: u.statusCode,
        responseTime: u.responseTime,
        timestamp: u.createdAt,
      })),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Usage stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch usage stats',
      message: error.message,
    });
  }
});

export default router;

