# next-moodle — Editorial Native

## 1. Product and experience contract

Editorial Native is a student-facing Moodle replacement that treats every course, activity, message, and deadline as part of one calm academic workspace. The interface should feel like a well-made native study tool: immediate, warm, precise, and content-led.

Typography, tonal surfaces, asymmetric composition, and short purposeful motion create hierarchy. Repeated cards, permanent three-pane layouts, decorative animation, glossy gradients, large shadows, and conversation styling outside real messages are prohibited. Moodle remains the source of truth, and no student-facing action opens Moodle navigation UI.

## 2. Foundation tokens

| Semantic token | Light | Dark |
|---|---:|---:|
| Canvas | `#E8E3D9` | `#0C0C0B` |
| Chrome | `#DED7CB` | `#121210` |
| Surface | `#F2EDE4` | `#181816` |
| Elevated | `#FBF6ED` | `#21211E` |
| Selected | `#F1D3C8` | `#342019` |
| Inset | `#E1DBD0` | `#141412` |
| Primary text | `#211E1A` | `#F5F1E8` |
| Secondary text | `#676158` | `#ADA59A` |
| Tertiary text | `#817A70` | `#817B73` |
| Accent | `#A64732` | `#F07A5F` |
| Accent strong | `#893224` | `#FF9A7E` |

- Dark is the default. Light uses warm paper tones and never becomes a wall of pure-white cards.
- Accent is reserved for primary actions, focus, current position, urgent deadlines, and progress. Status colors remain semantically distinct.
- Depth uses tonal steps, inset highlights, and fine rules. Shadows are limited to command palettes, menus, drawers, and dialogs.
- The canvas may carry a 1–1.5% paper-grain treatment. Forms, reading surfaces, and controls remain texture-free.
- Geist renders Latin text and numbers; Japanese falls through to the operating-system UI font. Geist Mono is reserved for time, counts, IDs, progress, and shortcut labels.
- Type scale: 12px metadata, 13px labels, 15px body, 18px section title, 22–28px page title. Body measure is limited to 68ch.
- Shapes: 4px controls, 8px local surfaces, 12px overlays. Circular shapes are reserved for status dots and avatars.
- Spacing follows a 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

## 3. Shell geometry and scroll ownership

At 1280px and wider, the authenticated shell uses a 72px labelled focus rail, a 56px command bar, and a fluid main canvas. Courses and messages may add one 288px contextual panel. Contextual panels are collapsible; inspectors are on-demand sheets and never a permanent fourth region.

At 768–1279px, the rail is 60px and contextual navigation opens as a focus-managed sheet. Below 768px, the interface uses a 52px top bar, one content pane, and a 60px five-item bottom navigation.

The shell is bounded by `100dvb`. The document does not scroll inside authenticated routes. Every content canvas, contextual list, conversation list, and thread declares one scroll owner and applies `min-block-size: 0`. Overlays restore focus to their trigger on close and close on Escape.

Workspace modes remain fixed:

- `overview`: dashboard and summary routes; focus rail plus fluid canvas.
- `browse`: courses and structured indexes; optional contextual index plus canvas.
- `focus`: assignments and activities; centered reading/editing canvas plus action dock.
- `conversation`: messages; conversation index plus thread, with participant details on demand.

## 4. Information architecture

- Dashboard: asymmetric “today” composition with the next deadline as a focused paper, seven-day flow as the primary reading path, course progress as rows, and unread/tools as compact utilities.
- Course list: searchable study index with classification, progress, next deadline, and last access visible without opening a course.
- Course detail: collapsible section index, maximum 960px reading canvas, inline labels, activity rows, and a compact course folio. Progress and teacher actions live in an inspector sheet.
- Activity and assignment: maximum 880px reading/editing canvas, sticky action dock, and an optional utility sheet for AI assistance, files, submission state, or attempt status.
- Messages: conversation index plus thread. Speech bubbles are used only for real conversation messages. Participant information is an inspector sheet.
- Teacher contact: desktop recipient step plus 680–760px compose canvas; mobile course → recipient → review progression. A preflight summary names the recipient, course, subject, excerpt, and server revalidation behavior.
- Calendar, notifications, grades, people, files, profile, badges, plans, diagnostics, shortcuts, and PDF tools reuse the same route header, data-row, timeline, action-dock, empty, loading, and error grammar.
- Login: a quiet authentication workspace with connection, privacy, and session facts. It is not a marketing page.

