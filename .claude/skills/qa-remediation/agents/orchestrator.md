# Remediation Orchestrator

You coordinate the full remediation workflow. This file defines how to spawn and manage subagents for parallel work.

## Subagent Routing

| Task | Agent | File | Parallelizable |
|------|-------|------|----------------|
| Fix IDOR in cases routes/services | fixer | `agents/fixer.md` | Yes — per entity |
| Fix IDOR in documents routes/services | fixer | `agents/fixer.md` | Yes — per entity |
| Fix IDOR in appointments routes/services | fixer | `agents/fixer.md` | Yes — per entity |
| Fix IDOR in intake routes/services | fixer | `agents/fixer.md` | Yes — per entity |
| Fix token/user/timelog authorization | fixer | `agents/fixer.md` | Yes — per entity |
| Write regression tests | tester | `agents/tester.md` | After fixes complete |
| Run validation gate | validator | `agents/validator.md` | After each phase |
| UI polish (mobile + labels) | main agent | Direct | Sequential |
| Lint config | main agent | Direct | Sequential |
| Deploy | main agent | Direct | Sequential |

## Parallel Execution Strategy

### Phase 1 (Critical): Spawn up to 3 fixers in parallel

```
Fixer A: cases (bugs 1-2)  → cases.routes.ts + case.service.ts
Fixer B: documents (bug 3) → documents.routes.ts + document.service.ts
Fixer C: appointments (bug 4) + intake (bug 5)
         → appointments.routes.ts + appointment.service.ts
         → intake.routes.ts + intake.service.ts
```

Wait for all fixers → run validator → commit.

### Phase 2 (High): Spawn up to 3 fixers in parallel

```
Fixer D: doc create/generate (bug 6) + client impersonation (bug 7)
Fixer E: token IDOR (bug 8) + user profile (bug 9)
Fixer F: timelog IDOR (bug 10)
```

Wait for all fixers → run validator → commit.

### Phase 3 (Medium): Sequential or 2 parallel

```
Fixer G: timelog create (bug 11) + doc generate (bug 13)
Fixer H: telegram upload (bug 12)
```

Wait → run validator → commit.

### Phase 4 (Tests): Single tester agent

Spawn tester agent with all bugs 1–10. It reads the fixed service files and writes comprehensive tests.

Wait → run validator → commit.

### Phases 5–7: Main agent handles directly

These are small, sequential tasks that don't benefit from parallelism.

## Prompt Template for Fixer Subagent

```
You are an authorization fixer agent. Read agents/fixer.md for your instructions.

Your assignment:
- Bug(s): [N, M]
- Bug descriptions: [from QA_AUDIT_REPORT.md]
- Route file(s): [path]
- Service file(s): [path]

Fix the authorization gaps following the pattern in fixer.md.
Do not modify any files outside the specified routes and services.
Report back with: files modified, changes made, edge cases found.
```

## Prompt Template for Tester Subagent

```
You are a regression test writer. Read agents/tester.md for your instructions.

Write tests for bugs 1–10 in tests/authorization.test.ts.
Read each affected service file first to understand the current query patterns.
Follow the test structure and naming conventions in tester.md.
```

## Prompt Template for Validator Subagent

```
You are a validation gate agent. Read agents/validator.md for your instructions.

Run the full validation suite for Phase [N].
Backend code was [changed/not changed] in this phase.
Report results in the specified table format.
```

## Error Recovery

If a fixer introduces a type error or test failure:
1. Read the validator's error report
2. Identify which fixer's changes caused the issue
3. Fix inline (don't re-spawn the fixer for small issues)
4. Re-run validator

If a fixer is blocked (e.g., can't determine the right Prisma relation):
1. Read the Prisma schema at `packages/db/prisma/schema.prisma`
2. Provide the relevant model definitions to the fixer
3. Re-spawn with additional context

## Commit Messages

Use conventional commits:

| Phase | Message |
|-------|---------|
| 1 | `fix(security): close critical IDOR vulnerabilities (bugs 1-5)` |
| 2 | `fix(security): close high-severity authorization gaps (bugs 6-10)` |
| 3 | `fix(backend): resolve medium-severity issues (bugs 11-13)` |
| 4 | `test(security): add regression tests for authorization fixes` |
| 5 | `style(web): reduce mobile vertical space, improve button labels` |
| 6 | `chore(lint): add ESLint v9 flat config` |
| 7 | `docs: finalize remediation progress report` |
