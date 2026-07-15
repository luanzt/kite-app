# Add Tracker Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the direct "FAB → TrackerTypePicker" entry with a bottom sheet offering **Custom Goal** (existing flow) or **Templates** (browse pre-built goals by category → tap one → pre-filled form), shipping with the Health category populated.

**Architecture:** A pure template data layer (`templates.ts`) drives two new stack screens (`TemplateCategories`, `TemplateCategory`) and a shared `NewTrackerSheet` (HeroUI BottomSheet). Tapping a template navigates to the existing `TrackerForm` with a new `templateKey` param that seeds the form's initial state. All data is on-device; no backend.

**Tech Stack:** React Native CLI, TypeScript (strict), HeroUI Native (`BottomSheet`), `@react-navigation/native-stack`, react-i18next, Uniwind (Tailwind v4), lucide-react-native, Jest.

## Global Constraints

- Text via `<Typography>` from `heroui-native`, **never** `<Text>`.
- Style with Tailwind `className`; inline `style` only for runtime safe-area / per-item dynamic color (branch classes for enums).
- Icons only from `lucide-react-native` (PascalCase import, `size`/`color` props).
- Overlays via HeroUI Native (`BottomSheet`), never react-native `Modal`.
- Tracker `icon` persisted as ASCII keyword (must exist in `ICON_EMOJI`), never raw emoji.
- Construct trackers only via `buildTracker()`.
- i18n: every visible string via `t()`; `en.json` and `vi.json` kept key-for-key in sync.
- Named exports only. `yarn tsc` and `yarn lint` must be clean.
- op-sqlite is unavailable in Jest → only pure logic is unit-tested; screens/sheets are verified on simulator.

---

### Task 1: Template data layer (data + icons + i18n + tests)

**Files:**
- Create: `src/features/trackers/templates.ts`
- Modify: `src/features/trackers/icons.ts` (add 7 `ICON_EMOJI` keywords + `CATEGORY_ICON` map + lucide imports)
- Modify: `src/i18n/locales/en.json` (add `template` namespace)
- Modify: `src/i18n/locales/vi.json` (add `template` namespace)
- Test: `src/features/trackers/__tests__/templates.test.ts`

**Interfaces:**
- Produces: `Template` (`{ key, type, icon, color, direction?, unit?, targetValue?, accumulation?, period? }`), `TemplateCategory` (`{ key, color, templates }`), `TEMPLATE_CATEGORIES: TemplateCategory[]`, `allTemplates(): Template[]`, `findTemplate(key): Template | undefined`, `categoryByKey(key): TemplateCategory | undefined`, `normalizeText(s): string`. From `icons.ts`: `CATEGORY_ICON: Record<string, LucideIcon>`.

- [ ] **Step 1: Write the failing test**

Create `src/features/trackers/__tests__/templates.test.ts`:

```ts
import {
  TEMPLATE_CATEGORIES,
  allTemplates,
  findTemplate,
  categoryByKey,
  normalizeText
} from '../templates'
import { iconEmoji, colorHex, CATEGORY_ICON } from '../icons'
import enJson from '@i18n/locales/en.json'
import viJson from '@i18n/locales/vi.json'

type Loc = { template: { categories: Record<string, string>; items: Record<string, string> } }
const en = enJson as unknown as Loc
const vi = viJson as unknown as Loc

/** True if a string contains any non-ASCII char (renders as a glyph). */
function isGlyph(s: string): boolean {
  return /[^\x20-\x7e]/.test(s)
}

describe('template data layer', () => {
  const templates = allTemplates()

  it('lists the 10 categories in design order', () => {
    expect(TEMPLATE_CATEGORIES.map((c) => c.key)).toEqual([
      'health', 'fitness', 'wellness', 'productivity', 'money',
      'education', 'hobbies', 'relationships', 'chores', 'business'
    ])
  })

  it('Health ships 15 templates; other categories start empty', () => {
    expect(categoryByKey('health')?.templates.length).toBe(15)
    for (const c of TEMPLATE_CATEGORIES) {
      if (c.key !== 'health') expect(c.templates.length).toBe(0)
    }
  })

  it('every template icon renders a real emoji glyph', () => {
    for (const t of templates) expect(isGlyph(iconEmoji(t.icon))).toBe(true)
  })

  it('every template color resolves to a hex', () => {
    for (const t of templates) expect(colorHex(t.color)).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('template keys are globally unique', () => {
    const keys = templates.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('direction is set iff the template is a habit', () => {
    for (const t of templates) {
      if (t.type === 'habit') expect(t.direction).toBeDefined()
      else expect(t.direction).toBeUndefined()
    }
  })

  it('every category has EN + VI name and a lucide icon', () => {
    for (const c of TEMPLATE_CATEGORIES) {
      expect(en.template.categories[c.key]).toBeTruthy()
      expect(vi.template.categories[c.key]).toBeTruthy()
      expect(CATEGORY_ICON[c.key]).toBeDefined()
    }
  })

  it('every template has EN + VI name', () => {
    for (const t of templates) {
      expect(en.template.items[t.key]).toBeTruthy()
      expect(vi.template.items[t.key]).toBeTruthy()
    }
  })

  it('findTemplate / categoryByKey behave', () => {
    expect(findTemplate('weight')?.type).toBe('target')
    expect(findTemplate('nope')).toBeUndefined()
    expect(categoryByKey('health')?.key).toBe('health')
    expect(allTemplates().length).toBe(
      TEMPLATE_CATEGORIES.reduce((n, c) => n + c.templates.length, 0)
    )
  })

  it('normalizeText lowercases and trims', () => {
    expect(normalizeText('  Drink WATER ')).toBe('drink water')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/__tests__/templates.test.ts`
