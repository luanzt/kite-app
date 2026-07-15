---
name: create-pr
description: Commit the current repository changes, push the working branch, and open a GitHub pull request whose title and body are derived from the actual diff and verification performed. Use when the user asks to create, open, submit, or prepare a PR from local work, including requests to commit and push the current changes before opening the PR.
---

# Create PR

Publish the current coherent change as one intentional commit and one GitHub
pull request. Complete the workflow unless a genuine safety or scope ambiguity
requires user input.

## 1. Establish repository context

1. Read the applicable `AGENTS.md` files and repository contribution guidance.
2. Inspect `git status --short`, the current branch, remotes, the default branch,
   recent commit style, and both staged and unstaged diffs.
3. Treat every existing modification as user-owned. Do not discard, rewrite, or
   include unrelated work merely to obtain a clean tree.
4. Check untracked and ignored-looking files for credentials, generated output,
   environment files, or other content that must not be committed. Never expose
   secret values in output.
5. Determine the coherent change represented by the working tree. If files are
   materially unrelated and intent cannot be inferred safely, ask which subset
   to publish before staging anything.

If there are no local changes, do not create an empty commit. Continue only when
the branch already contains unpublished commits suitable for a PR; otherwise
report that there is nothing to publish.

## 2. Prepare the branch and verify the change

1. If currently on the default branch or in detached HEAD state, create a short,
   descriptive kebab-case branch before committing. Otherwise keep the current
   branch unless the user requested a different one.
2. Derive verification commands from the changed files and repository guidance.
   Run the narrow relevant checks first, then any required pre-PR checks when
   practical.
3. Fix failures caused by the current change when that work is within the user's
   requested scope. Do not modify unrelated code just to make an existing failure
   disappear.
4. Record exactly which checks passed, failed, or were not run. Never claim a
   check passed without running it.

## 3. Create the commit

1. Review the final diff before staging.
2. Stage intended paths explicitly. Do not use broad staging when it could capture
   unrelated files.
3. Review the staged diff and confirm it contains no secrets, debug artifacts, or
   unrelated changes.
4. Write a concise imperative commit message that matches repository history.
   Use Conventional Commits when the repository does; infer the type and optional
   scope from the dominant change.
5. Create one commit for the coherent change. Do not amend, squash, or rewrite
   existing commits unless the user explicitly requests it.

## 4. Push safely

1. Push the current branch to the appropriate remote and set upstream when
   needed.
2. Never force-push unless the user explicitly authorizes it.
3. If authentication, permissions, or remote divergence blocks a normal push,
   stop and report the exact blocker rather than changing history.

## 5. Create the pull request

1. Check whether the current branch already has an open PR. Return the existing
   PR instead of creating a duplicate; update it only when the user requested an
   update.
2. Compare the complete branch diff against the selected base branch. Do not base
   the PR description only on the final commit or on filenames.
3. Derive an imperative title from the user-visible purpose of the complete diff.
   Follow repository title conventions; use Conventional Commit form when that is
   the established pattern.
4. Write a concise body containing:

   - `Summary`: why the change exists and its resulting behavior.
   - `Changes`: the important implementation or behavior changes.
   - `Testing`: commands actually run and their outcomes; explicitly state any
     verification not run and why.
   - `Risk`: relevant schema, sync, native, environment, notification,
     translation, compatibility, or rollout concerns; write `Low` only with a
     brief reason.

5. Add issue/design links and screenshots or recordings only when available.
   Never invent links, test results, or evidence. Explicitly note when a UI change
   needs visual evidence that is not available.
6. Create a ready-for-review PR by default. Use a draft only when the user asks or
   the change is knowingly incomplete.
7. Prefer the connected GitHub integration for PR operations when available;
   otherwise use `gh`. Pass the title and body non-interactively.

## 6. Report the result

Return the PR link, branch, commit hash and subject, base branch, and verification
summary. Mention any excluded local changes or remaining risks so the user knows
exactly what was published.
