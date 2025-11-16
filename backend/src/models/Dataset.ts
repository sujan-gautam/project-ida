import mongoose, { Document, Schema } from 'mongoose';

export interface IThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IDataset extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  fileName: string;
  rawData: any[];
  analysis: any;
  preprocessedData: any[] | null;
  preprocessingSteps: string[];
  threads: IThreadMessage[];
  preGeneratedSummary?: string;
  preGeneratedSummaryMode?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

const ThreadMessageSchema = new Schema<IThreadMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const DatasetSchema = new Schema<IDataset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    rawData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    analysis: {
      type: Schema.Types.Mixed,
      default: null,
    },
    preprocessedData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    preprocessingSteps: {
      type: [String],
      default: [],
    },
    threads: {
      type: [ThreadMessageSchema],
      default: [],
    },
    preGeneratedSummary: {
      type: String,
      default: null,
    },
    preGeneratedSummaryMode: {
      type: String,
      required: false,
      validate: {
        validator: function(value: any) {
          // Allow null, undefined, or valid enum values
          if (value == null) return true;
          return ['beginner', 'intermediate', 'advanced'].includes(value);
        },
        message: 'preGeneratedSummaryMode must be beginner, intermediate, or advanced'
      }
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDataset>('Dataset', DatasetSchema);


