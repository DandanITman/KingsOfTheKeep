---
name: commit-and-push
description: Commit the current working-tree changes with a detailed message, append an entry to CHANGELOG.md, and push to the GitHub remote (origin, https://github.com/DandanITman/KingsOfTheKeep). Use this after finishing any coherent, working change to the codebase — a bug fix, a feature, an asset/UI pass, a refactor — not after every single file edit. Trigger phrases: "commit this", "commit and push", "push to github", "save this to github", or proactively once a requested change is complete and verified.
---

# Commit and push (Kings of the Keep)

Run this after a logical unit of work is done and verified (typecheck/tests pass,
and — for UI/render changes — the change has been visually checked per the
project's verification workflow). Don't run it mid-task or after every small
edit; batch a coherent change into one commit.

## Steps

1. **Check state first.**
   - `git status` (never `-uall`) to see staged/unstaged/untracked files.
   - `git diff` and `git diff --staged` to see exactly what changed.
   - If there are unrelated in-progress changes mixed in that the user didn't
     ask about, stage only the files relevant to the current change — don't
     sweep up unrelated work with `git add -A` unless the user's ask spans the
     whole tree.

2. **Verify before committing.** If the change touches TypeScript, run
   `npx tsc --noEmit`. If it touches sim/game logic, run `npx vitest run`.
   Don't commit on a red build — fix or report the failure first.

3. **Write a detailed changelog entry.** Prepend (don't append) a new section
   to `CHANGELOG.md` at the repo root, creating the file if it doesn't exist,
   using this format:

   ```markdown
   ## <short title of the change>

   - Bullet per meaningful change, written for a future reader who wasn't
     watching this session — what changed and why, not just "updated X".
   - Call out anything the user should know: new dependencies, breaking
     changes, follow-ups still needed, known limitations.
   ```

   Do not invent a date or version number (no reliable clock in-session) —
   the section header is just a descriptive title. Keep entries genuinely
   informative: 2-6 bullets, specific enough that `git log` isn't the only
   record of *why* something changed.

4. **Stage and commit.** Use a HEREDOC for the commit message so multi-line
   bodies format correctly:

   ```
   git add <relevant files> CHANGELOG.md
   git commit -m "$(cat <<'EOF'
   <concise imperative summary line, <70 chars>

   <2-5 sentences of body: what changed and why, mirroring the changelog
   entry but in prose>

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

5. **Push to origin.**
   - Confirm the remote is set: `git remote -v` (should show `origin` →
     `https://github.com/DandanITman/KingsOfTheKeep.git`). If missing, add it
     with `git remote add origin https://github.com/DandanITman/KingsOfTheKeep.git`.
   - Determine current branch: `git branch --show-current`.
   - Push: `git push -u origin <branch>` (the `-u` is harmless to repeat once
     upstream is already set).
   - If push fails on auth (no credential helper / no PAT configured), or on
     a non-fast-forward rejection, **do not force-push**. Report the exact
     error to the user and stop — the local commit is already safe. Force
     push, rewriting history, or bypassing hooks all require explicit user
     sign-off first (see the git safety rules in the main system prompt).

6. **Confirm.** Report back: what was committed (short summary + files
   touched count), the changelog entry title, and whether the push
   succeeded — including the commit SHA and a link to the GitHub compare/
   commit view when push succeeds.

## Notes

- Never commit `.dev-shots/`, `node_modules/`, or other obvious build/scratch
  output — check `.gitignore` covers them; add entries if something scratch-y
  is untracked and about to get swept up by a broad `git add`.
- Never skip hooks (`--no-verify`) or amend previous commits unless the user
  explicitly asks.
- If the user asked for a specific commit message, use it verbatim as the
  summary line instead of drafting one, but still write the CHANGELOG.md
  entry and full body.
