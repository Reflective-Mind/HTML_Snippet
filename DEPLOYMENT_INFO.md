# DEPLOYMENT INSTRUCTIONS

## **IMPORTANT: DEPLOYMENT BRANCH**

**ALWAYS DEPLOY TO THE `html-viewer-new` BRANCH.**

Do NOT push to `master` or `main` for production deployment. The Render service is configured to build from `html-viewer-new`.

### How to Deploy
1. Ensure you are on the `html-viewer-new` branch:
   ```bash
   git checkout html-viewer-new
   ```

2. Merge changes from `master` (if you developed there):
   ```bash
   git merge master
   ```

3. Push to GitHub:
   ```bash
   git push origin html-viewer-new
   ```

4. (Optional) Trigger Deploy Hook manually if needed:
   ```bash
   curl "https://api.render.com/deploy/srv-cummcj5ds78s73ensplg?key=y7a-oqfH4Uw"
   ```

## Repository Info
- **Repo:** https://github.com/Reflective-Mind/HTML_Snippet
- **Production Branch:** `html-viewer-new`

