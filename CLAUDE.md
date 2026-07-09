# Kings of the Keep

TypeScript + Three.js RTS. `npm run dev` (vite), `npm run build` (tsc + vite),
`npm run typecheck`, `npm test` (vitest).

## Git workflow

After finishing and verifying any coherent change (typecheck/tests green, and
visually checked in the preview for UI/render changes), invoke the
**commit-and-push** skill (`.claude/skills/commit-and-push/SKILL.md`) to
commit with a detailed message, log the change in `CHANGELOG.md`, and push to
`origin` (https://github.com/DandanITman/KingsOfTheKeep). Don't commit
mid-task or after every small edit — batch each logical change into one
commit, and never force-push or skip hooks without explicit sign-off.
