# RnHeroUITemplate

React Native CLI base template with HeroUI Native UI library.

## AI Tooling — HeroUI Native Agent Skill

This project bundles HeroUI's official `heroui-native` Agent Skill so AI
assistants know the HeroUI Native component APIs. Installed via
`npx skills add heroui-inc/heroui` (the web `heroui-react` and `heroui-migration`
skills it also installs were removed — this is a React Native–only project).

- Source files: `.agents/skills/heroui-native/`
- Claude Code discovers it via symlink `.claude/skills/heroui-native` → `../../.agents/skills/heroui-native`
- Use the `heroui-native` skill (or `/heroui-native`) when building HeroUI UIs.
- Skill scripts (run with node) fetch live docs:
  `node .agents/skills/heroui-native/scripts/list_components.mjs`,
  `get_component_docs.mjs`, `get_theme.mjs`, `get_docs.mjs`.

Reinstall after cloning if symlinks break: re-run the `npx skills add` command,
or recreate `.claude/skills/*` symlinks pointing at `.agents/skills/*`.

## Tech Stack

- **React Native CLI** (no Expo) — RN 0.85
- **HeroUI Native** v1.0 — UI component library (37 components)
- **Uniwind** — Tailwind CSS v4 for React Native (required by HeroUI Native)
- **Zustand** + **MMKV** — state management with persistent storage
- **Axios** — HTTP client with auth interceptors
- **React Navigation v7** — stack + bottom tabs
- **react-hook-form** + **zod** — form validation
- **TanStack Query** — server state (cache, refetch, loading states)
- **react-native-config** — environment variables (.env)

## Project Structure

```
src/
├── api/            # Axios client, endpoints, API types
├── assets/         # Fonts, images
├── components/     # ui/ (HeroUI wrappers), common/ (shared)
├── hooks/          # Custom hooks (useAuth, useTheme, etc.)
├── navigation/     # React Navigation navigators + param types
├── screens/        # Feature-grouped screens
├── store/          # Zustand stores (useAuthStore, useAppStore)
├── theme/          # HeroUI provider config
├── types/          # Global TypeScript types
└── utils/          # Storage, validators, helpers
```

## Path Aliases

Use `@api/`, `@components/`, `@hooks/`, `@navigation/`, `@screens/`, `@store/`, `@theme/`, `@utils/` for imports. Types use `@app-types/` (not `@types/` — that conflicts with npm @types).

## HeroUI Native — Compound Component Patterns

HeroUI Native uses compound components, NOT flat props. This is critical:

### TextField (Input + Label + Error)
```tsx
<TextField isInvalid={!!error}>
  <Label><Label.Text>Email</Label.Text></Label>
  <Input placeholder="you@example.com" value={val} onChangeText={setVal} />
  {error && <FieldError>{error}</FieldError>}
</TextField>
```
- `Input` does NOT have `label`, `errorMessage`, or `isInvalid` props
- `isInvalid` goes on `TextField` wrapper
- `Label` and `FieldError` are separate components

### Button (no isLoading)
```tsx
<Button variant="primary" isDisabled={loading} onPress={fn}>
  {loading ? <Spinner /> : <Button.Label>Submit</Button.Label>}
</Button>
```
- NO `isLoading` prop — use `isDisabled` + conditional `<Spinner />`
- Variants: primary, secondary, tertiary, outline, ghost, danger, danger-soft

### Alert (uses status, not variant)
```tsx
<Alert status="danger">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>Error</Alert.Title>
    <Alert.Description>Something went wrong</Alert.Description>
  </Alert.Content>
</Alert>
```
- Prop is `status` not `variant`: default, accent, success, warning, danger

### Avatar (no name prop)
```tsx
<Avatar size="lg" color="accent">
  <Avatar.Image source={{ uri: url }} />
  <Avatar.Fallback>AB</Avatar.Fallback>
</Avatar>
```
- NO `name` prop — pass initials as children of `Avatar.Fallback`

### Card
```tsx
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Subtitle</Card.Description>
  </Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

## State Management

- **Zustand** for client state (auth, theme preferences) — persisted via MMKV
- **TanStack Query** for server state (API data) — handles caching, refetching, loading/error
- **DO NOT** use Zustand to cache API responses — use TanStack Query instead

## API Layer

- `src/api/client.ts` — Axios instance with auto token attach + 401 refresh
- `src/api/endpoints/` — API functions grouped by feature
- `src/api/types/` — Request/response types
- `src/api/queries/` — TanStack Query hooks (useQuery/useMutation wrappers)
- Base URL comes from `react-native-config` (Config.API_BASE_URL)

## Environment

- `.env.development`, `.env.staging`, `.env.production`
- Access via `import Config from 'react-native-config'`
- Never commit `.env.*` files with secrets

## Theme

- Dark/light mode via Uniwind: `Uniwind.setTheme('dark' | 'light')`
- Custom themes in `global.css` using CSS variables (`@variant`, `@layer theme`)
- Theme preference persisted in MMKV via `useAppStore`

## Commands

```bash
npx react-native run-ios          # Run iOS
npx react-native run-android      # Run Android
npx react-native start            # Start Metro
npx tsc --noEmit                  # Type check
```

## Conventions

- Named exports for components and hooks (no default exports except App.tsx)
- Screens in `screens/<feature>/` folders
- One Zustand store per domain (auth, app, etc.)
- Zod schemas in `utils/validators.ts`
- TypeScript strict mode enabled
