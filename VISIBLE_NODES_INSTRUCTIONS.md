# FIXED: Invisible Nodes & SSE Error

## 1. Nodes Now Visible
- The "Glass" material (`MeshPhysicalMaterial`) was reverted to `MeshStandardMaterial`.
- **Reason**: Glass materials require an HDRI Environment map to be visible. Without it, they render invisible/transparent.

## 2. SSE Error Fixed (CORS)
- Updated `backend/app/core/config.py` to allow ALL origins (`CORS_ORIGINS = ["*"]`).
- **Reason**: RESTRICTED CORS was blocking the SSE connection, causing the immediate `[SSE] Error`.

## REQUIRED ACTION
**Restart BACKEND Server:**
`Ctrl+C` -> `uvicorn app.main:app --reload` (or `python -m app.main`)

**Hard Refresh Browser:**
`Ctrl+Shift+R`

The nodes should now be visible and the connection stable.