Expected: FAIL — cannot find module `../templates` (and `CATEGORY_ICON` undefined).

- [ ] **Step 3: Create the template data file**

Create `src/features/trackers/templates.ts`:

```ts
import type {
  TrackerType,
  HabitDirection,
  Accumulation,
  Period
} from '@features/trackers/types'

/** A pre-built goal shown in the Templates browser. Tapping one opens the
 *  TrackerForm pre-filled from these fields (name comes from i18n by `key`). */
export type Template = {
  key: string // unique; i18n key under template.items.<key>
  type: TrackerType
  icon: string // ASCII keyword (must exist in ICON_EMOJI)
  color: string // palette name (COLOR_HEX key)
  direction?: HabitDirection // habit only: 'good' | 'bad'
  unit?: string
  targetValue?: number
  accumulation?: Accumulation
  period?: Period
}

export type TemplateCategory = {
  key: string // id + i18n key under template.categories.<key>
  color: string // accent for the category icon tile (palette name)
  templates: Template[]
}

/** Categories in design order. Only Health is populated for now; the rest are
 *  filled from reference images in follow-up work (no structural change). */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    key: 'health',
    color: 'pink',
    templates: [
      { key: 'weight', type: 'target', icon: 'scale', color: 'pink', unit: 'kg', accumulation: 'latest' },
      { key: 'drinkWater', type: 'habit', icon: 'drop', color: 'cyan', direction: 'good', period: 'daily' },
      { key: 'sleep', type: 'average', icon: 'sleep', color: 'indigo', unit: 'hours', targetValue: 8, period: 'daily' },
      { key: 'brushFloss', type: 'habit', icon: 'tooth', color: 'blue', direction: 'good', period: 'daily' },
      { key: 'healthyMeal', type: 'habit', icon: 'salad', color: 'green', direction: 'good', period: 'daily' },
      { key: 'foodJournal', type: 'habit', icon: 'read', color: 'orange', direction: 'good', period: 'daily' },
      { key: 'eatVegetables', type: 'habit', icon: 'veggie', color: 'green', direction: 'good', period: 'daily' },
      { key: 'eatFruit', type: 'habit', icon: 'apple', color: 'red', direction: 'good', period: 'daily' },
      { key: 'calories', type: 'average', icon: 'calorie', color: 'orange', unit: 'kcal', targetValue: 2000, period: 'daily' },
      { key: 'protein', type: 'average', icon: 'protein', color: 'red', unit: 'g', targetValue: 100, period: 'daily' },
      { key: 'takeVitamins', type: 'habit', icon: 'pill', color: 'pink', direction: 'good', period: 'daily' },
      { key: 'limitCaffeine', type: 'habit', icon: 'coffee', color: 'orange', direction: 'bad', period: 'daily' },
      { key: 'noSugar', type: 'habit', icon: 'candy', color: 'pink', direction: 'bad', period: 'daily' },
      { key: 'noJunkFood', type: 'habit', icon: 'fries', color: 'red', direction: 'bad', period: 'daily' },
      { key: 'noSoda', type: 'habit', icon: 'soda', color: 'blue', direction: 'bad', period: 'daily' }
    ]
  },
  { key: 'fitness', color: 'orange', templates: [] },
  { key: 'wellness', color: 'purple', templates: [] },
  { key: 'productivity', color: 'blue', templates: [] },
  { key: 'money', color: 'green', templates: [] },
  { key: 'education', color: 'pink', templates: [] },
  { key: 'hobbies', color: 'orange', templates: [] },
  { key: 'relationships', color: 'purple', templates: [] },
  { key: 'chores', color: 'blue', templates: [] },
  { key: 'business', color: 'green', templates: [] }
]

export function allTemplates(): Template[] {
  return TEMPLATE_CATEGORIES.flatMap((c) => c.templates)
}

export function findTemplate(key: string): Template | undefined {
  return allTemplates().find((t) => t.key === key)
}

export function categoryByKey(key: string): TemplateCategory | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.key === key)
}

/** Case-insensitive search key. Diacritic-insensitive matching (esp. for
 *  Vietnamese horn/stroke letters) is deferred — not trivial to do correctly. */
export function normalizeText(s: string): string {
  return s.toLowerCase().trim()
}
```