## 5. Reusable primitives and states

- `FocusRail`: labelled global navigation, active ink marker, compact identity, command/search, settings, and mobile counterpart.
- `PageFrame`: `header`, `context`, `content`, `utility`, and `actions` slots with an explicit workspace mode.
- `WorkspaceTransition`: route, loading reveal, and same-location content transition boundary.
- `TransitionLink`: typed navigation intent for drill-in, return, and switch transitions.
- `RouteHeader`: breadcrumb, title, description, metadata, and compact actions.
- `ContextPanel`: collapsible section, course, or conversation index with one scroll owner.
- `SectionIndex`: ordered course/activity navigation with completion and current-position states.
- `InspectorSheet`: modal on narrow screens and anchored sheet on wide screens, with animated close and focus restoration.
- `ActionDock`: sticky save, send, submit, attempt, and network-state controls.
- `DataRow`: index/icon, primary text, metadata, state, and trailing action without card chrome.
- `Timeline`: date axis, current-time marker, event row, empty day, and overdue state.
- `CapabilityNotice`: missing read/action capability, denied, malformed response, outage, and expired session.

Every primitive exposes default, hover, pressed, focus-visible, selected, disabled, loading, empty, error, long-content, and reduced-motion behavior in `/dev/ui` before release.

## 6. Motion and interaction

- Motion intents are `drill-in`, `return`, `switch`, and `reveal`. Motion always communicates hierarchy, continuity, or completion.
- Durations: 90ms instant, 140ms feedback, 200ms enter/exit, 280ms route/shared element.
- Easing: enter `cubic-bezier(.16, 1, .3, 1)`; exit `cubic-bezier(.4, 0, 1, 1)`.
- Rail and command bar remain spatial anchors. Route content moves by at most 24px; panels move by at most 16px; controls move by at most 1px or scale to .985.
- Course row → course title, activity row → activity title, and conversation row → thread title use shared-element continuity where identities are stable.
- Only `transform`, `opacity`, `filter`, and intentional color transitions animate. Layout properties never animate. `will-change` exists only for an active transition.
- `prefers-reduced-motion` removes spatial movement, morphing, and stagger. State changes may retain a crossfade of at most 100ms.
- Unsupported View Transition browsers receive the same behavior without animation.
- `Cmd/Ctrl+K` searches screens, courses, activities, messages, and settings. `?` opens shortcut help outside editors.
- Keyboard focus is always visible. Japanese IME composition never triggers submit, message send, or AI completion.
- Every touch target is at least 44px. Dense rows keep a 44px interaction box even when their visible height is smaller.

## 7. Moodle replacement contract

The redesign does not change Moodle DTOs, server sessions, BFF routes, submission APIs, AI APIs, or the teacher-message API. Server Components continue to load Moodle data directly, while interactive leaves remain Client Components.

`MoodleCapabilityManifestV5`, typed Moodle screen/document models, authenticated file proxying, and the fixed-origin HTML conversion boundary remain binding. Malformed activities stay isolated to their own rows.

## 8. Accessibility, personas, and accepted debt

Primary personas are a keyboard-first student triaging deadlines, a mobile student using touch and Japanese IME, and a student using 200% zoom, reduced motion, or high cognitive load. WCAG 2.2 AA, semantic landmarks, logical properties, visible focus, status text in addition to color, readable Japanese wrapping, and no horizontal page scroll are release gates.

Visual QA covers 375, 768, 1280, and 1600px in dark and light themes, long Japanese text, empty and malformed data, touch, keyboard, reduced motion, focus restoration, and 200% zoom. Production Chrome is the measurement surface.

Accepted deployment debt remains external: API-unsupported third-party activity execution remains in Moodle itself. No visual or accessibility debt is accepted for the Editorial Native implementation.
