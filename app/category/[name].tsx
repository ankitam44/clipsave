import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Pill, PlatformBadge } from '@/components/Pill';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState, LoadingState } from '@/components/States';
import { useStore, selectCategories } from '@/store/useStore';
import { showToast } from '@/store/useToast';
import { categoryGradient } from '@/lib/categoryColor';
import { categoryEmpty, errors, toasts } from '@/lib/copy';
import { colors, radius } from '@/theme';
import type { SavedItem } from '@/store/types';

type Filter = 'all' | 'pending' | 'kept' | 'archived';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'kept', label: 'Watched' },
  { key: 'archived', label: 'Archived' },
];

function matchesFilter(item: SavedItem, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return item.reviewStatus === 'unreviewed';
  return item.reviewStatus === filter;
}

export default function CategoryView() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const categoryName = name ?? 'Unsorted';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useStore((s) => s.hydrated);
  const allItems = useStore((s) => s.items);
  const categories = useStore(selectCategories);
  const deleteItem = useStore((s) => s.deleteItem);
  const moveItemToCategory = useStore((s) => s.moveItemToCategory);
  const reprocessItem = useStore((s) => s.reprocessItem);

  const [filter, setFilter] = useState<Filter>('all');
  const [actionItem, setActionItem] = useState<SavedItem | null>(null);
  const [sheetMode, setSheetMode] = useState<'actions' | 'move' | 'delete'>('actions');

  if (!hydrated) return <LoadingState label="Opening the pile..." />;

  const inCategory = allItems.filter(
    (it) => (it.category ?? 'Unsorted') === categoryName && it.status === 'ready'
  );
  const filtered = inCategory.filter((it) => matchesFilter(it, filter));
  const [start, end] = categoryGradient(categoryName);

  const closeSheet = () => {
    setActionItem(null);
    setSheetMode('actions');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Colored header */}
      <LinearGradient
        colors={[start, end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 18, gap: 10 }}
      >
        <PressableScale haptic onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 4 }}>
          <AppText style={{ fontSize: 20, color: '#FFF' }}>←</AppText>
        </PressableScale>
        <AppText v="display" color="#FFFFFF">
          {categoryName}
        </AppText>
        <AppText v="caption" color="rgba(255,255,255,0.85)">
          {inCategory.length} save{inCategory.length === 1 ? '' : 's'} · long-press one for options
        </AppText>
      </LinearGradient>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14 }}>
        {FILTERS.map((f) => (
          <PressableScale
            key={f.key}
            haptic
            onPress={() => setFilter(f.key)}
            style={{
              backgroundColor: filter === f.key ? colors.text : colors.surface,
              borderRadius: radius.pill,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <AppText v="caption" color={filter === f.key ? '#FFF' : colors.textSecondary}>
              {f.label}
            </AppText>
          </PressableScale>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState emoji="🗂️" title="Empty." body={categoryEmpty[filter]} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 12 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
              <ItemRow
                item={item}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
                onLongPress={() => {
                  setSheetMode('actions');
                  setActionItem(item);
                }}
              />
            </Animated.View>
          )}
        />
      )}

      {/* Long-press action sheet */}
      <BottomSheet visible={!!actionItem} onClose={closeSheet}>
        {actionItem && sheetMode === 'actions' && (
          <View style={{ gap: 4 }}>
            <AppText v="caption" numberOfLines={2} style={{ marginBottom: 10 }}>
              {actionItem.summary}
            </AppText>
            <SheetRow emoji="📦" label="Move to different category" onPress={() => setSheetMode('move')} />
            <SheetRow
              emoji="🤖"
              label="Re-process with AI"
              onPress={() => {
                const id = actionItem.id;
                closeSheet();
                showToast(toasts.reprocessing, 'info');
                reprocessItem(id).catch(() => showToast(errors.processFailed, 'danger'));
              }}
            />
            <SheetRow emoji="🗑️" label="Delete" danger onPress={() => setSheetMode('delete')} />
          </View>
        )}

        {actionItem && sheetMode === 'move' && (
          <View style={{ gap: 12 }}>
            <AppText v="title">Where does it live now?</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {categories
                .filter((c) => c.name !== categoryName)
                .map((c) => (
                  <PressableScale
                    key={c.name}
                    haptic
                    onPress={() => {
                      moveItemToCategory(actionItem.id, c.name);
                      showToast(toasts.moved(c.name), 'success');
                      closeSheet();
                    }}
                  >
                    <Pill label={c.name} color={categoryGradient(c.name)[0]} />
                  </PressableScale>
                ))}
              {categories.filter((c) => c.name !== categoryName).length === 0 && (
                <AppText v="body" color={colors.textSecondary}>
                  No other categories yet. Save more stuff first.
                </AppText>
              )}
            </View>
          </View>
        )}

        {actionItem && sheetMode === 'delete' && (
          <View style={{ gap: 14 }}>
            <AppText v="title">Delete this save?</AppText>
            <AppText v="body" color={colors.textSecondary}>
              The to-dos go with it. No archive, no undo, no trace.
            </AppText>
            <SheetRow
              emoji="🗑️"
              label="Yes, delete it"
              danger
              onPress={() => {
                deleteItem(actionItem.id);
                showToast(toasts.deleted, 'danger');
                closeSheet();
              }}
            />
            <SheetRow emoji="😮‍💨" label="Never mind" onPress={() => setSheetMode('actions')} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

function ItemRow({
  item,
  onPress,
  onLongPress,
}: {
  item: SavedItem;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [start, end] = categoryGradient(item.category);
  const status =
    item.reviewStatus === 'unreviewed'
      ? { label: 'Pending', color: colors.primary }
      : item.reviewStatus === 'kept'
        ? { label: 'Watched', color: colors.success }
        : { label: 'Archived', color: colors.textSecondary };
  const done = item.todos.filter((t) => t.completed).length;

  return (
    <PressableScale
      haptic
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flexDirection: 'row',
        gap: 12,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: 12,
        alignItems: 'center',
      }}
    >
      <LinearGradient
        colors={[start, end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
      >
        <PlatformBadge platform={item.platform} />
      </LinearGradient>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText v="body" numberOfLines={2} style={{ fontSize: 14, lineHeight: 19 }}>
          {item.summary}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pill label={status.label} color={status.color} />
          {item.todos.length > 0 && (
            <AppText v="caption">
              {done}/{item.todos.length} to-dos
            </AppText>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

function SheetRow({
  emoji,
  label,
  danger,
  onPress,
}: {
  emoji: string;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      haptic
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 6,
      }}
    >
      <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
      <AppText v="body" color={danger ? colors.danger : colors.text}>
        {label}
      </AppText>
    </PressableScale>
  );
}
