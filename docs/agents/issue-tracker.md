# Issue tracker: Linear (MCP)

Issues and specs for this repo live in [Linear](https://linear.app/cyraatv). Use the **`plugin-linear-linear`** MCP namespace via `CallDynamicTool` (not the `gh` CLI).

## Scope for this repo

| Field | Default |
| ----- | ------- |
| **Workspace** | CyraaTV |
| **Team** | `CYR` (CyraaTV) |
| **Project** | `TCG V2` (`P-CYR-1`) — WILDIA / `wildia-tcg` |
| **Git remote** | `git@github.com:AxelDemorest/wildia-tcg.git` |

When creating work tied to this codebase, set `team` and `project` unless the user specifies otherwise. Mention the GitHub repo in the description when it helps traceability.

## Conventions

Discover tool schemas with `GetDynamicTools` before calling. Prefer human-readable references (`CYR-123`, `TCG V2`, `me`) over raw UUIDs when the tools allow it.

- **Create an issue**: `save_issue` with `team: "CYR"`, `project: "TCG V2"`, `title`, and `description` (Markdown; use real newlines, not escaped `\n`). Optional: `priority`, `state`, `labels`, `parentId`, `blockedBy`, `blocks`, `relatedTo`, `assignee`, `delegate`.
- **Read an issue**: `get_issue` with id or identifier (e.g. `CYR-42`). Use `list_comments` for discussion.
- **List issues**: `list_issues` with `team`, `project`, `label`, `state`, `assignee`, `query`, and paginate with `cursor` when `hasNextPage` is true.
- **Comment**: `save_comment` with the issue id; pass `id` only when updating an existing comment.
- **Apply / remove labels**: on update, prefer `addLabels` / `removeLabels` on `save_issue` so existing sprint/domain labels are kept. Use `labels` only when replacing the full set intentionally.
- **Close / cancel**: `save_issue` with the appropriate `state` for the team (use `list_issue_statuses` with `team: "CYR"` if unsure). Add context with `save_comment` first when the skill calls for an explanation.
- **Parent / sub-issue**: `parentId` on `save_issue` (identifier or UUID).
- **Blocking**: `blockedBy` / `blocks` on `save_issue` (append-only). A ticket is startable when blockers are completed or canceled; use `get_issue` or `list_issues` with `fields` including status to verify.

## Triage vocabulary

Triage roles map to labels documented in `docs/agents/triage-labels.md`. Use those label names with `addLabels` / `removeLabels`.

This repo does not use GitHub Issues for tracking agent work; GitHub remains the code host and CI target only.

## When a skill says "publish to the issue tracker"

Create a Linear issue in team `CYR`, project `TCG V2`.

## When a skill says "fetch the relevant ticket"

Read it with `get_issue` and, if needed, `list_comments`.

## Wayfinding operations

Used by `/wayfinder` when adapted for Linear:

- **Map**: a parent issue whose title/description holds Notes / Decisions-so-far / Fog; children use `parentId`.
- **Child ticket**: `save_issue` with `parentId` set to the map issue; link blockers with `blockedBy`.
- **Frontier query**: `list_issues` for open children of the map (e.g. `parentId`), exclude assigned issues and those with open blockers.
- **Claim**: `save_issue` with `assignee: "me"`.
- **Resolve**: `save_comment` with the answer, then move to a done/canceled state and update the map description (full `description` or `patch` on the parent).