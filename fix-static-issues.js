/**
 * fix-static-issues.js
 * This script fixes common static file issues for deployment
 */

const fs = require('fs');
const path = require('path');

// Helper to log with timestamps
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// Create basic static files
function createStaticFiles() {
    log('Creating essential static files...');
    
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        log('Created public directory');
    }
    
    // Create favicon.ico
    const faviconPath = path.join(publicDir, 'favicon.ico');
    log('Creating favicon.ico...');
    // Create a simple 1x1 pixel favicon placeholder
    try {
        fs.writeFileSync(faviconPath, 'placeholder');
        log('Created favicon.ico successfully');
    } catch (err) {
        log(`Error creating favicon.ico: ${err.message}`);
    }
    
    // Create logo192.png
    const logoPath = path.join(publicDir, 'logo192.png');
    log('Creating logo192.png...');
    // Create a simple 1x1 pixel PNG placeholder
    try {
        fs.writeFileSync(logoPath, 'placeholder');
        log('Created logo192.png successfully');
    } catch (err) {
        log(`Error creating logo192.png: ${err.message}`);
    }
    
    // Create a simple manifest.json if it doesn't exist
    const manifestPath = path.join(publicDir, 'manifest.json');
    log('Creating manifest.json...');
    const manifestContent = `{
  "short_name": "HTML Snippet Builder",
  "name": "HTML Snippet Builder",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}`;
    try {
        fs.writeFileSync(manifestPath, manifestContent);
        log('Created manifest.json successfully');
    } catch (err) {
        log(`Error creating manifest.json: ${err.message}`);
    }
    
    // Create a simple styles.css if it doesn't exist
    const stylesPath = path.join(publicDir, 'styles.css');
    log('Creating styles.css...');
    const basicCss = `
/* Basic styles for HTML Snippet Builder */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
}

.app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.content-area {
    flex: 1;
    padding: 20px;
    position: relative;
}

.snippet-container {
    position: absolute;
    border: 1px solid transparent;
    background: transparent;
    display: inline-block;
    overflow: hidden;
}

.snippet-container:hover {
    border-color: #0d6efd;
}

.snippet-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.snippet-controls {
    position: absolute;
    top: 5px;
    right: 5px;
    display: flex;
    gap: 5px;
    z-index: 100;
    opacity: 0;
    transition: opacity 0.2s;
}

.snippet-container:hover .snippet-controls {
    opacity: 1;
}

.preview-mode .snippet-controls {
    display: none;
}
`;
    try {
        fs.writeFileSync(stylesPath, basicCss);
        log('Created styles.css successfully');
    } catch (err) {
        log(`Error creating styles.css: ${err.message}`);
    }
    
    // Fix path in index.html
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        log('Fixing paths in index.html...');
        try {
            let indexContent = fs.readFileSync(indexPath, 'utf8');
            
            // Replace any %PUBLIC_URL% references
            indexContent = indexContent.replace(/%PUBLIC_URL%\//g, '/');
            
            // Ensure app.js is included
            if (!indexContent.includes('src="/app.js"')) {
                indexContent = indexContent.replace(
                    '</body>',
                    '    <script src="/app.js"></script>\n</body>'
                );
            }
            
            fs.writeFileSync(indexPath, indexContent);
            log('Fixed index.html paths successfully');
        } catch (err) {
            log(`Error fixing index.html: ${err.message}`);
        }
    }
}

// Main function
async function main() {
    log('Starting static file fixes...');
    
    try {
        createStaticFiles();
        log('✅ Static file fixes completed successfully');
    } catch (err) {
        log(`❌ Error during static file fixes: ${err.message}`);
    }
}

// Run the main function
main().catch(err => {
    log(`Fatal error: ${err.message}`);
    process.exit(1);
}); 