- [ ] **Step 4: Add icon keywords + category icons to `icons.ts`**

In `src/features/trackers/icons.ts`, add these names to the lucide import block (top of file, alongside the existing imports like `House`, `Moon`, …):

```ts
Heart,
Dumbbell,
Sparkles,
ListChecks,
DollarSign,
BookOpen,
Palette,
Users,
Briefcase,
```

Append 7 entries to the `ICON_EMOJI` object (after the `// project set` block, before the closing `}`):

```ts
  ,
  // template-only keys (render, not in the form picker ICONSET)
  veggie: '🥦',
  apple: '🍎',
  calorie: '⚡',
  protein: '💪',
  candy: '🍬',
  fries: '🍟',
  soda: '🥤'
```

Add the category-icon map after `TYPE_COLOR` (near line 181):

```ts
/**
 * Template-category icon → lucide component (mirrors TYPE_ICON). Colors are
 * carried on TemplateCategory.color, resolved via colorHex at render time.
 */
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  health: Heart,
  fitness: Dumbbell,
  wellness: Sparkles,
  productivity: ListChecks,
  money: DollarSign,
  education: BookOpen,
  hobbies: Palette,
  relationships: Users,
  chores: House,
  business: Briefcase
}
```

(`House` and `LucideIcon` are already imported in this file.)

- [ ] **Step 5: Add the `template` i18n namespace to both locale files**

