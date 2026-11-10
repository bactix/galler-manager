import { Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Variant = 'primary' | 'secondary' | 'danger';

const containerStyles: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  danger: 'bg-danger',
};

const labelStyles: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-foreground',
  danger: 'text-white',
};

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  className?: string;
};

export function Button({ label, variant = 'primary', className, disabled, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        'items-center justify-center rounded-xl px-5 py-3 active:opacity-80',
        containerStyles[variant],
        disabled && 'opacity-40',
        className,
      )}
      {...rest}
    >
      <Text className={cn('text-base font-semibold', labelStyles[variant])}>{label}</Text>
    </Pressable>
  );
}
