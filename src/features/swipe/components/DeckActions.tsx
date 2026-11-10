import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

type DeckActionsProps = {
  onDelete: () => void;
  onKeep: () => void;
  onUndo: () => void;
  canSwipe: boolean;
  canUndo: boolean;
};

type RoundButtonProps = {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled: boolean;
  className: string;
  glyphClassName: string;
};

function RoundButton({ label, glyph, onPress, disabled, className, glyphClassName }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      className={cn(
        'items-center justify-center rounded-full border-2 bg-surface active:opacity-70',
        disabled && 'opacity-30',
        className,
      )}
    >
      <Text className={cn('font-bold', glyphClassName)}>{glyph}</Text>
    </Pressable>
  );
}

export function DeckActions({ onDelete, onKeep, onUndo, canSwipe, canUndo }: DeckActionsProps) {
  return (
    <View className="flex-row items-center justify-center gap-8 py-5">
      <RoundButton
        label="Delete"
        glyph="✕"
        onPress={onDelete}
        disabled={!canSwipe}
        className="h-16 w-16 border-danger"
        glyphClassName="text-2xl text-danger"
      />
      <RoundButton
        label="Undo"
        glyph="↺"
        onPress={onUndo}
        disabled={!canUndo}
        className="h-12 w-12 border-border"
        glyphClassName="text-xl text-muted"
      />
      <RoundButton
        label="Keep"
        glyph="✓"
        onPress={onKeep}
        disabled={!canSwipe}
        className="h-16 w-16 border-keep"
        glyphClassName="text-2xl text-keep"
      />
    </View>
  );
}
