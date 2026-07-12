---
name: develop-feature-files
description: >-
  Develop or extend AgentX private file storage (SeaweedFS S3, dashboard File
  browser, 20 GB quota, list_files/upload_file/read_file tools). Use when working
  on user_files, /api/files, SeaweedFS infra, or AgentX storage AI tools.
---

# Develop Feature: Files (SeaweedFS)

## When to Use

- Changing Dashboard → File UI or `/api/files` routes
- Touching SeaweedFS Docker Compose, S3 client, or storage env vars
- Working on `list_files` / `upload_file` / `read_file` (AgentX storage, not Google Drive)
- Quota, upload-session/confirm flow, or `user_files` schema

## Overview

Private Drive-like storage per user. Blobs live in **SeaweedFS** (S3 API); hierarchy, sizes, and quota live in PostgreSQL (`user_files`). Hard cap **20 GiB** per user. No public share links. Google Drive OAuth tools remain separate.

## Key locations

| Area | Path |
|------|------|
| Infra | `infra/seaweedfs/` — docker-compose, `s3.json` |
| Setup script | `scripts/setup-seaweedfs.sh` — `npm run seaweedfs:up` |
| Docs | `docs/seaweedfs-setup.md` |
| Constants / quota | `lib/files/constants.ts` |
| S3 client | `lib/files/s3-client.ts` |
| Repository | `lib/files/repository.ts` |
| Zod schemas | `lib/files/schemas.ts` |
| DB table | `user_files` in `lib/db/schema.ts` |
| API | `app/api/files/` |
| Dashboard | `app/dashboard/files/`, `components/dashboard/files/` |
| AI tools | `lib/ai/tools/list-files/`, `upload-file/`, `read-file/` |
| Prompt | `PROMPT_FILES` in `lib/ai/chat-config.ts` |
| Env | `SEAWEEDFS_S3_*` in `.env.example` |

## Dashboard UI (Google Drive-like)

`components/dashboard/files/` is split into focused modules; the workspace
owns state + API calls, the rest are presentational:

| File | Responsibility |
|------|----------------|
| `files-workspace.tsx` | Orchestrator: folder nav, upload/rename/delete, toolbar (breadcrumb, search, sort, view toggle, "Baru" menu), drag-and-drop upload, dialogs |
| `file-utils.ts` | `getFileCategory`, `formatFileDate`/`formatFileDateShort`, `describeSize`, `sortItems`, `filterByName`, `SORT_OPTIONS` |
| `file-icon.tsx` | Type-aware colored icon by category (folder, pdf, image, video, audio, archive, code, spreadsheet, presentation, document) |
| `files-grid-view.tsx` | Grid/card view (default) |
| `files-list-view.tsx` | List view with sortable column headers (Nama, Diubah, Ukuran) |
| `file-item-menu.tsx` | Shared "more actions" dropdown (Buka / Unduh / Ganti nama / Hapus) used by both views |
| `file-item-context-menu.tsx` | Right-click context menu on a file/folder card or row |
| `files-blank-context-menu.tsx` | Right-click on empty space → Unggah file / Folder baru |
| `storage-meter.tsx` | Compact quota progress card |

Notes for agents:

- Folders always sort first; the user's sort key applies within each group.
- Search is local to the current folder (filters `files` by name); there is no search API.
- All UI text stays Bahasa Indonesia; status feedback uses `busy` + `busyLabel` ("Mengunggah…", "Menghapus…", dst).
- Upload trigger from the "Baru" dropdown uses `setTimeout(() => fileInputRef.click(), 0)` to avoid Radix focus-return canceling the file dialog.
- Right-click: per-item menu via `FileItemContextMenu` (Buka for folders, Unduh for files, Ganti nama, Hapus). Empty-area menu via `FilesBlankContextMenu` wrapping the content pane (Unggah file / Folder baru). Nested Radix context menus — item menu wins when right-clicking an item.
- Folder navigation is URL-driven via `?folder=<id>` so Back/Forward traverse folder history and folders are deep-linkable. `app/dashboard/files/page.tsx` is a server component that reads `searchParams.folder`, resolves it with `getFileById` (must be a folder owned by the user, else falls back to root), loads that folder's files + breadcrumb (`getBreadcrumb`), and passes `initialParentId` / `initialBreadcrumb` to the workspace. The workspace navigates with `router.push` (server re-render provides fresh props) and adopts the new folder via a during-render state guard (`prevParentId !== initialParentId`) — no effect, and `view`/`sort` prefs survive folder changes.

## Behavior agents must know

- Object key: `users/{userId}/{fileId}/{sanitizedName}`
- Browser upload: `POST upload-session` → client PUT to presigned URL → `POST confirm` (HeadObject → `ready`)
- AI `upload_file`: server-side PutObject; max **5 MiB**; distinct from `upload_drive_file`
- Soft-fail with `SEAWEEDFS_NOT_CONFIGURED` when env missing — Indonesian user messages
- Quota: `SUM(size_bytes)` where `status = ready` vs `USER_STORAGE_QUOTA_BYTES` (20 GiB)
- Isolation: all queries filter `userId`; no cross-user access; no unauthenticated download routes
- Do not confuse with Google Drive tools (`search_drive`, `read_drive_file`, `upload_drive_file`)
