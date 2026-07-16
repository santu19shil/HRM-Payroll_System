# TODO - Fix Admin UI issues

## Step 1: Locate 3-dot (ActionMenu) usage
- ✅ Found usage in `frontend/src/pages/admin/AdminDocuments.jsx` (ActionMenu is rendered in documents table rows inside the main page, not in the dashboard modal).

## Step 2: Diagnose why menu doesn’t appear in popup
- ⏳ Will fix generically in `frontend/src/components/ActionMenu.jsx` by preventing modal overlay click handlers from immediately closing the menu.

## Step 3: Fix Total Employees modal columns mismatch
- ⏳ Confirm current routed dashboard: `App.jsx` routes `/admin/dashboard` to `frontend/src/pages/admin/AdminDashboard.jsx`.
- ⏳ In `AdminDashboard.jsx`, `allEmployees` columns are already Department/Designation; issue suggests that UI expectation is different or modal is rendering a different `kind` than expected.

## Step 4: Implement fixes
- ⏳ Patch `ActionMenu.jsx` so when used inside a modal overlay/table it won't instantly close.
- ⏳ Add/adjust CSS for ActionMenu z-index vs modal overlay if needed.

## Step 5: Smoke test
- ⏳ Verify:
  - ⋮ menu opens in Documents screen.
  - ⋮ menu opens inside any dashboard popups.
  - Total Employees popup displays correct headers.

