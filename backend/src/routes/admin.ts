import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import ApiKey from '../models/ApiKey';
import ApiUsage from '../models/ApiUsage';
import Dataset from '../models/Dataset';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);

// Middleware to check admin role
const requireAdmin = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      totalApiKeys,
      activeApiKeys,
      totalDatasets,
      totalApiCalls,
      todayApiCalls,
      monthApiCalls,
      lastMonthApiCalls,
      recentUsers,
      recentApiKeys,
    ] = await Promise.all([
      User.countDocuments(),
      ApiKey.countDocuments(),
      ApiKey.countDocuments({ isActive: true }),
      Dataset.countDocuments(),
      ApiUsage.countDocuments(),
      ApiUsage.countDocuments({ timestamp: { $gte: today } }),
      ApiUsage.countDocuments({ timestamp: { $gte: thisMonth } }),
      ApiUsage.countDocuments({
        timestamp: { $gte: lastMonth, $lt: thisMonth },
      }),
      User.find().sort({ createdAt: -1 }).limit(10).select('name email createdAt'),
      ApiKey.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name email'),
    ]);

    // Calculate growth
    const userGrowth = totalUsers > 0 ? ((totalUsers - 1) / 1) * 100 : 0;
    const apiCallGrowth =
      lastMonthApiCalls > 0
        ? ((monthApiCalls - lastMonthApiCalls) / lastMonthApiCalls) * 100
        : 0;

    // Get top endpoints
    const topEndpoints = await ApiUsage.aggregate([
      { $group: { _id: '$endpoint', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get error rate
    const errorRate = await ApiUsage.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          errors: {
            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
          },
        },
      },
    ]);

    const errorRatePercent =
      errorRate[0]?.total > 0
        ? (errorRate[0].errors / errorRate[0].total) * 100
        : 0;

    // Get average response time
    const avgResponseTime = await ApiUsage.aggregate([
      { $group: { _id: null, avg: { $avg: '$responseTime' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalApiKeys,
          activeApiKeys,
          totalDatasets,
          totalApiCalls,
        },
        today: {
          apiCalls: todayApiCalls,
        },
        thisMonth: {
          apiCalls: monthApiCalls,
        },
        growth: {
          users: userGrowth,
          apiCalls: apiCallGrowth,
        },
        metrics: {
          averageResponseTime: avgResponseTime[0]?.avg || 0,
          errorRate: errorRatePercent,
        },
        topEndpoints,
        recentUsers,
        recentApiKeys,
      },
    });
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Get API key count for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const apiKeyCount = await ApiKey.countDocuments({ userId: user._id });
        const datasetCount = await Dataset.countDocuments({ userId: user._id });
        return {
          ...user.toObject(),
          apiKeyCount,
          datasetCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      error: 'Failed to retrieve users',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/api-keys
 * @desc    Get all API keys
 * @access  Private (Admin)
 */
router.get('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const [apiKeys, total] = await Promise.all([
      ApiKey.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ApiKey.countDocuments(query),
    ]);

    // Get usage statistics for each API key
    const apiKeysWithStats = await Promise.all(
      apiKeys.map(async (key) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [todayUsage, totalUsage] = await Promise.all([
          ApiUsage.countDocuments({
            apiKeyId: key._id,
            timestamp: { $gte: today },
          }),
          ApiUsage.countDocuments({ apiKeyId: key._id }),
        ]);

        return {
          ...key.toObject(),
          usage: {
            today: todayUsage,
            total: totalUsage,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        apiKeys: apiKeysWithStats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin get API keys error:', error);
    res.status(500).json({
      error: 'Failed to retrieve API keys',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/api-keys
 * @desc    Create API key for user
 * @access  Private (Admin)
 */
router.post(
  '/api-keys',
  [
    body('userId').isMongoId(),
    body('name').trim().notEmpty(),
    body('rateLimit.requests').optional().isInt({ min: 1 }),
    body('rateLimit.window').optional().isInt({ min: 1 }),
    body('quota.total').optional().custom((value) => {
      if (value === null || value === undefined) {
        return true; // Allow null/undefined
      }
      if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
        return true;
      }
      throw new Error('quota.total must be a positive integer or null');
    }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, name, description, rateLimit, quota, permissions } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate API key
      const prefix = 'ida_';
      let generatedKey: string;
      let keyExists = true;
      let attempts = 0;
      
      // Ensure key is unique (very rare collision)
      while (keyExists && attempts < 5) {
        const randomBytes = crypto.randomBytes(32).toString('hex');
        generatedKey = `${prefix}${randomBytes}`;
        
        const existing = await ApiKey.findOne({ key: generatedKey });
        if (!existing) {
          keyExists = false;
        }
        attempts++;
      }

      if (keyExists) {
        return res.status(500).json({
          error: 'Failed to create API key',
          message: 'Unable to generate unique API key after multiple attempts',
        });
      }

      const apiKey = await ApiKey.create({
        userId,
        name,
        description,
        key: generatedKey!,
        rateLimit: rateLimit || { requests: 100, window: 60 },
        quota: quota || { total: null, used: 0, resetDate: new Date() },
        permissions: permissions || {
          analyze: true,
          preprocess: true,
          summarize: true,
          export: true,
        },
      });

      res.status(201).json({
        success: true,
        data: apiKey,
      });
    } catch (error: any) {
      console.error('Admin create API key error:', error);
      res.status(500).json({
        error: 'Failed to create API key',
        message: error.message,
      });
    }
  }
);

/**
 * @route   PATCH /api/admin/api-keys/:id
 * @desc    Update API key
 * @access  Private (Admin)
 */
router.patch('/api-keys/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating the key itself
    delete updates.key;

    const apiKey = await ApiKey.findByIdAndUpdate(id, updates, { new: true });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.status(200).json({
      success: true,
      data: apiKey,
    });
  } catch (error: any) {
    console.error('Admin update API key error:', error);
    res.status(500).json({
      error: 'Failed to update API key',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/admin/api-keys/:id
 * @desc    Delete API key
 * @access  Private (Admin)
 */
router.delete('/api-keys/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const apiKey = await ApiKey.findByIdAndDelete(id);

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.status(200).json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error: any) {
    console.error('Admin delete API key error:', error);
    res.status(500).json({
      error: 'Failed to delete API key',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/usage
 * @desc    Get API usage analytics
 * @access  Private (Admin)
 */
router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, apiKeyId } = req.query;

    const query: any = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }
    if (apiKeyId) {
      query.apiKeyId = apiKeyId;
    }

    // Get usage statistics
    const [
      totalCalls,
      successCalls,
      errorCalls,
      avgResponseTime,
      endpointStats,
      statusCodeStats,
      hourlyStats,
    ] = await Promise.all([
      ApiUsage.countDocuments(query),
      ApiUsage.countDocuments({ ...query, statusCode: { $lt: 400 } }),
      ApiUsage.countDocuments({ ...query, statusCode: { $gte: 400 } }),
      ApiUsage.aggregate([
        { $match: query },
        { $group: { _id: null, avg: { $avg: '$responseTime' } } },
      ]),
      ApiUsage.aggregate([
        { $match: query },
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      ApiUsage.aggregate([
        { $match: query },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ApiUsage.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCalls,
          successCalls,
          errorCalls,
          successRate: totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0,
          averageResponseTime: avgResponseTime[0]?.avg || 0,
        },
        endpointStats,
        statusCodeStats,
        hourlyStats,
      },
    });
  } catch (error: any) {
    console.error('Admin usage analytics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve usage analytics',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/datasets
 * @desc    Get all datasets
 * @access  Private (Admin)
 */
router.get('/datasets', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (userId) {
      query.userId = userId;
    }

    const [datasets, total] = await Promise.all([
      Dataset.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-rawData -preprocessedData'),
      Dataset.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        datasets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin get datasets error:', error);
    res.status(500).json({
      error: 'Failed to retrieve datasets',
      message: error.message,
    });
  }
});

export default router;