Add this new top-level key to `src/i18n/locales/en.json` (e.g. right after the `"type": { … }` block; match the file's 2-space indentation and trailing-comma style):

```json
"template": {
  "title": "Add Tracker",
  "search": "Search Templates",
  "section": "Templates",
  "create": "Create Tracker",
  "createDesc": "Add custom goal or habit.",
  "empty": "No templates match.",
  "sheetTitle": "New tracker",
  "sheetSubtitle": "How would you like to start?",
  "custom": "Custom Goal",
  "customDesc": "Build your own from scratch — a habit, a number to hit, or a long-term project.",
  "templates": "Templates",
  "templatesDesc": "Quick setup from popular goals across Health, Fitness, Money & more.",
  "categories": {
    "health": "Health",
    "fitness": "Fitness",
    "wellness": "Wellness",
    "productivity": "Productivity",
    "money": "Money",
    "education": "Education",
    "hobbies": "Hobbies",
    "relationships": "Relationships",
    "chores": "Chores",
    "business": "Business"
  },
  "items": {
    "weight": "Weight",
    "drinkWater": "Drink Water",
    "sleep": "Sleep",
    "brushFloss": "Brush & Floss",
    "healthyMeal": "Healthy Meal",
    "foodJournal": "Food Journal",
    "eatVegetables": "Eat Vegetables",
    "eatFruit": "Eat Fruit",
    "calories": "Calories",
    "protein": "Protein",
    "takeVitamins": "Take Vitamins",
    "limitCaffeine": "Limit Caffeine",
    "noSugar": "No Sugar",
    "noJunkFood": "No Junk Food",
    "noSoda": "No Soda"
  }
}
```

Add the matching Vietnamese block to `src/i18n/locales/vi.json` at the same position:

```json
"template": {
  "title": "Thêm tracker",
  "search": "Tìm mẫu",
  "section": "Mẫu có sẵn",
  "create": "Tạo tracker",
  "createDesc": "Tạo mục tiêu hoặc thói quen riêng.",
  "empty": "Không có mẫu phù hợp.",
  "sheetTitle": "Tracker mới",
  "sheetSubtitle": "Bạn muốn bắt đầu thế nào?",
  "custom": "Mục tiêu tự tạo",
  "customDesc": "Tự tạo từ đầu — một thói quen, một con số cần đạt, hoặc một dự án dài hạn.",
  "templates": "Mẫu có sẵn",
  "templatesDesc": "Thiết lập nhanh từ các mục tiêu phổ biến: Sức khỏe, Thể hình, Tiền bạc và hơn thế.",
  "categories": {
    "health": "Sức khỏe",
    "fitness": "Thể hình",
    "wellness": "Tinh thần",
    "productivity": "Năng suất",
    "money": "Tiền bạc",
    "education": "Học tập",
    "hobbies": "Sở thích",
    "relationships": "Quan hệ",
    "chores": "Việc nhà",
    "business": "Kinh doanh"
  },
  "items": {
    "weight": "Cân nặng",
    "drinkWater": "Uống nước",
    "sleep": "Giấc ngủ",
    "brushFloss": "Đánh răng & chỉ nha khoa",
    "healthyMeal": "Ăn lành mạnh",
    "foodJournal": "Nhật ký ăn uống",
    "eatVegetables": "Ăn rau",
    "eatFruit": "Ăn trái cây",
    "calories": "Calo",
    "protein": "Protein",
    "takeVitamins": "Uống vitamin",
    "limitCaffeine": "Hạn chế caffeine",
    "noSugar": "Không đường",
    "noJunkFood": "Không đồ ăn vặt",
    "noSoda": "Không nước ngọt"
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `yarn test src/features/trackers/__tests__/templates.test.ts`
Expected: PASS (all specs green).

- [ ] **Step 7: Typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/trackers/templates.ts src/features/trackers/icons.ts \
        src/features/trackers/__tests__/templates.test.ts \
        src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(templates): template data layer, category icons, i18n"
```

---

### Task 2: Pre-fill TrackerForm from a template

**Files:**
- Modify: `src/navigation/types.ts:14` (add `templateKey?` to `TrackerForm`)
- Modify: `src/screens/trackers/TrackerFormScreen.tsx` (seed initial state from template)

**Interfaces:**
- Consumes: `findTemplate` (Task 1), `colorHex` (icons.ts).
- Produces: `TrackerForm` route now accepts `{ trackerId?; type; templateKey? }`. Callers (Tasks 3, 4) navigate with `templateKey`.

- [ ] **Step 1: Extend the route param type**

In `src/navigation/types.ts`, change the `TrackerForm` line:

```ts
  TrackerForm: { trackerId?: string; type: TrackerType; templateKey?: string }
```

- [ ] **Step 2: Import the template lookup + colorHex in the form**

In `src/screens/trackers/TrackerFormScreen.tsx`, add `colorHex` to the existing `icons` import and add a `templates` import:

```ts
import {
  Icons,
  TYPE_ICON,
  TYPE_COLOR,
  hexA,
  iconEmoji,
  iconKey,
  colorHex
} from '@features/trackers/icons'
import { findTemplate } from '@features/trackers/templates'
```

- [ ] **Step 3: Resolve the template and seed initial state**

Change the params destructure (currently `const { type, trackerId } = route.params`):

```ts
  const { type, trackerId, templateKey } = route.params
```

Immediately after `const { data: editing } = useTracker(trackerId ?? '')` (around line 77), add:

```ts
  // Template pre-fill (create mode). Lookup is synchronous, so unlike `editing`
  // it can seed the useState initialisers directly — no hydrate effect needed.
  const template = templateKey ? findTemplate(templateKey) : undefined
```

Then update these `useState` initialisers to fall back to the template after `editing`:

```ts
  const [name, setName] = useState(
    editing?.name ?? (template ? t(`template.items.${template.key}`) : '')
  )
  const [icon, setIcon] = useState(
    editing?.icon ? iconKey(editing.icon) : template?.icon ?? defaultIcon(type)
  )
  const [color, setColor] = useState(
    editing?.color ?? (template ? colorHex(template.color) : COLORS[0])
  )
  const [unit, setUnit] = useState(editing?.unit ?? template?.unit ?? '')
  const [target, setTarget] = useState(
    editing?.targetValue != null
      ? String(editing.targetValue)
      : template?.targetValue != null
        ? String(template.targetValue)
        : ''
  )
  const [accum, setAccum] = useState<Accumulation>(
    editing?.accumulation ?? template?.accumulation ?? 'sum'
  )
  const [dir, setDir] = useState<HabitDirection>(
    editing?.direction ?? template?.direction ?? 'good'
  )
  const [period, setPeriod] = useState<Period>(
    editing?.period ?? template?.period ?? 'daily'
  )
```

Leave every other `useState` and the `editing` hydrate `useEffect` unchanged (the effect only runs when `editing` exists, i.e. edit mode).

- [ ] **Step 4: Typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: no errors.

- [ ] **Step 5: Verify prefill in isolation (temporary route)**

Temporarily add to `TrackerListScreen`'s FAB `onPress` (revert after):
`nav.navigate('TrackerForm', { type: 'habit', templateKey: 'noSoda' })`.
Run `yarn ios`, tap the FAB. Expected: form opens with name "No Soda", the bad-habit toggle ON (`dir==='bad'`), daily period, soda emoji tile. Revert the temporary line.

- [ ] **Step 6: Commit**

```bash
git add src/navigation/types.ts src/screens/trackers/TrackerFormScreen.tsx
git commit -m "feat(templates): pre-fill TrackerForm from a template key"
```

---

### Task 3: TemplateCategory (detail) screen

**Files:**
- Modify: `src/navigation/types.ts` (add `TemplateCategory` route)
- Create: `src/screens/trackers/TemplateCategoryScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (import + register)

**Interfaces:**
- Consumes: `categoryByKey`, `normalizeText` (Task 1); `iconEmoji`, `Icons` (icons.ts); `templateKey` form param (Task 2).
- Produces: `TemplateCategory: { category: string }` route + `TemplateCategoryScreen`. Task 4 navigates here.

- [ ] **Step 1: Add the route param type**

In `src/navigation/types.ts`, add to `RootStackParamList` (after `TrackerTypePicker`):

```ts
  TemplateCategory: { category: string }
```

- [ ] **Step 2: Create the screen**

Create `src/screens/trackers/TemplateCategoryScreen.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, Target } from 'lucide-react-native'
import type { RootStackProps } from '@navigation/types'
import { categoryByKey, normalizeText } from '@features/trackers/templates'
import { Icons, iconEmoji } from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'

