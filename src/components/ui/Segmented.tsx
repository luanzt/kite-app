import { Pressable, View } from 'react-native';
import { Typography } from 'heroui-native';

/** Segmented control matching the design's `.seg`. Best for 2-3 short options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-s1 rounded-md-k bg-surface-2 p-s1">
      {options.map(opt => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`h-10 flex-1 items-center justify-center rounded-sm-k ${on ? 'bg-surface shadow-sm' : ''}`}
          >
            <Typography className={`text-sm font-bold ${on ? 'text-ink' : 'text-ink-2'}`}>
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
