import { Input, TextField } from 'heroui-native';

/** A styled text field matching the design's `.input` (52px, bordered). */
export function FormInput(props: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <TextField>
      <Input
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType ?? 'default'}
        className="h-[52px] rounded-md-k border border-line bg-surface px-s4 text-base text-ink focus:border-pace-on"
      />
    </TextField>
  );
}
