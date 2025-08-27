export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  phoneNumber?: string;
  address?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  profilePicture?: string;
}

export interface KPI {
  id: string;
  typeOfKPI: 'Effectiveness KPI' | 'Efficiency KPI' | 'Productivity KPI' | 'Quality KPI' | 'Timeliness KPI' | 'Financial KPI';
  kpi: string;
  formula: string;
  kpiDirection: 'up' | 'down' | 'neutral';
  targetValue: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Real-time';
  receiver: string;
  source: string;
  active: boolean;
  mode: 'Manual' | 'Automatic' | 'Semi-Automatic';
  tag: string;
  category: string;
  parentId?: string | null;
  level: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Record {
  id: string;
  title: string;
  date: Date;
  tag: string;
  attachments: (File | {
    base64Data: string;
    mimeType: string;
    name: string;
    size?: number;
  })[];
  link?: string;
  voiceNotes: VoiceNote[];
  videoNotes: VideoNote[];
  owner: string;
  parentId?: string | null;
  level: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceNote {
  id: string;
  name: string;
  file: File | {
    base64Data: string;
    mimeType: string;
    name: string;
    size?: number;
  };
  duration?: number;
  recordedAt: Date;
}

export interface VideoNote {
  id: string;
  name: string;
  file: File | {
    base64Data: string;
    mimeType: string;
    name: string;
    size?: number;
  };
  duration?: number;
  recordedAt: Date;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Comment {
  id: string;
  recordId: string;
  parentId?: string | null;
  author: string;
  content: string;
  type: CommentType;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video';
  createdAt: Date;
  updatedAt: Date;
  level: number;
  order: number;
}

export type CommentType = 'text' | 'voice' | 'video'; 