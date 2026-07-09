export type ContentPlatform = 'youtube' | 'instagram' | 'tiktok' | 'unknown';

export type ItemStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'unsupported';

export type ReviewStatus = 'unreviewed' | 'kept' | 'archived';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
}

export interface ToolMention {
  name: string;
  url: string;
}

export interface SavedItem {
  id: string;
  url: string;
  platform: ContentPlatform;
  title: string | null;
  summary: string | null;
  keyTakeaways: string[];
  todos: TodoItem[];
  toolsMentioned: ToolMention[];
  category: string | null;
  status: ItemStatus;
  reviewStatus: ReviewStatus;
  savedAt: string;
  reviewedAt: string | null;
}

export interface UserStats {
  totalSaved: number;
  totalKept: number;
  totalArchived: number;
  totalTodosCompleted: number;
  currentStreak: number;
  lastActiveDate: string | null;
}

export interface ReminderSettings {
  remindersEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export interface ProcessLinkResponse {
  platform: ContentPlatform;
  summary: string;
  keyTakeaways: string[];
  todos: string[];
  toolsMentioned: ToolMention[];
  category: string;
  transcriptAvailable: boolean;
}