export function TemplateCategoryScreen({
  route,
  navigation
}: RootStackProps<'TemplateCategory'>) {
  const { category } = route.params
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  const cat = categoryByKey(category)
  const nq = normalizeText(query)
  const list = useMemo(() => {
    const all = cat?.templates ?? []
    if (!nq) return all
    return all.filter((tpl) =>
      normalizeText(t(`template.items.${tpl.key}`)).includes(nq)
    )
  }, [cat, nq, t])

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
        style={{ paddingTop: insets.top + 8 }} // safe-area, runtime
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Icons.Back size={22} color={c.ink} />
        </Pressable>
        <Typography className='flex-1 text-lg font-bold text-ink'>
          {t(`template.categories.${category}`)}
        </Typography>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View className='p-s4 gap-s4'>
          {/* search */}
          <View className='h-[48px] flex-row items-center gap-s2 rounded-md-k bg-surface-2 px-s3'>
            <Search size={18} color={c.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('template.search')}
              placeholderTextColor={c.ink3}
              className='flex-1 text-base text-ink'
            />
          </View>

          {/* templates */}
          {list.length > 0 ? (
            <View className='overflow-hidden rounded-lg-k border border-line bg-surface'>
              {list.map((tpl, i) => (
                <Pressable
                  key={tpl.key}
                  onPress={() =>
                    navigation.navigate('TrackerForm', {
                      type: tpl.type,
                      templateKey: tpl.key
                    })
                  }
                  className={`flex-row items-center gap-s2 px-s4 py-s4 active:bg-surface-2 ${
                    i > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <Typography className='flex-1 text-base font-bold text-brand'>
                    {t(`template.items.${tpl.key}`)}{' '}
                    <Typography className='text-base'>
                      {iconEmoji(tpl.icon)}
                    </Typography>
                  </Typography>
                  <Typography className='text-sm font-semibold text-ink-3'>
                    {t(`types.${tpl.type}`)}
                  </Typography>
                  <Icons.Chevron size={16} color={c.ink3} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Typography className='px-s2 text-center text-base text-ink-3'>
              {t('template.empty')}
            </Typography>
          )}

          {/* create custom */}
          <Pressable
            onPress={() => navigation.navigate('TrackerTypePicker')}
            className='flex-row items-center gap-s3 rounded-lg-k border border-line bg-surface p-s4 active:opacity-90'
          >
            <View className='h-[46px] w-[46px] items-center justify-center rounded-md-k border border-line'>
              <Target size={24} color={c.pace.on_track} strokeWidth={1.9} />
            </View>
            <View className='flex-1'>
              <Typography className='text-base font-extrabold text-pace-on'>
                {t('template.create')}
              </Typography>
              <Typography className='mt-[2px] text-sm text-ink-3'>
                {t('template.createDesc')}
              </Typography>
            </View>
            <Icons.Chevron size={16} color={c.ink3} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 3: Register the route**

In `src/navigation/RootNavigator.tsx`, add the import near the other screen imports:

```ts
import { TemplateCategoryScreen } from '@screens/trackers/TemplateCategoryScreen'
```

And add the screen inside `<Stack.Navigator>` (after `TrackerTypePicker`):

```tsx
        <Stack.Screen
          name='TemplateCategory'
          component={TemplateCategoryScreen}
        />
```

- [ ] **Step 4: Typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/types.ts src/navigation/RootNavigator.tsx \
        src/screens/trackers/TemplateCategoryScreen.tsx
git commit -m "feat(templates): category detail screen with in-category search"
```

---

### Task 4: TemplateCategories (list) screen

**Files:**
- Modify: `src/navigation/types.ts` (add `TemplateCategories` route)
- Create: `src/screens/trackers/TemplateCategoriesScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (import + register)

**Interfaces:**
- Consumes: `TEMPLATE_CATEGORIES`, `allTemplates`, `normalizeText` (Task 1); `CATEGORY_ICON`, `colorHex`, `hexA`, `iconEmoji`, `Icons` (icons.ts); `TemplateCategory` route (Task 3); `templateKey` form param (Task 2).
- Produces: `TemplateCategories: undefined` route + `TemplateCategoriesScreen`. Task 5 navigates here.

- [ ] **Step 1: Add the route param type**

In `src/navigation/types.ts`, add to `RootStackParamList`:

```ts
  TemplateCategories: undefined
```

- [ ] **Step 2: Create the screen**

Create `src/screens/trackers/TemplateCategoriesScreen.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search } from 'lucide-react-native'
import type { RootStackProps } from '@navigation/types'
import {
  TEMPLATE_CATEGORIES,
  allTemplates,
  normalizeText
} from '@features/trackers/templates'
import {
  Icons,
  iconEmoji,
  CATEGORY_ICON,
  colorHex,
  hexA
} from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'

export function TemplateCategoriesScreen({
  navigation
}: RootStackProps<'TemplateCategories'>) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const nq = normalizeText(query)

  const matches = useMemo(() => {
    if (!nq) return []
    return allTemplates().filter((tpl) =>
      normalizeText(t(`template.items.${tpl.key}`)).includes(nq)
    )
  }, [nq, t])

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
        style={{ paddingTop: insets.top + 8 }} // safe-area, runtime
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Icons.Close size={22} color={c.ink} />
        </Pressable>
        <Typography className='flex-1 text-lg font-bold text-ink'>
          {t('template.title')}
        </Typography>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View className='p-s4 gap-s4'>
          {/* search */}
          <View className='h-[48px] flex-row items-center gap-s2 rounded-md-k bg-surface-2 px-s3'>
            <Search size={18} color={c.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('template.search')}
              placeholderTextColor={c.ink3}
              className='flex-1 text-base text-ink'
            />
          </View>

          {nq ? (
            // search results: flat template list across all categories
            matches.length > 0 ? (
              <View className='overflow-hidden rounded-lg-k border border-line bg-surface'>
                {matches.map((tpl, i) => (
                  <Pressable
                    key={tpl.key}
                    onPress={() =>
                      navigation.navigate('TrackerForm', {
                        type: tpl.type,
                        templateKey: tpl.key
                      })
                    }
                    className={`flex-row items-center gap-s2 px-s4 py-s4 active:bg-surface-2 ${
                      i > 0 ? 'border-t border-line' : ''
                    }`}
                  >
                    <Typography className='flex-1 text-base font-bold text-brand'>
                      {t(`template.items.${tpl.key}`)}{' '}
                      <Typography className='text-base'>
                        {iconEmoji(tpl.icon)}
                      </Typography>
                    </Typography>
                    <Typography className='text-sm font-semibold text-ink-3'>
                      {t(`types.${tpl.type}`)}
                    </Typography>
                    <Icons.Chevron size={16} color={c.ink3} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Typography className='px-s2 text-center text-base text-ink-3'>
                {t('template.empty')}
              </Typography>
            )
          ) : (
            // category list
            <View className='overflow-hidden rounded-lg-k border border-line bg-surface'>
              {TEMPLATE_CATEGORIES.map((cat, i) => {
                const CatIcon = CATEGORY_ICON[cat.key]
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() =>
                      navigation.navigate('TemplateCategory', {
                        category: cat.key
                      })
                    }
                    className={`flex-row items-center gap-s3 px-s4 py-s4 active:bg-surface-2 ${
                      i > 0 ? 'border-t border-line' : ''
                    }`}
                  >
                    <View
                      className='h-[30px] w-[30px] items-center justify-center rounded-md-k'
                      // runtime: per-category tint via hexA
                      style={{ backgroundColor: hexA(cat.color, 0.14) }}
                    >
                      <CatIcon size={18} color={colorHex(cat.color)} strokeWidth={2} />
                    </View>
                    <Typography className='flex-1 text-base font-bold text-ink'>
                      {t(`template.categories.${cat.key}`)}
                    </Typography>
                    <Typography className='text-sm font-semibold text-ink-3'>
                      {cat.templates.length}
                    </Typography>
                    <Icons.Chevron size={16} color={c.ink3} />
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 3: Register the route**

In `src/navigation/RootNavigator.tsx`, add the import:

```ts
import { TemplateCategoriesScreen } from '@screens/trackers/TemplateCategoriesScreen'
```

And register (after the `TemplateCategory` screen from Task 3):

```tsx
        <Stack.Screen
          name='TemplateCategories'
          component={TemplateCategoriesScreen}
        />
```

- [ ] **Step 4: Typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/types.ts src/navigation/RootNavigator.tsx \
        src/screens/trackers/TemplateCategoriesScreen.tsx
git commit -m "feat(templates): categories list screen with global template search"
```

---

### Task 5: NewTrackerSheet + wire all add entry points

**Files:**
- Create: `src/features/trackers/components/NewTrackerSheet.tsx`
- Modify: `src/screens/trackers/TrackerListScreen.tsx` (FAB + empty CreateButton → sheet)
- Modify: `src/screens/today/DailyGoalsScreen.tsx` (empty CreateButton → sheet)

**Interfaces:**
- Consumes: `TemplateCategories` route (Task 4); existing `TrackerTypePicker` route.
- Produces: `NewTrackerSheet` (props `{ isOpen, onOpenChange, onChooseCustom, onChooseTemplates }`).

- [ ] **Step 1: Create the sheet component**

Create `src/features/trackers/components/NewTrackerSheet.tsx`:

```tsx
import { Pressable, View } from 'react-native'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Target, LayoutTemplate } from 'lucide-react-native'
import { Icons } from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onChooseCustom: () => void
  onChooseTemplates: () => void
}

/**
 * "New tracker" bottom sheet — the add-tracker entry point. Offers Custom Goal
 * (existing TrackerTypePicker flow) or Templates (browse pre-built goals).
 */
export function NewTrackerSheet({
  isOpen,
  onOpenChange,
  onChooseCustom,
  onChooseTemplates
}: Props) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          enableDynamicSizing
          backgroundClassName='bg-bg rounded-t-[27px]'
        >
          <View
            className='gap-s3 px-s5 pt-s4'
            style={{ paddingBottom: insets.bottom + 12 }} // safe-area, runtime
          >
            <Typography className='text-xl font-extrabold text-ink'>
              {t('template.sheetTitle')}
            </Typography>
            <Typography className='text-sm text-ink-2'>
              {t('template.sheetSubtitle')}
            </Typography>

            <Pressable
              onPress={onChooseCustom}
              className='flex-row items-center gap-s3 rounded-lg-k border border-line bg-surface p-s4 active:opacity-90'
            >
              <View className='h-[52px] w-[52px] items-center justify-center rounded-md-k border border-line'>
                <Target size={28} color={c.pace.on_track} strokeWidth={1.9} />
              </View>
              <View className='flex-1'>
                <Typography className='text-lg font-extrabold text-pace-on'>
                  {t('template.custom')}
                </Typography>
                <Typography
                  className='mt-[2px] text-sm text-ink-2'
                  numberOfLines={2}
                >
                  {t('template.customDesc')}
                </Typography>
              </View>
              <Icons.Chevron size={16} color={c.ink3} />
            </Pressable>

            <Pressable
              onPress={onChooseTemplates}
              className='flex-row items-center gap-s3 rounded-lg-k border border-line bg-surface p-s4 active:opacity-90'
            >
              <View className='h-[52px] w-[52px] items-center justify-center rounded-md-k border border-line'>
                <LayoutTemplate size={26} color={c.brand} strokeWidth={1.9} />
              </View>
              <View className='flex-1'>
                <Typography className='text-lg font-extrabold text-brand'>
                  {t('template.templates')}
                </Typography>
                <Typography
                  className='mt-[2px] text-sm text-ink-2'
                  numberOfLines={2}
                >
                  {t('template.templatesDesc')}
                </Typography>
              </View>
              <Icons.Chevron size={16} color={c.ink3} />
            </Pressable>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Wire the sheet into TrackerListScreen**

In `src/screens/trackers/TrackerListScreen.tsx`:

Add imports:

```ts
import { useState } from 'react'
import { NewTrackerSheet } from '@features/trackers/components/NewTrackerSheet'
```

Add state + handlers inside the component (after `const save = useSaveTracker()`):

```ts
  const [sheetOpen, setSheetOpen] = useState(false)
  const openSheet = () => setSheetOpen(true)
  const chooseCustom = () => {
    setSheetOpen(false)
    nav.navigate('TrackerTypePicker')
  }
  const chooseTemplates = () => {
    setSheetOpen(false)
    nav.navigate('TemplateCategories')
  }
```

Change the empty-state `CreateButton` `onPress` (currently `() => nav.navigate('TrackerTypePicker')`):

```tsx
              onPress={openSheet}
```

Change the FAB `onPress` (currently `() => nav.navigate('TrackerTypePicker')`):

```tsx
        onPress={openSheet}
```

Render the sheet — in the **empty-state** return, add it just before the closing `</View>` of the outer `<View className='flex-1 bg-bg'>`:

```tsx
        <NewTrackerSheet
          isOpen={sheetOpen}
          onOpenChange={setSheetOpen}
          onChooseCustom={chooseCustom}
          onChooseTemplates={chooseTemplates}
        />
```

And in the **populated** return, add the same block just before that return's closing `</View>` (after the FAB `</Pressable>`):

```tsx
      <NewTrackerSheet
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
        onChooseCustom={chooseCustom}
        onChooseTemplates={chooseTemplates}
      />
```

- [ ] **Step 3: Wire the sheet into DailyGoalsScreen**

In `src/screens/today/DailyGoalsScreen.tsx`:

Ensure `useState` is imported from `'react'` (add it if absent), and add:

```ts
import { NewTrackerSheet } from '@features/trackers/components/NewTrackerSheet'
```

Add state + handlers alongside the component's other hooks (near the top, where `nav` is available):

```ts
  const [sheetOpen, setSheetOpen] = useState(false)
  const chooseCustom = () => {
    setSheetOpen(false)
    nav.navigate('TrackerTypePicker')
  }
  const chooseTemplates = () => {
    setSheetOpen(false)
    nav.navigate('TemplateCategories')
  }
```

Change the empty-state `CreateButton` `onPress` (line ~809, currently `() => nav.navigate('TrackerTypePicker')`):

```tsx
              onPress={() => setSheetOpen(true)}
```

Render the sheet just before the empty-state's outermost closing `</View>`:

```tsx
        <NewTrackerSheet
          isOpen={sheetOpen}
          onOpenChange={setSheetOpen}
          onChooseCustom={chooseCustom}
          onChooseTemplates={chooseTemplates}
        />
```

- [ ] **Step 4: Typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: no errors.

- [ ] **Step 5: Full end-to-end verification on simulator**

Run: `yarn ios`. Verify the whole flow:
1. Trackers tab (populated) → tap FAB → sheet slides up with "New tracker" + Custom Goal / Templates.
2. Custom Goal → TrackerTypePicker (existing flow) works.
3. Templates → "Add Tracker" categories list; Health shows count 15, others 0.
4. Tap Health → template rows (name + emoji + type). Type in search → list narrows; clear search → full list. "Create Tracker" row → TrackerTypePicker.
5. Tap "No Soda" → form pre-filled (name "No Soda", bad-habit ON, soda emoji) → Save → tracker appears in list.
6. On the categories screen, type "sleep" → flat result shows Sleep (Average) → tap → form pre-filled.
7. Empty state (fresh install / archive all): both Trackers and Today "Create tracker" buttons open the sheet.
8. Toggle app language to Vietnamese (Settings) → category/template names and sheet copy are Vietnamese.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/components/NewTrackerSheet.tsx \
        src/screens/trackers/TrackerListScreen.tsx \
        src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(templates): New tracker sheet wired into all add entry points"
```

---

## Self-Review

**Spec coverage:**
- Navigation (2 screens + `templateKey`) → Tasks 2,3,4. ✅
- Entry points open sheet → Task 5. ✅
- Custom → TypePicker; Templates → categories; template → prefilled form; "Create Tracker" → TypePicker → Tasks 3,4,5. ✅
- Data model + Health 15 + 9 empty categories → Task 1. ✅
- Category icons (lucide) + 7 icon keywords → Task 1. ✅
- Search shows flat matching items (global on categories screen, scoped on detail) → Tasks 3,4. ✅
- Apple Health omitted → not built. ✅
- Bilingual EN+VI + `template` namespace → Task 1. ✅
- Pure unit tests (icon/color/i18n/uniqueness/direction/lookup/normalize) → Task 1. ✅

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✅

**Type consistency:** `templateKey` param (Task 2) matches navigate calls (Tasks 3,4). `Template`/`TemplateCategory`/`allTemplates`/`findTemplate`/`categoryByKey`/`normalizeText` (Task 1) used consistently downstream. `CATEGORY_ICON` produced in Task 1, consumed in Task 4. `NewTrackerSheet` props match both call sites. ✅

## Notes / deferred
- Diacritic-insensitive VI search deferred (Vietnamese horn/stroke letters don't NFD-decompose cleanly) — `normalizeText` is lowercase+trim only.
- The 9 non-Health category template lists are added later from reference images — append `Template`s to their `templates: []` arrays + i18n keys; no structural change.
- The sheet + open/handlers are duplicated across two host screens (~12 lines); extract to a `useNewTrackerSheet(nav)` hook if a third caller appears.
