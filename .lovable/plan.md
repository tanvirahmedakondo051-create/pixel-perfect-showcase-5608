# Multi-File (React + Vite) and Auto Backend

## Two important realities (decisions in this plan)

1. **Building React sites cannot run inside this app's server.** The app server cannot run `npm install` / `npm run build`. The build will run on your VPS through the existing deploy agent (a new "build" job). If no VPS agent is set up, React mode shows a Bangla notice and stays disabled.
2. **Auto backend uses one shared database, not a new table per site.** Creating real tables needs a Management access token (not a Service Key) and is risky per user. Instead, each project gets "virtual tables" stored in one shared table, separated by project and table name, with row/table limits enforced by the server. Generated sites talk to it through a small public API, so no keys are ever placed in site code. The admin "master project" setting is still added for a future switch to real tables.

## Part 1 — React + Vite projects

- New project screen: toggle **[🌐 সিঙ্গেল HTML] [⚛️ React + Vite]**.
- React mode prompt forces a JSON `files` array (package.json, vite.config.ts, tailwind config, index.html, all src files); single HTML is rejected.
- Files saved per project; builder gets a simple file tree + code viewer.
- On each generation: files sent to the VPS agent → `/projects/{id}/` → `npm install && npm run build`, log streamed live: "ইনস্টল হচ্ছে… → বিল্ড হচ্ছে… → ✅ রেডি".
- Build fails → error sent back to AI automatically for one-time fix (max 2 retries, coins charged normally).
- Preview loads the built `dist/` from the VPS; Publish copies `dist/` to the site folder with nginx + SSL (same flow as today).

## Part 2 — Auto Backend

- Admin → সেটিংস → ব্যাকএন্ড: master project URL + key (stored server-only, masked), plus limits (default 10 tables, 10k rows).
- AI detects words like login / database / save → card "⚡ ব্যাকএন্ড লাগবে? [অটো সেটআপ]".
- On confirm, AI proposes a schema; server creates the virtual tables (auto `id`, `project_id`, `created_at`) and tells the AI the schema.
- Generated code (HTML or React) gets an auto-injected small client that reads/writes via `/api/public/db/{project}/{table}`; supports visitor login via a per-site sign-up/sign-in.
- Builder toolbar **🗄️ ব্যাকএন্ড** dialog: table list, row counts, data viewer (paged), delete rows, "AI দিয়ে টেবিল যোগ করুন".

## Technical details

- DB: `projects.project_type` ('html'|'react'), `projects.files jsonb`, `projects.build_status/build_log`; `backend_tables (project_id, table_name, schema_json, created_at)`; `backend_rows (id, project_id, table_name, data jsonb, owner_id, created_at)`; `site_users` for per-site visitor auth (hashed passwords). RLS: owners read their own project data; public API goes through server routes with validation, per-table limits and rate limiting.
- Deploy agent: new signed `/build` endpoint (npm install/build, NDJSON log stream, serves `dist` at preview path); install script updated to install Node build tools. Existing users must re-run the install command.
- `generate.ts`: React branch with JSON-files schema, build-fix loop, backend schema context injection.
- Not verifiable here without a real VPS; I will test the file generation, backend API and UI locally.
