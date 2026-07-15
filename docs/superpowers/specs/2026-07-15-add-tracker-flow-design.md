# Add Tracker Flow — Design

**Date:** 2026-07-15
**Status:** Approved (design)

## Goal

Replace the current "FAB → TrackerTypePicker" entry with a richer add-tracker
flow: a bottom sheet that offers **Custom Goal** (the existing create flow) or
**Templates** (browse pre-built goals by category, tap one to open a pre-filled
form). Ships with the **Health** category fully populated (15 templates); the
remaining categories are scaffolded empty and filled in later from reference
images.

Based on `Add Tracker Flow.dc.html` (Claude Design project
`f4b0ad9f-41df-447d-a6fd-cba6542587d9`).

## Decisions (locked)

- **Tap a template → open a pre-filled `TrackerForm`.** The form seeds
  name/type/icon/color/unit/target/period/direction from the template; the user
  edits freely and saves. Not instant-create.
- **i18n: bilingual EN + VI from the start.** Every category and template name
  has both, `en.json`/`vi.json` kept key-for-key in sync (project rule).
- **Search: yes; Apple Health card: dropped.** No HealthKit integration exists,
  so the design's "Apple Health" sync row is omitted. Search filters templates
  locally.
- **Search shows matching items directly.** Typing a keyword on the categories
  screen replaces the category list with a **flat list of matching templates**
  across all categories (not grouped). Same behavior scoped to one category on
  the category-detail screen.

## Architecture

### New navigation

`RootStackParamList` additions (`src/navigation/types.ts`,
`RootNavigator.tsx`):

```ts
TemplateCategories: undefined
TemplateCategory: { category: string }   // category key, e.g. 'health'
TrackerForm: { trackerId?: string; type: TrackerType; templateKey?: string }  // + templateKey
```

### Entry points

Every "add" affordance opens the new sheet instead of navigating straight to
`TrackerTypePicker`:

- `TrackerListScreen` FAB (populated state) → open `NewTrackerSheet`
- `TrackerListScreen` empty-state `CreateButton` → open `NewTrackerSheet`
- `DailyGoalsScreen` empty-state `CreateButton` → open `NewTrackerSheet`

The existing quick-start chips in the empty state are unchanged (they still
build directly via `buildTracker`).

### Flow

```
add button ─▶ NewTrackerSheet
                ├─ Custom Goal   ─▶ TrackerTypePicker ─▶ TrackerForm (create)
                └─ Templates     ─▶ TemplateCategories
                                       ├─ (search) ─▶ flat matching-template list
                                       └─ tap category ─▶ TemplateCategory
                                              ├─ (search) ─▶ filtered list in-category
                                              ├─ tap template ─▶ TrackerForm { type, templateKey }
                                              └─ "Create Tracker" ─▶ TrackerTypePicker
```

- The **"Create Tracker"** row at the bottom of `TemplateCategory` goes straight
  to `TrackerTypePicker` (custom flow), since the user is already inside
  Templates — no need to re-open the sheet.

### Components

- **`NewTrackerSheet`** (`src/features/trackers/components/NewTrackerSheet.tsx`)
  — HeroUI `BottomSheet`, controlled via `isOpen` / `onOpenChange` props. Two
  rows (Custom Goal / Templates) styled per design. Callbacks
  `onChooseCustom` / `onChooseTemplates` supplied by the host screen (they
  navigate). Lives as component + local state on the host screen(s); no global
  store.
- **`TemplateCategoriesScreen`** (`src/screens/trackers/`) — appbar with a
  close (X) button back to the tab, a search field, and a white rounded card
  listing categories (icon + name + count + chevron). Count is derived from
  `category.templates.length`. When the search box is non-empty, it renders a
  flat list of matching templates instead of the category card.
- **`TemplateCategoryScreen`** (`src/screens/trackers/`) — appbar with a back
  (chevron) button to categories, title = localized category name, a search
  field (filters within this category), the template rows, and the "Create
  Tracker" row at the bottom.

Both new screens follow the existing custom-appbar pattern used by
`TrackerTypePickerScreen` (no react-navigation header; `headerShown: false`).

## Data model

New file `src/features/trackers/templates.ts`:

```ts
export type Template = {
  key: string                  // unique; i18n key under template.items.<key>
  type: TrackerType
  icon: string                 // ASCII keyword (must exist in ICON_EMOJI)
  color: string                // palette name (COLOR_HEX key)
  direction?: HabitDirection   // habit only: 'good' | 'bad'
  unit?: string
  targetValue?: number
  accumulation?: Accumulation
  period?: Period
}

export type TemplateCategory = {
  key: string                  // 'health' | 'fitness' | ...  (id + i18n key)
  color: string                // accent for the category icon tile
  templates: Template[]
}

export const TEMPLATE_CATEGORIES: TemplateCategory[]

// helpers
export function findTemplate(key: string): Template | undefined
export function allTemplates(): Template[]           // flat, for global search
export function categoryByKey(key: string): TemplateCategory | undefined
```

- Category order (from design): health, fitness, wellness, productivity, money,
  education, hobbies, relationships, chores, business.
- Tapping a template builds initial form state via `buildTracker` (single source
  of truth) with the template's fields; the **name** comes from
  `t('template.items.<key>')`. Once saved, the (possibly edited) name is stored
  verbatim.

