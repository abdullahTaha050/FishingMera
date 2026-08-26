# Mera Repository Agent Instructions

These rules apply to every Codex task inside the Mera repository.

## 1. Identity check
Before editing in a new session:
- Confirm this is the existing Mera repository.
- Confirm repo root.
- Confirm the requested target file/screen exists.
- For UI tasks confirm `.agents/skills/mera-mobile-design/SKILL.md` exists.
If any check fails, STOP. Do not create a new project.

## 2. Scope discipline
Treat every explicit user requirement as a contract.
If the user asks for 6 changes, convert them to 6 acceptance items before editing.

Do not:
- silently skip items
- partially implement an item and mark it done
- redesign unrelated screens
- add nice-to-have features
- refactor unrelated code
- change backend/API/data models unless required
- reinterpret an exact layout request into a different layout

Exact layout requests such as “4 cards in one row”, “3 + 2 layout”, “transparent background”, or “remove this section” must be implemented literally unless technically impossible. If impossible, STOP and explain before substituting.

## 3. Mandatory acceptance checklist
Before editing, create an internal checklist from every explicit requirement.

Example:
- [ ] Quick Facts background transparent
- [ ] Border preserved
- [ ] Weather/Sea = 4 cards in one row
- [ ] Weather/Sea icons visibly larger
- [ ] Best Times = 3 items first row, 2 second row
- [ ] Gear removed
- [ ] Notes removed
- [ ] Local Reports removed

Do not say “done” while any explicit item is unresolved.
“Mostly done” and “close enough” are not completion criteria.

## 4. UI tasks
For every Mera UI/UX task invoke and follow `$mera-mobile-design`.

Source of truth:
1. current user instructions
2. `.agents/skills/mera-mobile-design/SKILL.md`
3. bundled reference assets

Do not assume existing repository UI is correct when it conflicts with these.

## 5. Screenshot acceptance gate
Typecheck/lint does not prove a UI request is correct.

For UI changes, when a device/simulator is available:
1. Let the user control app launch/navigation if they said they will.
2. Do not relaunch app, send deep links, restart Metro, or reconnect ADB unless asked.
3. Apply requested changes.
4. Let Fast Refresh update the screen.
5. Capture a screenshot from the connected device/simulator.
6. Compare screenshot against every explicit acceptance item and the relevant design reference.
7. Fix failed items.
8. Re-capture only as needed.

Do not claim visual success without visual verification if screenshot capture is unavailable.

## 6. Iteration rule
Normally use at most 3 visual polish iterations.
However, this limit DOES NOT apply while any explicit user acceptance item is still failing.
Once all explicit requirements pass, stop polishing unrelated details.

## 7. Preserve working functionality
Unless explicitly requested, do not change:
- recommendation scoring
- Supabase/backend behavior
- PostGIS
- auth
- offline sync
- SQLite
- save semantics
- share behavior
- directions behavior
- localization architecture
- navigation contracts
- permissions
- EAS profiles
- native settings
- package IDs
- secrets
- preview/production config

## 8. Build/test discipline
For ordinary JS/TS/UI changes, allowed by default:
- targeted typecheck
- targeted lint
- relevant component/unit tests
- screenshot verification

Do NOT run by default:
- EAS build
- Android native build
- iOS native build
- full E2E
- full regression
- broad repo-wide tests

If an external build is submitted:
- report build ID/URL
- STOP
- do not actively poll unless asked

## 9. Metro / dev-client discipline
If Fast Refresh already works:
- do not restart Metro
- do not reconnect ADB
- do not relaunch the app
- do not send deep links
- assume user can navigate if they say the screen is open

Preferred UI loop:
edit -> Fast Refresh -> screenshot -> verify.

## 10. Git discipline
Do not commit/push unless the user explicitly asks.

When asked:
1. one `git status` + relevant diff safety check
2. exclude secrets, env files, tokens, APK/AAB/IPA, caches, temporary recordings, unrelated generated files
3. stage intended files only
4. commit once
5. push
6. report SHA + branch
7. STOP

Do not repeatedly re-analyze after scope is clear.

## 11. Secrets
Never print, expose, commit, or move secrets into source code.

## 12. Cost/token discipline
For a one-screen edit:
- inspect target screen
- inspect directly used components
- inspect design skill + relevant reference asset
Do not reread the whole repo, do web research, launch unrelated workflows, run expensive builds, or keep “improving” after acceptance passes.

## 13. Completion
Before saying done:
1. reread user request
2. check every acceptance item
3. for UI, verify latest screenshot when available
4. run only targeted technical checks
5. report what changed, what was verified, and anything not verified
6. STOP

Never automatically continue to another screen, refactor, build, or optimization.
