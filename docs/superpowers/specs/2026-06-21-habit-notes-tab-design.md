# Habit Detail — Notes tab

**Date:** 2026-06-21
**Status:** Approved (design)
**Source design:** Claude Design project `019dbd3e-f1f1-7746-a774-53eaa8f3bd0a`, file `Kite/Habit Notes.html`

## Goal

Build out the **Notes** tab in the Habit Detail screen to match the design mockup.
The tab already exists (`HabitNotesTab.tsx`) as a minimal list of per-entry notes;
this redesign adds a pinned, editable **Goal note** and enriches the **Log notes**
list with per-entry Done/Missed badges and status labels.

This is habit-only — the Notes tab lives inside `HabitDetailView`'s
material-top-tabs navigator (Charts / History / Notes) and only habit trackers
use that view.

## Two sections (matching the mockup)

### 1. Goal note (new, persisted)

A single editable motivation note pinned to the habit ("Why does this habit
matter to you?").

- **Storage:** new `goalNote: string | null` field on the `Tracker` model.
- **Editing UX:** inline multiline `TextInput`, prefilled from `tracker.goalNote`.
  **Saves on blur** (and on keyboard dismiss) — if the trimmed value changed from
  the stored value, persist it; otherwise no-op. No modal.
- **Card chrome:** large decorative quote glyph top-right (`"`), footer line
  "Tap to edit · pinned to this goal" with a pencil icon. Placeholder text when
  the note is empty.

### 2. Log notes (enriched)

Every logged entry that carries a non-empty note, newest first, each as a card:

- **Badge** (circular): green check on a `brand-weak` tint if the entry's day
  **met the per-day goal**, red X on the red weak tint if not.
- **Date** (e.g. "18 Jun 2026") + a **Yes / No** status label.
- **Note text.**
- Section header shows a count ("N notes").
- **Tappable → edit the log.** A log note *is* a log entry that carries a note,
  so tapping a card opens the existing `LogEntryModal` for that entry (via the
  `onEditEntry` callback) — exactly like editing a log from the History tab. The
  user can change the note/value/date or delete the entry from there.
- Existing **empty state** card when no entry carries a note.

**Yes vs No semantics:** a note always belongs to a day that has ≥1 log (notes
attach to entries). "Yes" = the entry's `date` is in
`doneDatesOf(tracker, entries)` (the day's summed value met `perDayGoal`).
"No" = it logged but fell short of the per-day goal (e.g. target 2 logs/day,
only 1 logged). This reuses the existing single-source-of-truth helper in
`calculators/habitStats.ts` — no new completion logic.

## Architecture / data flow

UI → TanStack Query hooks → repository → SQLite, per the project's offline-first model.

### Schema (`db/schema.ts`)

Add one `ColumnSpec` to `TRACKER_COLUMNS`:

```ts
{ name: 'goal_note', decl: 'goal_note TEXT' }
```

The data-driven `migrateTable` handles both paths automatically: fresh DBs get it
in `CREATE TABLE`, existing DBs get it via `ALTER TABLE … ADD COLUMN` (column is
nullable, so the ADD is safe on populated tables). No `user_version` bump needed —
consistent with the project's current add-column migration strategy.

### Repository (`db/repository.ts`)

- Add `goal_note: t.goalNote` to `trackerToRow`.
- Add `goalNote: r.goal_note ?? null` to `rowToTracker`.
- Add `goal_note` to the `COLS` constant (single source for INSERT columns,
  placeholders, and every SELECT) — keeps insert/select in sync.

### Types (`types.ts`)

Add `goalNote: string | null` to the `Tracker` type (placed near the other
optional/nullable descriptive fields).

### Factory (`factory.ts`)

Default `goalNote: null` for every tracker type in `buildTracker`.

### Persistence path (`queries/index.ts`)

Reuse the existing **`useSaveTracker`** hook. `repo.insertTracker` is
`INSERT OR REPLACE` (a full upsert) and `useSaveTracker` already invalidates both
the `trackers` list and `tracker(id)` caches. To save the goal note, build the
updated tracker object (`{ ...tracker, goalNote: trimmed }`) and call
`saveTracker.mutate(updated)`. (Side effect: it reschedules reminders — harmless
and correct, since the tracker's reminder config is unchanged.) No new hook needed.

### Context (`HabitDetailContext` / `HabitDetailView`)

`HabitNotesTab` needs `tracker` (for the Yes/No derivation and the goal note),
`entries`, and `onEditEntry` (to open a log note for editing). All three already
exist in `HabitDetailContext` — the `NotesScreen` wrapper just passes them
through. No new context fields.

### UI (`components/HabitNotesTab.tsx`)

Rewrite the component. Keeps its own `ScrollView` + bottom safe-area padding
(per the material-top-tabs scene model — each tab owns its scroll). Renders the
two sections above. New small subcomponents kept in the same file unless one
grows large:

- the Goal note card (controlled `TextInput`, local draft state, save-on-blur),
- the Log note card (badge + date + Yes/No status + text), wrapped in a
  `Pressable` that calls `onEditEntry(entry)`.

## Styling

- `<Typography>` only, never `<Text>`. Tailwind `className` only, no inline
  `style` (the one allowed exception is the existing runtime `paddingBottom:
  insets.bottom + 24` on the ScrollView).
- Icons from `lucide-react-native` via the `Icons` map (`Icons.Notes`,
  `Icons.Edit` (Pencil), `Icons.Check`, `Icons.Close` (X)).
- **Colors come from the app's own theme tokens**, NOT the mockup's standalone
  blue/`#c8385a` palette. Done = `brand` / `brand-weak`; Missed = the theme's red
  weak/strong tints (the same red used for the "behind" pace state). This keeps
  Kite visually consistent rather than importing the design file's isolated theme.
- Overlays: none needed (inline edit, no modal).

## i18n (`locales/en.json` + `vi.json`, kept key-for-key in sync)

Reuse existing `detail.noNotes`, `detail.noNotesHint`. Add under `detail`:

| key | en | vi |
| --- | --- | --- |
| `goalNote` | Goal note | Ghi chú mục tiêu |
| `goalNoteHint` | Tap to edit · pinned to this goal | Chạm để sửa · ghim vào mục tiêu này |
| `goalNotePlaceholder` | Why does this habit matter to you? Write a note to keep you motivated… | Vì sao thói quen này quan trọng với bạn? Viết một ghi chú để giữ động lực… |
| `logNotes` | Log notes | Ghi chú nhật ký |
| `notesCount` | `{{count}} notes` | `{{count}} ghi chú` |
| `yes` | Yes | Có |
| `no` | No | Không |

User-entered note text is stored verbatim, never translated.

## Testing

Per the project's strategy: pure logic is unit-tested; DB-calling code is verified
on device (op-sqlite is mocked in Jest).

- **Repository row-mapping** (`db/__tests__/repository.test.ts`): extend the
  existing `trackerToRow`/`rowToTracker` round-trip tests to cover `goalNote`
  (a value, and `null`).
- **Schema** (`db/__tests__/schema.test.ts`): `missingColumns` already covers the
  add-column path generically; add `goal_note` to any column-list assertion if one
  exists, otherwise no new test needed.
- **No new calculator** — Yes/No reuses `doneDatesOf`, already unit-tested.
- **On-device verification:** goal note persists across app restart; editing and
  blurring saves; Yes/No badges match the calendar's done days; tapping a log note
  opens the edit modal for that entry; empty states render for both sections.

## Out of scope (YAGNI)

- No changes to Charts, History, calendar, or reminders.
- No `user_version` migration system (add-column path is sufficient).
- No goal-note support surfaced in the TrackerForm (this tab is the only editor for now).