### Category icons

New `CATEGORY_ICON: Record<string, LucideIcon>` in `icons.ts` (mirrors
`TYPE_ICON`), mapping each category key to a lucide component. Colors carried on
`TemplateCategory.color`. Proposed lucide mapping (finalize during impl):
health→`Heart`, fitness→`Dumbbell`, wellness→`Sparkles`,
productivity→`SquareCheck`, money→`DollarSign`, education→`BookOpen`,
hobbies→`Palette`, relationships→`Users`, chores→`House`, business→`Briefcase`.

### Icon keyword additions

Append to `ICON_EMOJI` in `icons.ts` (render-only; these need not join the
`ICONSET` form picker):

| keyword | emoji |
|---|---|
| veggie | 🥦 |
| apple | 🍎 |
| calorie | ⚡ |
| protein | 💪 |
| candy | 🍬 |
| fries | 🍟 |
| soda | 🥤 |

## Health templates (batch 1 — 15 items)

| key | EN | VI | type | icon | color | config |
|---|---|---|---|---|---|---|
| weight | Weight | Cân nặng | target | scale | pink | unit `kg`, accumulation `latest` |
| drinkWater | Drink Water | Uống nước | habit | drop | cyan | good, daily |
| sleep | Sleep | Giấc ngủ | average | sleep | indigo | unit `hours`, target 8, daily |
| brushFloss | Brush & Floss | Đánh răng & chỉ nha khoa | habit | tooth | blue | good, daily |
| healthyMeal | Healthy Meal | Ăn lành mạnh | habit | salad | green | good, daily |
| foodJournal | Food Journal | Nhật ký ăn uống | habit | read | orange | good, daily |
| eatVegetables | Eat Vegetables | Ăn rau | habit | veggie | green | good, daily |
| eatFruit | Eat Fruit | Ăn trái cây | habit | apple | red | good, daily |
| calories | Calories | Calo | average | calorie | orange | unit `kcal`, target 2000, daily |
| protein | Protein | Protein | average | protein | red | unit `g`, target 100, daily |
| takeVitamins | Take Vitamins | Uống vitamin | habit | pill | pink | good, daily |
| limitCaffeine | Limit Caffeine | Hạn chế caffeine | habit | coffee | orange | **bad**, daily |
| noSugar | No Sugar | Không đường | habit | candy | pink | **bad**, daily |
| noJunkFood | No Junk Food | Không đồ ăn vặt | habit | fries | red | **bad**, daily |
| noSoda | No Soda | Không nước ngọt | habit | soda | blue | **bad**, daily |

The other 9 categories are declared with `templates: []` and filled from
reference images in follow-up work; no structural change is needed to add them.

## Search

- Query is matched case-insensitively against the **localized** template name
  (current i18n language). Diacritic-insensitive matching for VI is a nice-to-have
  (normalize both sides by stripping combining marks) — include if cheap.
- Categories screen: empty query → category list; non-empty → flat list over
  `allTemplates()`.
- Category-detail screen: filters that category's `templates` only.
- Result rows reuse the template row (name + emoji + type label + chevron); tap →
  pre-filled `TrackerForm`.

## i18n

New `template` namespace in `en.json` and `vi.json` (key-for-key):

```
template.title            "Add Tracker" / "Thêm tracker"
template.search           "Search Templates" / "Tìm mẫu"
template.section          "Templates" / "Mẫu"
template.create           "Create Tracker" / "Tạo tracker"
template.createDesc       "Add custom goal or habit." / "Tạo mục tiêu hoặc thói quen riêng."
template.sheetTitle       "New tracker" / "Tracker mới"
template.sheetSubtitle    "How would you like to start?" / "Bạn muốn bắt đầu thế nào?"
template.custom           "Custom Goal" / "Mục tiêu tự tạo"
template.customDesc       "Build your own from scratch — a habit, a number to hit, or a long-term project." / (VI)
template.templates        "Templates" / "Mẫu có sẵn"
template.templatesDesc    "Quick setup from popular goals across Health, Fitness, Money & more." / (VI)
template.empty            "No templates match." / "Không có mẫu phù hợp."
template.categories.<key> category names (health, fitness, …)
template.items.<key>      template names (weight, drinkWater, …)
```

Type labels on template rows reuse the existing `types` namespace
(`t('types.<type>')` → Habit/Target/Average/Project).

## Testing

Pure unit tests (`templates.test.ts`) — op-sqlite not involved:

- Every template `icon` exists in `ICON_EMOJI`.
- Every template `color` resolves in `COLOR_HEX`.
- Every category `key` has `template.categories.<key>` in both `en` and `vi`;
  every template `key` has `template.items.<key>` in both.
- Template `key`s are globally unique.
- `direction` present ⟺ `type === 'habit'`; `type`/`period`/`accumulation`
  values are valid unions.
- `findTemplate` / `categoryByKey` round-trip; `allTemplates()` count equals sum
  of category lengths.

The new screens and `NewTrackerSheet` are verified on device/simulator (they
touch navigation + BottomSheet, not unit-testable per project strategy).

## Out of scope / follow-ups

- Apple Health / HealthKit sync (design's "Apple Health" row) — omitted.
- The 9 non-Health category template lists — added later from images.
- Diacritic-insensitive search — optional, include only if trivial.
