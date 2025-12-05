import mongoose, { Document, Schema } from 'mongoose';

export interface IApiUsage extends Document {
  apiKeyId: mongoose.Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number; // in milliseconds
  ipAddress?: string;
  userAgent?: string;
  error?: string;
  metadata?: {
    datasetId?: string;
    fileSize?: number;
    rowsProcessed?: number;
  };
  timestamp: Date;
}

const ApiUsageSchema = new Schema<IApiUsage>(
  {
    apiKeyId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiKey',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    error: {
      type: String,
    },
    metadata: {
      datasetId: {
        type: String,
      },
      fileSize: {
        type: Number,
      },
      rowsProcessed: {
        type: Number,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We use timestamp field instead
  }
);

// Index for efficient queries
ApiUsageSchema.index({ apiKeyId: 1, timestamp: -1 });
ApiUsageSchema.index({ timestamp: -1 });
ApiUsageSchema.index({ statusCode: 1, timestamp: -1 });

export default mongoose.model<IApiUsage>('ApiUsage', ApiUsageSchema);
