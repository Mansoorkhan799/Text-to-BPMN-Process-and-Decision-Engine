import mongoose from 'mongoose';

export interface ILatexTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LatexTemplateSchema = new mongoose.Schema<ILatexTemplate>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Blank Document', 'Guidelines', 'Process', 'Policy', 'Runbook', 'SOP'],
  },
  content: {
    type: String,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.models.LatexTemplate || mongoose.model<ILatexTemplate>('LatexTemplate', LatexTemplateSchema); 