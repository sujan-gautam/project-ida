import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import ApiKey from '../../models/ApiKey';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

/**
 * @route   GET /api/keys
 * @desc    Get all API keys for user
 * @access  Private
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const apiKeys = await ApiKey.find({ userId: req.userId })
      .select('-key') // Don't return hashed key
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: apiKeys.map(key => ({
        id: key._id,
        name: key.name,
        // keyPrefix: key.keyPrefix,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        usageCount: key.usageCount,
        rateLimit: key.rateLimit,
        // expiresAt: key.expiresAt,
        permissions: key.permissions,
        // metadata: key.metadata,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      error: 'Failed to fetch API keys',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * @route   POST /api/keys
 * @desc    Create new API key
 * @access  Private
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('rateLimit').optional().isInt({ min: 1, max: 10000 }),
    body('expiresAt').optional().isISO8601(),
    body('permissions').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, rateLimit, expiresAt, permissions, metadata } = req.body;

      const apiKey = new ApiKey({
        userId: req.userId,
        name,
        rateLimit: rateLimit || 1000,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        permissions: permissions || ['analyze', 'preprocess', 'summarize', 'chat'],
        metadata,
      });

      // Generate key (happens in pre-save hook)
      await apiKey.save();

      // Get plain key before it's hashed
      const plainKey = (apiKey as any)._plainKey;

      res.status(201).json({
        success: true,
        data: {
          id: apiKey._id,
          name: apiKey.name,
          key: plainKey, // Only returned once!
          // keyPrefix: apiKey.keyPrefix,
          isActive: apiKey.isActive,
          rateLimit: apiKey.rateLimit,
          // expiresAt: apiKey.expiresAt,
          permissions: apiKey.permissions,
          // metadata: apiKey.metadata,
          createdAt: apiKey.createdAt,
          warning: 'Save this API key securely. It will not be shown again.',
        },
      });
    } catch (error: any) {
      console.error('Create API key error:', error);
      res.status(500).json({
        error: 'Failed to create API key',
        code: 'CREATE_ERROR'
      });
    }
  }
);

/**
 * @route   PUT /api/keys/:id
 * @desc    Update API key
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('rateLimit').optional().isInt({ min: 1, max: 10000 }),
    body('isActive').optional().isBoolean(),
    body('expiresAt').optional().isISO8601(),
    body('permissions').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, rateLimit, isActive, expiresAt, permissions, metadata } = req.body;
      const apiKey = await ApiKey.findOne({ _id: req.params.id, userId: req.userId });

      if (!apiKey) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'NOT_FOUND'
        });
      }

      if (name) apiKey.name = name;
      if (rateLimit !== undefined) apiKey.rateLimit = rateLimit;
      if (isActive !== undefined) apiKey.isActive = isActive;
      // if (expiresAt !== undefined) apiKey.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
      if (permissions) apiKey.permissions = permissions;
      // if (metadata) apiKey.metadata = { ...apiKey.metadata, ...metadata };

      await apiKey.save();

      res.json({
        success: true,
        data: {
          id: apiKey._id,
          name: apiKey.name,
          // keyPrefix: apiKey.keyPrefix,
          isActive: apiKey.isActive,
          rateLimit: apiKey.rateLimit,
          // expiresAt: apiKey.expiresAt,
          permissions: apiKey.permissions,
          // metadata: apiKey.metadata,
          updatedAt: apiKey.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('Update API key error:', error);
      res.status(500).json({
        error: 'Failed to update API key',
        code: 'UPDATE_ERROR'
      });
    }
  }
);

/**
 * @route   DELETE /api/keys/:id
 * @desc    Delete API key
 * @access  Private
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const apiKey = await ApiKey.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      error: 'Failed to delete API key',
      code: 'DELETE_ERROR'
    });
  }
});

export default router;

