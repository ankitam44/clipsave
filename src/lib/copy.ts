// Swipefile's voice: self-aware about the save-and-never-watch problem,
// lightly sarcastic, never mean. Every user-facing string lives here.

export function greeting(hour: number, pendingCount: number): string {
  if (hour < 5) {
    return pendingCount > 0
      ? `Up late? Your ${pendingCount} saves are too.`
      : 'Up late? At least your backlog sleeps.';
  }
  if (hour < 12) {
    return pendingCount > 0
      ? 'Good morning. Your backlog is judging you.'
      : 'Good morning. Backlog: spotless. Suspicious.';
  }
  if (hour < 18) {
    return pendingCount > 0
      ? `Afternoon — ${pendingCount} ${pendingCount === 1 ? 'thing is' : 'things are'} waiting.`
      : 'Afternoon. Nothing pending. Who are you?';
  }
  return pendingCount > 0
    ? `Evening — ${pendingCount} ${pendingCount === 1 ? 'save wants' : 'saves want'} attention.`
    : 'Evening. All clear. Go touch grass.';
}

export const homeEmpty = {
  title: 'Nothing saved yet.',
  body: 'Which honestly might be the most productive you’ve been all week. Share a YouTube link here from Safari or the YouTube app to get started.',
  hint: 'Look for “Swipefile” in your share sheet',
};

export const processing = 'Reading your save... figuring out what you’re supposed to do now.';

export const deckCleared = {
  title: 'Backlog zero. You actually did it.',
  body: 'We’re proud of you. Genuinely surprised, but proud.',
  share: 'Flex on socials',
  shareMessage: 'Backlog zero on Swipefile. I actually watched the stuff I saved. 🧹✨',
};

export const deckEmpty = {
  title: 'Nothing to swipe.',
  body: 'Your queue is empty. Go save something educational you’ll definitely watch this time.',
};

export const errors = {
  processFailed:
    'Couldn’t read this one. The internet being weird, or maybe this link doesn’t want to be productive today.',
  unsupported: 'This platform isn’t supported yet — YouTube works great though!',
  noBackend: 'No backend configured. Add EXPO_PUBLIC_BACKEND_URL to your .env file.',
  itemMissing: 'This save wandered off. It’s not in your library anymore.',
  generic: 'Something broke. Not you — us. Try again?',
};

export const toasts = {
  archived: 'Gone. No judgment. (Some judgment.)',
  kept: 'Added to your to-dos. No pressure. (Some pressure.)',
  saved: 'Got it. Reading your save...',
  duplicate: 'Already saved that one. Saving it twice won’t make you watch it.',
  reprocessing: 'Running it through the AI again. Fresh eyes.',
  deleted: 'Deleted. Like it never happened.',
  moved: (category: string) => `Filed under ${category}.`,
  archiveCleared: 'Archive emptied. Clean slate energy.',
  todoAllDone: 'All to-dos done. Overachiever.',
};

export const reminderMessages: ((n: number) => string)[] = [
  (n) => `You've got ${n} ${n === 1 ? 'save' : 'saves'} collecting dust. Swipe time.`,
  () => 'Your backlog called. It misses you.',
  (n) => `${n} ${n === 1 ? 'thing' : 'things'} saved. 0 things done. You know what to do.`,
];

export function pickReminderCopy(pendingCount: number): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return reminderMessages[dayOfYear % reminderMessages.length](pendingCount);
}

export const categoryEmpty: Record<string, string> = {
  all: 'Nothing in here yet. The category tile was mostly decorative, apparently.',
  pending: 'Nothing pending here. Efficiency? In this economy?',
  kept: 'Nothing watched yet. The to-dos are waiting whenever you are.',
  archived: 'Nothing archived. You keep everything. Interesting.',
};
