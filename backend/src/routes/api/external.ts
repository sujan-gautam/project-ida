import express, { Response } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { apiKeyAuth, requirePermission as checkPermission, ApiRequest as ApiKeyRequest } from '../../middleware/apiAuth';
import {
  analyzeData,
  detectInfiniteValues,
  detectDuplicates,
} from '../../utils/analysis';
import {
  preprocessData,
  replaceInfiniteWithNaN,
  handleMissingValues,
  applyCategoricalEncoding,
  applyNormalization,
} from '../../utils/preprocessing';
import { generateSummary, chatWithGemini } from '../../utils/gemini';

const router = express.Router();
router.use(apiKeyAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * @route   POST /api/v1/analyze
 * @desc    Analyze uploaded dataset
 * @access  Private (API Key required)
 */
router.post(
  '/analyze',
  upload.single('file'),
  checkPermission('analyze'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          code: 'FILE_MISSING'
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
          code: 'EMPTY_DATASET'
        });
      }

      // Analyze data
      const analysis = analyzeData(jsonData);
      const hasInfinite = detectInfiniteValues(jsonData);
      const duplicateStats = detectDuplicates(jsonData);

      const response = {
        success: true,
        data: {
          analysis: {
            ...analysis,
            hasInfiniteValues: hasInfinite.hasInf,
            infiniteValueStats: hasInfinite.infStats,
            duplicateStats,
          },
          metadata: {
            rowCount: jsonData.length,
            columnCount: Object.keys(jsonData[0]).length,
            fileName: file.originalname,
            fileSize: file.size,
            processedAt: new Date().toISOString(),
          },
        },
      };

      res.json(response);
    } catch (error: any) {
      console.error('External API analyze error:', error);
      res.status(500).json({
        error: 'Analysis failed',
        code: 'ANALYSIS_ERROR',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/v1/preprocess
 * @desc    Preprocess dataset
 * @access  Private (API Key required)
 */
router.post(
  '/preprocess',
  checkPermission('preprocess'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { data, options } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          error: 'Invalid dataset',
          code: 'INVALID_DATASET'
        });
      }

      // Analyze first to get column types
      const analysis = analyzeData(data);

      // Use the main preprocessing function
      const processedData = await preprocessData(data, {
        handleInfinite: options?.handleInfinite,
        missingValueMethod: options?.handleMissing ? (options.missingValueMethod || 'mean') : undefined,
        encodingMethod: options?.encodeCategorical ? (options.encodingMethod || 'one-hot') : undefined,
        normalizationMethod: options?.normalize ? (options.normalizationMethod || 'standard') : undefined,
        analysis
      });

      // Re-analyze after preprocessing
      const finalAnalysis = analyzeData(processedData);

      res.json({
        success: true,
        data: {
          processedData,
          analysis: finalAnalysis,
          preprocessingSteps: Object.keys(options || {}).filter(k => options[k]),
        },
      });
    } catch (error: any) {
      console.error('External API preprocess error:', error);
      res.status(500).json({
        error: 'Preprocessing failed',
        code: 'PREPROCESS_ERROR',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/v1/summarize
 * @desc    Generate AI summary of dataset analysis
 * @access  Private (API Key required)
 */
router.post(
  '/summarize',
  checkPermission('summarize'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { analysis, prompt, mode } = req.body;

      if (!analysis) {
        return res.status(400).json({
          error: 'Analysis data required',
          code: 'ANALYSIS_MISSING'
        });
      }

      const summary = await generateSummary(
        analysis,
        prompt,
        mode || 'intermediate'
      );

      res.json({
        success: true,
        data: {
          summary,
          mode: mode || 'intermediate',
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('External API summarize error:', error);
      res.status(500).json({
        error: 'Summary generation failed',
        code: 'SUMMARY_ERROR',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/v1/chat
 * @desc    Chat with AI about dataset
 * @access  Private (API Key required)
 */
router.post(
  '/chat',
  checkPermission('chat'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { message, analysis, context } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message required',
          code: 'MESSAGE_MISSING'
        });
      }

      const response = await chatWithGemini(message, analysis, context);

      res.json({
        success: true,
        data: {
          response,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('External API chat error:', error);
      res.status(500).json({
        error: 'Chat failed',
        code: 'CHAT_ERROR',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;

