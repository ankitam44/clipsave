import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from '@/lib/id';
import { guessPlatform } from '@/lib/platform';
import { processLink, ProcessLinkError } from '@/api/processLink';
import type {
  ReminderSettings,
  ReviewStatus,
  SavedItem,
  TodoItem,
  UserStats,
} from '@/store/types';

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

function nextStreak(stats: UserStats): number {
  if (!stats.lastActiveDate) return 1;
  const today = dateKey(new Date());
  const last = dateKey(new Date(stats.lastActiveDate));
  if (last === today) return Math.max(stats.currentStreak, 1);
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  return last === yesterday ? stats.currentStreak + 1 : 1;
}

const initialStats: UserStats = {
  totalSaved: 0,
  totalKept: 0,
  totalArchived: 0,
  totalTodosCompleted: 0,
  currentStreak: 0,
  lastActiveDate: null,
};

const initialSettings: ReminderSettings = {
  remindersEnabled: true,
  reminderHour: 18,
  reminderMinute: 0,
};

interface AppState {
  hydrated: boolean;
  hasOnboarded: boolean;
  items: SavedItem[];
  stats: UserStats;
  settings: ReminderSettings;

  completeOnboarding: () => void;
  addItemFromUrl: (url: string) => Promise<SavedItem>;
  reprocessItem: (id: string) => Promise<void>;
  toggleTodo: (itemId: string, todoId: string) => void;
  reviewItem: (id: string, decision: Exclude<ReviewStatus, 'unreviewed'>) => void;
  deleteItem: (id: string) => void;
  moveItemToCategory: (id: string, category: string) => void;
  clearArchived: () => void;
  setRemindersEnabled: (enabled: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;
  seedDemoData: () => void;
}

async function runProcessing(
  id: string,
  url: string,
  set: (fn: (s: AppState) => Partial<AppState>) => void
) {
  const patch = (id: string, changes: Partial<SavedItem>) =>
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, ...changes } : it)),
    }));

  try {
    const res = await processLink(url);
    patch(id, {
      status: 'ready',
      platform: res.platform,
      summary: res.summary,
      keyTakeaways: res.keyTakeaways,
      category: res.category || 'Unsorted',
      toolsMentioned: res.toolsMentioned,
      todos: res.todos.map(
        (text): TodoItem => ({ id: uuid(), text, completed: false, completedAt: null })
      ),
    });
  } catch (e) {
    const err = e as ProcessLinkError;
    patch(id, { status: err.unsupported ? 'unsupported' : 'failed' });
    throw err;
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      hasOnboarded: false,
      items: [],
      stats: initialStats,
      settings: initialSettings,

      completeOnboarding: () => set({ hasOnboarded: true }),

      addItemFromUrl: async (url: string) => {
        const existing = get().items.find((it) => it.url === url);
        if (existing && existing.status !== 'failed') return existing;

        if (existing) {
          // Retry a failed item in place instead of duplicating it.
          set((s) => ({
            items: s.items.map((it) =>
              it.id === existing.id ? { ...it, status: 'processing' } : it
            ),
          }));
          await runProcessing(existing.id, url, set);
          return get().items.find((it) => it.id === existing.id)!;
        }

        const item: SavedItem = {
          id: uuid(),
          url,
          platform: guessPlatform(url),
          title: null,
          summary: null,
          keyTakeaways: [],
          todos: [],
          toolsMentioned: [],
          category: null,
          status: 'processing',
          reviewStatus: 'unreviewed',
          savedAt: new Date().toISOString(),
          reviewedAt: null,
        };
        set((s) => ({
          items: [item, ...s.items],
          stats: { ...s.stats, totalSaved: s.stats.totalSaved + 1 },
        }));
        await runProcessing(item.id, url, set);
        return get().items.find((it) => it.id === item.id)!;
      },

      reprocessItem: async (id: string) => {
        const item = get().items.find((it) => it.id === id);
        if (!item) return;
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, status: 'processing' } : it)),
        }));
        await runProcessing(id, item.url, set);
      },

      toggleTodo: (itemId, todoId) =>
        set((s) => {
          let delta = 0;
          const items = s.items.map((it) => {
            if (it.id !== itemId) return it;
            return {
              ...it,
              todos: it.todos.map((t) => {
                if (t.id !== todoId) return t;
                delta = t.completed ? -1 : 1;
                return {
                  ...t,
                  completed: !t.completed,
                  completedAt: t.completed ? null : new Date().toISOString(),
                };
              }),
            };
          });
          return {
            items,
            stats: {
              ...s.stats,
              totalTodosCompleted: Math.max(0, s.stats.totalTodosCompleted + delta),
            },
          };
        }),

      reviewItem: (id, decision) =>
        set((s) => {
          const items = s.items.map((it) =>
            it.id === id
              ? { ...it, reviewStatus: decision, reviewedAt: new Date().toISOString() }
              : it
          );
          return {
            items,
            stats: {
              ...s.stats,
              totalKept: s.stats.totalKept + (decision === 'kept' ? 1 : 0),
              totalArchived: s.stats.totalArchived + (decision === 'archived' ? 1 : 0),
              currentStreak: nextStreak(s.stats),
              lastActiveDate: new Date().toISOString(),
            },
          };
        }),

      deleteItem: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),

      moveItemToCategory: (id, category) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, category } : it)),
        })),

      clearArchived: () =>
        set((s) => ({ items: s.items.filter((it) => it.reviewStatus !== 'archived') })),

      setRemindersEnabled: (enabled) =>
        set((s) => ({ settings: { ...s.settings, remindersEnabled: enabled } })),

      setReminderTime: (hour, minute) =>
        set((s) => ({ settings: { ...s.settings, reminderHour: hour, reminderMinute: minute } })),

      seedDemoData: () => {
        const now = Date.now();
        const mk = (
          overrides: Partial<SavedItem> & Pick<SavedItem, 'url' | 'platform' | 'summary'>
        ): SavedItem => ({
          id: uuid(),
          title: null,
          keyTakeaways: [],
          todos: [],
          toolsMentioned: [],
          category: 'Unsorted',
          status: 'ready',
          reviewStatus: 'unreviewed',
          savedAt: new Date(now).toISOString(),
          reviewedAt: null,
          ...overrides,
        });
        const todo = (text: string, completed = false): TodoItem => ({
          id: uuid(),
          text,
          completed,
          completedAt: completed ? new Date(now).toISOString() : null,
        });

        const demo: SavedItem[] = [
          mk({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            platform: 'youtube',
            category: 'AI Tools',
            summary:
              'A walkthrough of building an AI agent that reads your inbox and drafts replies, using Claude and a simple queue worker.',
            keyTakeaways: [
              'Start with one narrow workflow before generalizing',
              'Keep the human approval step for outgoing drafts',
              'Log every model call for debugging',
            ],
            todos: [
              todo('Set up a Claude API key'),
              todo('Clone the starter repo from the video description'),
              todo('Wire up the inbox webhook'),
            ],
            toolsMentioned: [
              { name: 'Claude API', url: 'https://anthropic.com' },
              { name: 'Railway', url: 'https://railway.app' },
            ],
            savedAt: new Date(now - 1 * 86400000).toISOString(),
          }),
          mk({
            url: 'https://www.instagram.com/reel/demo-design-tokens/',
            platform: 'instagram',
            category: 'Design',
            summary:
              'A 60-second breakdown of design tokens: naming conventions, semantic layers, and why your button should never hardcode a hex value.',
            keyTakeaways: ['Name tokens by role, not by color', 'Two layers: primitive + semantic'],
            todos: [
              todo('Audit hardcoded colors in the current project', true),
              todo('Draft a token naming convention'),
            ],
            toolsMentioned: [{ name: 'Figma Variables', url: 'https://figma.com' }],
            reviewStatus: 'kept',
            reviewedAt: new Date(now - 2 * 3600000).toISOString(),
            savedAt: new Date(now - 3 * 86400000).toISOString(),
          }),
          mk({
            url: 'https://www.tiktok.com/@demo/video/morning-routine-hack',
            platform: 'tiktok',
            category: 'Productivity',
            summary:
              'The 5am routine video you saved at 1am. It suggests journaling, cold showers, and other things that were never going to happen.',
            keyTakeaways: ['Routines stick when they start small'],
            todos: [todo('Try the two-minute journal template')],
            toolsMentioned: [],
            reviewStatus: 'archived',
            reviewedAt: new Date(now - 5 * 3600000).toISOString(),
            savedAt: new Date(now - 6 * 86400000).toISOString(),
          }),
        ];

        set((s) => ({
          items: [...demo, ...s.items],
          stats: {
            ...s.stats,
            totalSaved: s.stats.totalSaved + demo.length,
            totalKept: s.stats.totalKept + 1,
            totalArchived: s.stats.totalArchived + 1,
            totalTodosCompleted: s.stats.totalTodosCompleted + 1,
          },
        }));
      },
    }),
    {
      name: 'swipefile-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        hasOnboarded: s.hasOnboarded,
        items: s.items,
        stats: s.stats,
        settings: s.settings,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    }
  )
);

// ---- Selectors ----

export const selectPendingReady = (s: AppState) =>
  s.items.filter((it) => it.status === 'ready' && it.reviewStatus === 'unreviewed');

export const selectQueue = (s: AppState) =>
  s.items.filter(
    (it) => it.reviewStatus === 'unreviewed' && it.status !== 'failed' && it.status !== 'unsupported'
  );

export const selectProcessing = (s: AppState) =>
  s.items.filter((it) => it.status === 'processing' || it.status === 'pending');

export function selectCategories(s: AppState): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const it of s.items) {
    if (it.status !== 'ready') continue;
    const name = it.category ?? 'Unsorted';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const selectSavedThisWeek = (s: AppState) =>
  s.items.filter((it) => Date.now() - new Date(it.savedAt).getTime() < 7 * 86400000).length;
