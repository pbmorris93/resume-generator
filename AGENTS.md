# Repository Guidelines

## Project Structure & Module Organization
This Bun/TypeScript CLI lives under `src/`, with `src/cli` providing argument parsing, `src/generators` handling PDF rendering, `src/templates` storing Handlebars layouts, and `src/validators`/`src/schemas` managing JSONResume validation. Shared helpers stay in `src/utils`. Sample inputs are under `examples/` and `resume-data.example.json`; keep new fixtures alongside them. Tests reside in `tests/` mirroring folder names from `src/`. Build artifacts land in `dist/` via `build.mjs`; never commit that directory.

## Build, Test, and Development Commands
Run everything with Bun ≥1.0.0.
```
bun run dev             # execute CLI directly in watch mode
bun run build           # bundle to dist/ and chmod CLI
bun run lint            # eslint over src/
bun run format          # prettier write src/
bun test                # vitest suite
bun test --coverage     # CI coverage check
bun run generate-resume # build + render resume-data.json to resume.pdf
```

## Coding Style & Naming Conventions
TypeScript modules use ES modules and named exports for shared utilities; keep one default export only for the CLI entry. Follow Prettier defaults (2-space indent, ~100 character lines) by running `bun run format` before committing. ESLint enforces unused-import and type-safety rules—fix warnings rather than silencing them. Name files after their primary class or feature (`resume-writer.ts`, `schema-loader.ts`), and keep template files in `src/templates/<theme>.hbs`.

## Testing Guidelines
Vitest powers the suite; place specs in `tests/<feature>.spec.ts` matching the source folder. Prefer focused unit tests around generators and validators, and use the Playwright-driven paths only in higher-level integration tests to keep runs fast. New logic should include positive and failure cases plus schema coverage; treat `bun test --coverage` ≥90% statements as the baseline before PRs.

## Commit & Pull Request Guidelines
Commits in this repo are short, descriptive summaries (e.g., `feat(cli): add watch flag`). Keep the subject imperative and under 72 chars, add scoped prefixes when touching multiple layers, and include concise body bullets for breaking changes. Pull requests must describe the change, list testing commands, attach generated PDF samples when output changes, and link any tracked issue. Mark template or schema updates clearly so reviewers can rerun `bun run generate-resume`.
