import mongoose, { Schema } from 'mongoose';
import type { Goal as GoalShape } from '../types/api';

const goalSchema = new Schema<GoalShape>(
  {
    profileId: { type: String, default: 'default' },
    month: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

goalSchema.index({ profileId: 1, month: 1 }, { unique: true });

const Goal = mongoose.model<GoalShape>('Goal', goalSchema);
export = Goal;
