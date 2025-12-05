import express, { Response } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Dataset from '../models/Dataset';
import { authMiddleware, AuthRequest } from '../middleware/auth';
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
import { generateSummary, chatWithGemini, generateSuggestions } from '../utils/gemini';

const router = express.Router();
router.use(authMiddleware);

const upload = multer({ storage: multer.memoryStorage() });

// Upload dataset
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
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
      return res.status(400).json({ error: 'Empty dataset' });
    }

    // Run initial analysis
    const analysis = analyzeData(jsonData);
    const { hasInf, infStats } = detectInfiniteValues(jsonData);
    const dupStats = detectDuplicates(jsonData);

    // Create dataset
    const dataset = new Dataset({
      userId: req.userId,
      name: file.originalname.replace(/\.[^/.]+$/, ''),
      fileName: file.originalname,
      rawData: jsonData,
      analysis: {
        ...analysis,
        infiniteValueStats: infStats,
        hasInfiniteValues: hasInf,
        duplicateStats: dupStats,
      },
    });

    await dataset.save();

    // Auto-generate summary in background (don't block response)
    generateSummary(dataset.analysis, undefined, 'intermediate')
      .then(async (summary) => {
        dataset.preGeneratedSummary = summary;
        dataset.preGeneratedSummaryMode = 'intermediate';
        await dataset.save();
        console.log(`Pre-generated summary for dataset ${dataset._id}`);
      })
      .catch((error) => {
        console.error('Failed to pre-generate summary:', error);
        // Don't fail the request if summary generation fails
      });

    res.json({
      datasetId: dataset._id,
      analysis: dataset.analysis,
      message: 'Dataset uploaded and analyzed successfully',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get all datasets for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const datasets = await Dataset.find({ userId: req.userId })
      .select('name fileName createdAt updatedAt preprocessingSteps')
      .sort({ createdAt: -1 });

    res.json(datasets);
  } catch (error: any) {
    console.error('Get datasets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dataset by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json(dataset);
  } catch (error: any) {
    console.error('Get dataset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analyze dataset
router.post('/:id/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const data = dataset.preprocessedData || dataset.rawData;
    const analysis = analyzeData(data);
    const { hasInf, infStats } = detectInfiniteValues(data);
    const dupStats = detectDuplicates(data);

    dataset.analysis = {
      ...analysis,
      infiniteValueStats: infStats,
      hasInfiniteValues: hasInf,
      duplicateStats: dupStats,
    };

    await dataset.save();

    // Auto-regenerate summary in background after re-analysis (don't block response)
    generateSummary(dataset.analysis, undefined, 'intermediate')
      .then(async (summary) => {
        dataset.preGeneratedSummary = summary;
        dataset.preGeneratedSummaryMode = 'intermediate';
        await dataset.save();
        console.log(`Updated pre-generated summary for dataset ${dataset._id}`);
      })
      .catch((error) => {
        console.error('Failed to update pre-generated summary:', error);
        // Don't fail the request if summary generation fails
      });

    res.json(dataset.analysis);
  } catch (error: any) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Preprocess dataset
router.post('/:id/preprocess', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    let data = [...(dataset.preprocessedData || dataset.rawData)];
    const steps: string[] = [...(dataset.preprocessingSteps || [])];

    // Handle infinite values
    if (req.body.handleInfinite && dataset.analysis?.hasInfiniteValues) {
      data = replaceInfiniteWithNaN(data);
      steps.push('Replaced infinite values with NaN');
    }

    // Handle missing values
    if (req.body.missingValueMethod && req.body.missingValueMethod !== 'none') {
      data = handleMissingValues(
        data,
        req.body.missingValueMethod,
        dataset.analysis
      );
      const methodNames: Record<string, string> = {
        dropRows: 'Dropped rows with missing values',
        dropColumns: 'Dropped columns with missing values',
        fillMean: 'Filled missing values with mean',
        fillMedian: 'Filled missing values with median',
        fillMode: 'Filled missing values with mode',
        fillZero: 'Filled missing values with zero',
      };
      steps.push(methodNames[req.body.missingValueMethod] || 'Handled missing values');
    }

    // Apply encoding
    if (req.body.encodingMethod && req.body.encodingMethod !== 'none') {
      data = applyCategoricalEncoding(
        data,
        req.body.encodingMethod,
        dataset.analysis?.categoricalColumns || []
      );
      steps.push(
        `Applied ${req.body.encodingMethod === 'label' ? 'Label' : 'One-Hot'} Encoding`
      );
    }

    // Apply normalization
    if (req.body.normalizationMethod && req.body.normalizationMethod !== 'none') {
      data = applyNormalization(
        data,
        req.body.normalizationMethod,
        dataset.analysis?.numericColumns || []
      );
      steps.push(
        `Applied ${req.body.normalizationMethod === 'minmax' ? 'Min-Max' : 'Standard'} Normalization`
      );
    }

    // Re-analyze
    const analysis = analyzeData(data);
    const { hasInf, infStats } = detectInfiniteValues(data);
    const dupStats = detectDuplicates(data);

    dataset.preprocessedData = data;
    dataset.preprocessingSteps = steps;
    dataset.analysis = {
      ...analysis,
      infiniteValueStats: infStats,
      hasInfiniteValues: hasInf,
      duplicateStats: dupStats,
    };

    await dataset.save();

    // Auto-regenerate summary in background after preprocessing (don't block response)
    generateSummary(dataset.analysis, undefined, 'intermediate')
      .then(async (summary) => {
        dataset.preGeneratedSummary = summary;
        dataset.preGeneratedSummaryMode = 'intermediate';
        await dataset.save();
        console.log(`Updated pre-generated summary for dataset ${dataset._id} after preprocessing`);
      })
      .catch((error) => {
        console.error('Failed to update pre-generated summary after preprocessing:', error);
        // Don't fail the request if summary generation fails
      });

    res.json({
      data: dataset.preprocessedData,
      analysis: dataset.analysis,
      preprocessingSteps: dataset.preprocessingSteps,
    });
  } catch (error: any) {
    console.error('Preprocess error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Download dataset
router.get('/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const data = dataset.preprocessedData || dataset.rawData;
    const csv = Papa.unparse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="refined_${dataset.fileName.replace(/\.[^/.]+$/, '')}.csv"`
    );
    res.send(csv);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Summarize with Gemini
router.post('/:id/summarize', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const { prompt, isInitial, mode = 'intermediate' } = req.body;
    let response: string;

    if (isInitial) {
      // Check if we have a pre-generated summary that matches the mode
      // If mode matches and no custom prompt, use stored summary for fast response
      const summaryPrompt = prompt && prompt.trim() ? prompt : undefined;

      if (!summaryPrompt && dataset.preGeneratedSummary && dataset.preGeneratedSummaryMode === mode) {
        // Use pre-generated summary for instant response!
        response = dataset.preGeneratedSummary;

        // Add to thread if not already there
        const alreadyInThread = dataset.threads.some(
          (msg) => msg.role === 'assistant' && msg.content === response
        );

        if (!alreadyInThread) {
          dataset.threads.push({
            role: 'user',
            content: 'Generate a comprehensive automated summary of this dataset analysis',
            timestamp: new Date(),
          });
          dataset.threads.push({
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          });
          await dataset.save();
        }
      } else {
        // Generate new summary (different mode or custom prompt)
        response = await generateSummary(dataset.analysis, summaryPrompt, mode);

        // Update pre-generated summary if using default prompt
        if (!summaryPrompt) {
          dataset.preGeneratedSummary = response;
          dataset.preGeneratedSummaryMode = mode as 'beginner' | 'intermediate' | 'advanced';
        }

        // Add to thread
        dataset.threads.push({
          role: 'user',
          content: summaryPrompt || 'Generate a comprehensive automated summary of this dataset analysis',
          timestamp: new Date(),
        });
        dataset.threads.push({
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        });
        await dataset.save();
      }
    } else {
      // Chat with context
      response = await chatWithGemini(
        dataset.threads,
        dataset.analysis,
        prompt,
        mode
      );

      dataset.threads.push({
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      });
      dataset.threads.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });
      await dataset.save();
    }

    res.json({ response, threads: dataset.threads });
  } catch (error: any) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get threads
router.get('/:id/threads', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).select('threads');

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json(dataset.threads);
  } catch (error: any) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get suggestions
router.get('/:id/suggestions', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const mode = (req.query.mode as string) || 'intermediate';
    const suggestions = await generateSuggestions(
      dataset.analysis,
      dataset.threads,
      mode as 'beginner' | 'intermediate' | 'advanced'
    );

    res.json({ suggestions });
  } catch (error: any) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete dataset
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    await Dataset.deleteOne({ _id: req.params.id, userId: req.userId });

    res.json({ message: 'Dataset deleted successfully' });
  } catch (error: any) {
    console.error('Delete dataset error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Automation endpoint - Enhanced complex pipeline
router.post('/:id/automate', async (req: AuthRequest, res: Response) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    let data = [...dataset.rawData];
    const steps: string[] = [];
    const executionMetrics = {
      rowsProcessed: data.length,
      columnsProcessed: 0,
      infiniteValuesReplaced: 0,
      missingValuesFilled: 0,
      columnsEncoded: 0,
      columnsNormalized: 0,
      startTime: new Date(),
    };

    // Step 1: Data Validation & Type Detection
    const initialAnalysis = analyzeData(data);
    executionMetrics.columnsProcessed = initialAnalysis.columnCount;
    steps.push(`Data validation: Detected ${initialAnalysis.columnCount} columns with type analysis`);

    // Step 2: Handle infinite values
    const { hasInf: hasInfiniteValuesDetected } = detectInfiniteValues(data);
    if (dataset.analysis?.hasInfiniteValues || hasInfiniteValuesDetected) {
      const beforeCount = data.reduce((sum, row) => {
        return sum + Object.values(row).filter(v => typeof v === 'number' && !isFinite(v)).length;
      }, 0);

      data = replaceInfiniteWithNaN(data);

      const afterCount = data.reduce((sum, row) => {
        return sum + Object.values(row).filter(v => typeof v === 'number' && !isFinite(v)).length;
      }, 0);

      executionMetrics.infiniteValuesReplaced = beforeCount - afterCount;
      steps.push(`Replaced ${executionMetrics.infiniteValuesReplaced} infinite values with NaN`);
    }

    // Step 3: Advanced Missing Value Handling
    const analysisAfterInf = analyzeData(data);
    const missingValueStats = Object.entries(analysisAfterInf.columns)
      .filter(([_, info]) => info.missing > 0)
      .map(([col, info]) => ({ col, count: info.missing }));

    if (missingValueStats.length > 0) {
      // Smart filling: median for numeric, mode for categorical
      data = handleMissingValues(data, 'fillMedian', analysisAfterInf);

      const totalMissing = missingValueStats.reduce((sum, stat) => sum + stat.count, 0);
      executionMetrics.missingValuesFilled = totalMissing;
      steps.push(`Filled ${totalMissing} missing values across ${missingValueStats.length} columns using smart imputation`);
    }

    // Step 4: Data Quality Checks
    const qualityAnalysis = analyzeData(data);
    const { dupStats } = detectDuplicates(data);
    const duplicateColumns = Object.keys(dupStats || {});
    if (duplicateColumns.length > 0) {
      steps.push(`Data quality: Detected duplicates in ${duplicateColumns.length} columns`);
    }

    // Step 5: Outlier Detection & Handling
    const outlierColumns = qualityAnalysis.numericColumns.filter(col => {
      const stats = qualityAnalysis.columns[col].stats;
      return stats && stats.outliers > 0;
    });
    if (outlierColumns.length > 0) {
      steps.push(`Outlier detection: Found outliers in ${outlierColumns.length} numeric columns`);
    }

    // Step 6: Categorical Encoding
    if (qualityAnalysis.categoricalColumns.length > 0) {
      data = applyCategoricalEncoding(data, 'label', qualityAnalysis.categoricalColumns);
      executionMetrics.columnsEncoded = qualityAnalysis.categoricalColumns.length;
      steps.push(`Applied Label Encoding to ${executionMetrics.columnsEncoded} categorical columns`);
    }

    // Step 7: Feature Normalization
    if (qualityAnalysis.numericColumns.length > 0) {
      data = applyNormalization(data, 'standard', qualityAnalysis.numericColumns);
      executionMetrics.columnsNormalized = qualityAnalysis.numericColumns.length;
      steps.push(`Applied Standard Normalization to ${executionMetrics.columnsNormalized} numeric columns`);
    }

    // Step 8: Final Re-analysis
    const finalAnalysis = analyzeData(data);
    const { hasInf, infStats } = detectInfiniteValues(data);
    const finalDupStats = detectDuplicates(data);

    dataset.preprocessedData = data;
    dataset.preprocessingSteps = steps;
    dataset.analysis = {
      ...finalAnalysis,
      infiniteValueStats: infStats,
      hasInfiniteValues: hasInf,
      duplicateStats: finalDupStats,
    };

    await dataset.save();

    // Step 9: Generate comprehensive AI summary
    let summary = '';
    try {
      const summaryPrompt = `Generate a comprehensive analysis summary for this automated data preprocessing pipeline:

Pipeline Metrics:
- Rows Processed: ${executionMetrics.rowsProcessed}
- Columns Processed: ${executionMetrics.columnsProcessed}
- Infinite Values Replaced: ${executionMetrics.infiniteValuesReplaced}
- Missing Values Filled: ${executionMetrics.missingValuesFilled}
- Columns Encoded: ${executionMetrics.columnsEncoded}
- Columns Normalized: ${executionMetrics.columnsNormalized}

Final Dataset Statistics:
${JSON.stringify({
        rowCount: finalAnalysis.rowCount,
        columnCount: finalAnalysis.columnCount,
        numericColumns: finalAnalysis.numericColumns.length,
        categoricalColumns: finalAnalysis.categoricalColumns.length,
      }, null, 2)}

Provide insights on data quality improvements, preprocessing effectiveness, and recommendations for ML model training.`;

      summary = await generateSummary(dataset.analysis, summaryPrompt, 'intermediate');

      // Store in pre-generated summary for fast access
      dataset.preGeneratedSummary = summary;
      dataset.preGeneratedSummaryMode = 'intermediate';

      // Also add to threads for conversation history
      dataset.threads.push({
        role: 'user',
        content: 'Generate a comprehensive summary of this automated analysis',
        timestamp: new Date(),
      });
      dataset.threads.push({
        role: 'assistant',
        content: summary,
        timestamp: new Date(),
      });
      await dataset.save();
    } catch (error) {
      console.error('Summary generation failed:', error);
    }

    const executionTime = new Date().getTime() - executionMetrics.startTime.getTime();

    res.json({
      data: dataset.preprocessedData,
      analysis: dataset.analysis,
      preprocessingSteps: dataset.preprocessingSteps,
      summary,
      threads: dataset.threads,
      metrics: {
        ...executionMetrics,
        executionTimeMs: executionTime,
        executionTimeSeconds: (executionTime / 1000).toFixed(2),
      },
      message: 'Automation pipeline completed successfully',
    });
  } catch (error: any) {
    console.error('Automation error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;


