import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type MessageViewProps = {
  title: string;
  body?: string;
  /** Buttons or links shown under the text. */
  children?: ReactNode;
};

/** Centered title + explanation, used for empty, error and permission states. */
export function MessageView({ title, body, children }: MessageViewProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <Text className="text-center text-2xl font-bold text-foreground">{title}</Text>
      {body ? <Text className="text-center text-base text-muted">{body}</Text> : null}
      {children ? <View className="mt-3 w-full gap-3">{children}</View> : null}
    </View>
  );
}
