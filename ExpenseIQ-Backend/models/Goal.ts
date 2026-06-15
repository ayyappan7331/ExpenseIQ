import mongoose, { Schema, Document } from 'mongoose';

interface GoalDocument extends Document {
  userId: mongoose.Types.ObjectId;
  context: 'Personal' | 'Business';
  month: string;
  amount: number;
}

const goalSchema = new Schema<GoalDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    context: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
    month: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, context: 1, month: 1 }, { unique: true });

const Goal = mongoose.model<GoalDocument>('Goal', goalSchema);
export = Goal;
