# 🚀 DEPLOYMENT PROCESS FOR mbti-render.onrender.com

## ⚡ QUICK DEPLOYMENT COMMANDS

**ALWAYS RUN THESE AFTER MAKING CHANGES:**

```bash
# 1. Commit to development branch
git add .
git commit -m "Description of changes"
git push origin html-viewer-new

# 2. Deploy to production (master branch for Render)
git checkout master
git merge html-viewer-new
git push origin master --force-with-lease
git checkout html-viewer-new
```

## 📋 DEPLOYMENT CHECKLIST

- [ ] Changes committed to `html-viewer-new`
- [ ] Changes pushed to `html-viewer-new`
- [ ] Merged to `master` branch
- [ ] Pushed to `master` branch
- [ ] Render auto-deploys (takes 2-5 minutes)

## 🔗 IMPORTANT INFO

- **Service Name:** `mbti-render` (in render.yaml)
- **Production URL:** https://mbti-render.onrender.com/
- **Render Branch:** `master` (auto-deploys when pushed)
- **Development Branch:** `html-viewer-new`

## 📁 KEY FILES

- `public/index.html` - Main HTML viewer interface
- `public/app.js` - Viewer functionality and iframe rendering
- `server.js` - Express server
- `render.yaml` - Render deployment configuration

## ⚠️ REMEMBER

**ALWAYS push to master after making changes!** This ensures Render deploys the latest version.

