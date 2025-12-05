import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IApiKey extends Document {
  key: string;
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  isActive: boolean;
  rateLimit: {
    requests: number; // Requests per window
    window: number; // Window in seconds
  };
  quota: {
    total: number; // Total requests allowed (null = unlimited)
    used: number; // Requests used
    resetDate: Date; // When quota resets
  };
  permissions: {
    analyze: boolean;
    preprocess: boolean;
    summarize: boolean;
    export: boolean;
  };
  lastUsedAt?: Date;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  generateKey(): string;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    key: {
      type: String,
      required: false, // Auto-generated in pre-save hook
      unique: true,
      index: true,
      sparse: true, // Allow multiple null values for uniqueness check
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    rateLimit: {
      requests: {
        type: Number,
        default: 100, // 100 requests per window
      },
      window: {
        type: Number,
        default: 60, // 60 seconds
      },
    },
    quota: {
      total: {
        type: Number,
        default: null, // null = unlimited
      },
      used: {
        type: Number,
        default: 0,
      },
      resetDate: {
        type: Date,
        default: () => {
          const date = new Date();
          date.setMonth(date.getMonth() + 1); // Reset monthly
          return date;
        },
      },
    },
    permissions: {
      analyze: {
        type: Boolean,
        default: true,
      },
      preprocess: {
        type: Boolean,
        default: true,
      },
      summarize: {
        type: Boolean,
        default: true,
      },
      export: {
        type: Boolean,
        default: true,
      },
    },
    lastUsedAt: {
      type: Date,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate API key
ApiKeySchema.methods.generateKey = function (): string {
  const prefix = 'ida_'; // Insite Driven Automation
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
};

// Generate key before creating
ApiKeySchema.pre('save', async function (next) {
  if (this.isNew && !this.key) {
    this.key = this.generateKey();
  }
  next();
});

export default mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
