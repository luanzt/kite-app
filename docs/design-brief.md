# Kite — UI/UX Design Brief (prompt for Claude)

> Copy everything below the line into Claude (desktop/web) to have it redesign
> the app's UI. It is written so Claude produces drop-in React Native code for
> this exact project without inventing components or breaking the stack.

---

You are a senior React Native product designer + engineer. Redesign the **entire UI** of my mobile app **Kite** and deliver **production-ready React Native code** I can paste into my existing project. The app already works functionally — the current UI is placeholder/ugly. I want it to look polished and professional. Do NOT change the data model, navigation structure, or business logic; only redesign the presentation.

## What Kite is
An **offline-first goal & progress tracker** (inspired by Strides). Users create long-term goals and track progress over time. The signature feature is a **pace line** — a green/red indicator showing whether they're on track vs. behind for time-based goals.

## Hard technical constraints (do not violate)
- **React Native CLI 0.85, NO Expo.**
- **UI library: HeroUI Native v1.0** (`heroui-native`). Use its components. It is a compound-component library. Key rules:
  - Use `<Typography>` for ALL text — NEVER `<Text>` (it's deprecated). Import from `heroui-native`. `Typography` supports `className`.
  - `Button` has NO `isLoading` prop — use `isDisabled` + a conditional `<Spinner/>`. Label goes inside `<Button.Label>`. Variants: `primary | secondary | tertiary | outline | ghost | danger | danger-soft`.
  - `Card` uses `Card.Header / Card.Body / Card.Footer`, `Card.Title`, `Card.Description`.
  - `TextField` wraps `<Label><Label.Text/></Label>`, `<Input/>`, `<FieldError/>`. `Input` has no label/error props of its own.
  - `Slider` is compound: `<Slider ...><Slider.Track><Slider.Fill/><Slider.Thumb/></Slider.Track></Slider>`.
  - Other available components: Avatar, Chip, Alert (uses `status` not `variant`), Accordion, Tabs, BottomSheet, Dialog, Popover, Toast, Switch, Checkbox, RadioGroup, Select, Separator, Surface, ListGroup, Spinner, Skeleton, ScrollShadow.
- **Styling: Uniwind (Tailwind CSS v4 for RN).** Style with Tailwind `className`, NOT inline `style={{}}`. For ScrollView/FlatList container styling use the Uniwind-mapped prop `contentContainerClassName`. Inline `style` only for genuinely runtime-dynamic values (e.g. a computed percentage width).
- **Charts: `react-native-gifted-charts`** (already installed, runs on `react-native-svg`). Use `LineChart` for history.
- **Icons:** I do NOT have an icon set installed yet. Recommend ONE (e.g. `react-native-vector-icons` or `lucide-react-native`), tell me the install command, and use it consistently. If you'd rather use emoji as a placeholder, say so.
- **Light mode only** for now (dark mode comes later) — but use semantic color choices so a dark theme can be layered on later.
- **Bilingual: English + Vietnamese** via i18next (`useTranslation()`, `t('key')`). All visible copy already comes from translation keys — keep using `t(...)`, don't hardcode strings. Design must tolerate Vietnamese being ~20-30% longer than English (no truncated/clipped labels).

## The 4 tracker types (this drives most of the UI)
1. **Habit** — yes/no daily, shows a **streak** + success rate. (e.g. "Meditate")
2. **Target** — reach a numeric value by a deadline, shows the **pace line**. Has two modes: `sum` (accumulate, e.g. "Save $2000") and `latest` (current value, e.g. "Lose weight to 65kg"). (this is where pace line matters most)
3. **Average** — maintain an average per period (e.g. "8 glasses of water/day").
4. **Project** — milestones with progress sliders + overall pace.

Each tracker has: name, icon, color, optional unit, and a `paceStatus` of `on_track` | `behind` | `ahead` | `none`. Design a clear visual language for these 4 statuses (the pace line is the soul of the app — make it beautiful and instantly readable).

## Screens to redesign (these are the exact existing screens — keep the same set)
Navigation = bottom tabs (Today / Trackers / Settings) + pushed stack screens (Detail / Form / TypePicker).

1. **DailyGoalsScreen (tab "Today")** — the home screen. Shows trackers due today with a fast log control per item (habit = tap to check; target/average = quick number entry; project = open detail). Header with today's date + a "X/Y done" summary. Needs a great empty state.
2. **TrackerListScreen (tab "Trackers")** — list of all trackers as cards, each showing name + mini progress + pace status dot. A "+" to create. **Empty state shows 6-8 quick-start suggestion buttons** (Drink water, Exercise, Save money, Read books, Sleep, Meditate, Walk, Track weight) + a "Create tracker" button.
3. **TrackerDetailScreen (pushed)** — the reports screen. Big pace-line progress bar + status label ("On track" / "Behind" / "Ahead"), streak, success rate, and a **history line chart**. For projects, a milestone list with sliders.
4. **TrackerFormScreen (pushed)** — create/edit a tracker. Form fields vary by type (name always; target/average also get target value + unit; etc.). Uses HeroUI TextField/Input/Button.
5. **TrackerTypePickerScreen (pushed)** — pick one of the 4 types before the form. Make it a delightful 4-choice screen with icon + description per type.
6. **SettingsScreen (tab "Settings")** — theme toggle, language switch (EN/VI), and data actions (export / clear).
7. **Reusable components to redesign:** `TrackerCard`, `PaceBar` (the green/red progress bar), `HistoryChart`, `MilestoneList`, and the tab bar styling.

## What I want from you
1. **First, propose 2-3 distinct visual directions** (mood, color palette in hex, typography feel, card style) in a short comparison, and recommend one. Wait for nothing — pick your recommendation and proceed, but show the alternatives so I can switch.
2. **Define a lightweight design system**: color tokens (semantic: background, surface, primary, the 4 pace statuses, text levels), a type scale (map to Tailwind classes), spacing rhythm, border radius, and how a tracker's per-type `color` is used.
3. **Then deliver the redesigned code**, screen by screen and component by component, as complete files using HeroUI Native + Tailwind `className`. Each file should be paste-ready. Keep the same exports/props/imports my screens already use (e.g. `export function DailyGoalsScreen()`, `progressFor(tracker, entries, milestones)` from the card, the `useTrackers()/useLogEntry()` hooks, `t(...)` keys). If you need a prop or key I haven't given, define it explicitly and note it.
4. Keep accessibility in mind (hit targets ≥44px, sufficient contrast, scalable text).
5. Note any new dependency to install (icons, fonts) with the exact command.

## Current data shapes (so your code typechecks)
```ts
type TrackerType = 'habit' | 'target' | 'average' | 'project';
type PaceStatus = 'on_track' | 'behind' | 'ahead' | 'none';

type Tracker = {
  id: string; name: string; type: TrackerType; icon: string; color: string;
  unit: string | null; direction: 'good' | 'bad' | null;
  targetValue: number | null; startValue: number | null;
  accumulation: 'sum' | 'latest' | null;
  startDate: string; deadline: string | null;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  repeatDays: number[] | null; createdAt: string; archived: boolean;
};
type Entry = { id: string; trackerId: string; date: string; value: number; note: string | null };
type Milestone = { id: string; trackerId: string; title: string; dueDate: string | null; progress: number; orderIndex: number };
type TrackerProgress = { current: number; goal: number; percent: number; paceStatus: PaceStatus; streak?: number; successRate?: number };
```

Existing hooks I'll wire your UI to: `useTrackers()`, `useTracker(id)`, `useEntries(id)`, `useMilestones(id)`, `useSaveTracker()`, `useDeleteTracker()`, `useLogEntry()`, `useSaveMilestone()`. Existing helper: `progressFor(tracker, entries, milestones): TrackerProgress`.

Deliver the design proposals first, then the code. Make it look like an app I'd be proud to ship.
```
