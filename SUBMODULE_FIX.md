# Fix: "No url found for submodule path 'src/mobile_app' in .gitmodules"

The build fails because the **GitHub repo** has a Git submodule reference to `src/mobile_app` but no valid URL. Remove that reference so the build can clone the repo without submodules.

## Option A: Fix from a clone of the GitHub repo (recommended)

1. **Clone the repo that’s failing to build** (use the same repo URL as in your build):

   ```bash
   git clone https://github.com/mailtogowthamsk-dotcom/digital-house-mobile.git
   cd digital-house-mobile
   ```

2. **Remove the broken submodule** (run from repo root):

   ```bash
   # If .gitmodules exists, deinit and remove the submodule
   git submodule deinit -f src/mobile_app 2>/dev/null || true
   git rm -f src/mobile_app 2>/dev/null || true

   # Remove the submodule entry from .gitmodules (if the file exists)
   # If .gitmodules only had this one submodule, delete the file:
   rm -f .gitmodules

   # If there was a gitlink (submodule) in the index, remove it
   git rm --cached src/mobile_app 2>/dev/null || true

   git status
   ```

3. **Commit and push**:

   ```bash
   git add -A
   git commit -m "Remove broken submodule src/mobile_app"
   git push origin main
   ```

4. **Re-run the build** on Netlify/your CI; it should get past "preparing repo".

## Option B: If this repo is the monorepo (backend + frontend + mobile)

If `digital-house-mobile` on GitHub is actually the **whole project** (with `backend/`, `frontend/`, `mobile/`), then your local folder might be that monorepo and the GitHub repo might have an old/broken submodule. In that case:

1. In your **local** monorepo (DigitalHouse with backend, frontend, mobile):

   ```bash
   cd /path/to/DigitalHouse   # or wherever your repo is
   git submodule deinit -f src/mobile_app 2>/dev/null || true
   git rm -f src/mobile_app 2>/dev/null || true
   rm -f .gitmodules
   git rm --cached src/mobile_app 2>/dev/null || true
   git add -A
   git commit -m "Remove broken submodule src/mobile_app"
   git push origin main
   ```

2. Make sure you’re pushing to the **same** GitHub repo that the build is using (`mailtogowthamsk-dotcom/digital-house-mobile`).

## After fixing

- The build should no longer fail with "No url found for submodule path 'src/mobile_app'".
- If your app code lives under `mobile/` (not `src/mobile_app`), ensure the build is configured to use the **root** or **mobile** as the base directory, not `src/mobile_app`.
