# Deployment Process for mbti-render.onrender.com

## Quick Deployment Steps

After making any changes to the HTML viewer:

1. **Commit changes to html-viewer-new branch:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin html-viewer-new
   ```

2. **Merge to master and push for Render deployment:**
   ```bash
   git checkout master
   git merge html-viewer-new
   git push origin master --force-with-lease
   git checkout html-viewer-new
   ```

3. **Render will auto-deploy** (if autoDeploy: true is set in render.yaml)

## Important Notes

- Render deploys from the `master` branch
- Always push to both `html-viewer-new` (for development) and `master` (for production)
- The service name is `mbti-render` (configured in render.yaml)
- URL: https://mbti-render.onrender.com/

## Files That Affect Deployment

- `public/index.html` - Main HTML viewer interface
- `public/app.js` - Viewer functionality and iframe rendering
- `server.js` - Express server
- `render.yaml` - Render deployment configuration

