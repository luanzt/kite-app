import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Typography, BottomSheet } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Check } from 'lucide-react-native';

/**
 * A field that opens a bottom sheet to pick one value from a list. The trigger
 * looks like the design's `.input` (showing the current selection); tapping it
 * slides up a sheet of options, and selecting one closes the sheet. Preferred
 * over a cramped `Segmented` when there are 4+ options or long labels.
 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value)?.label ?? '';
  const select = (v: T) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <BottomSheet isOpen={open} onOpenChange={setOpen}>
      <BottomSheet.Trigger asChild>
        <Pressable className="h-[52px] flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80">
          <Typography className="text-base text-ink">{current}</Typography>
          <ChevronDown size={20} color="#8a8e80" />
        </Pressable>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="px-s5" style={{ paddingBottom: insets.bottom + 12 }}>
            <BottomSheet.Title className="mb-s3 text-lg font-bold text-ink">
              {label}
            </BottomSheet.Title>
            <View>
              {options.map(opt => {
                const on = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => select(opt.value)}
                    className={`flex-row items-center justify-between rounded-md-k px-s4 py-s3 active:opacity-80 ${
                      on ? 'bg-surface-2' : ''
                    }`}
                  >
                    <Typography
                      className={`text-base ${
                        on ? 'font-bold text-ink' : 'text-ink-2'
                      }`}
                    >
                      {opt.label}
                    </Typography>
                    {on ? <Check size={20} color="#2e7d5b" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
