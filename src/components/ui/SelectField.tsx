import { Pressable, View } from 'react-native';
import { Typography, BottomSheet, useBottomSheet } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Check } from 'lucide-react-native';

/**
 * A field that opens a bottom sheet to pick one value from a list. The trigger
 * looks like the design's `.input` (showing the current selection); tapping it
 * slides up a sheet of options, and selecting one closes the sheet. Preferred
 * over a cramped `Segmented` when there are 4+ options or long labels.
 *
 * The `BottomSheet` is left uncontrolled (no `isOpen`/`onOpenChange`) — it
 * manages its own open state via `Trigger`/`Overlay`, matching HeroUI's docs.
 * To close after a selection we use the in-context
 * `useBottomSheet().onOpenChange(false)` from `OptionList`.
 *
 * NOTE: the "needs ~3 taps to open" bug was NOT in this component — it was in
 * heroui-native v1.0.4, where the first `snapToIndex` after mount is silently
 * ignored by @gorhom/bottom-sheet (layout not ready yet). That is fixed via
 * `patches/heroui-native+1.0.4.patch` (re-issues the snap on the next frames).
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
  const current = options.find(o => o.value === value)?.label ?? '';
  return (
    <BottomSheet>
      <BottomSheet.Trigger asChild>
        <Pressable className="h-[52px] flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80">
          <Typography className="text-base text-ink">{current}</Typography>
          <ChevronDown size={20} color="#8a8e80" />
        </Pressable>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        {/* Explicit scrim: HeroUI's default --color-backdrop is only black @20%
            (washed out behind the white sheet), and overriding that token via
            @theme didn't reach Uniwind — so set the dim directly via className. */}
        <BottomSheet.Overlay className="bg-black/60" />
        <BottomSheet.Content>
          <View className="px-s5" style={{ paddingBottom: insets.bottom + 12 }}>
            <BottomSheet.Title className="mb-s3 text-lg font-bold text-ink">
              {label}
            </BottomSheet.Title>
            <OptionList value={value} options={options} onChange={onChange} />
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/**
 * The option rows, rendered inside `BottomSheet.Content`. Lives in its own
 * component so it can call `useBottomSheet()` (only valid inside a BottomSheet)
 * to close the sheet after a choice is made.
 */
function OptionList<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const { onOpenChange } = useBottomSheet();
  const select = (v: T) => {
    onChange(v);
    onOpenChange(false);
  };
  return (
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
  );
}
