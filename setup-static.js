/**
 * setup-static.js
 * This script prepares the static files for production deployment.
 * It replaces template variables and ensures all assets are properly linked.
 */

const fs = require('fs');
const path = require('path');

// Helper to log with timestamps
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// Process an HTML file to replace template variables
function processHtmlFile(filePath, replacements) {
    log(`Processing: ${filePath}`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace all placeholders
        Object.entries(replacements).forEach(([key, value]) => {
            const regex = new RegExp(key, 'g');
            content = content.replace(regex, value);
        });
        
        // Write the processed file
        fs.writeFileSync(filePath, content, 'utf8');
        log(`Successfully processed: ${filePath}`);
        return true;
    } catch (err) {
        log(`Error processing ${filePath}: ${err.message}`);
        return false;
    }
}

// Create a proper index.html from template
function setupIndexHtml() {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (!fs.existsSync(indexPath)) {
        log(`ERROR: index.html not found at ${indexPath}`);
        return false;
    }
    
    const baseUrl = process.env.REACT_APP_API_URL || 'https://mbti-render.onrender.com';
    
    const replacements = {
        '%PUBLIC_URL%': baseUrl,
    };
    
    return processHtmlFile(indexPath, replacements);
}

// Copy the app-complete.html to index-prod.html in public
function setupAppComplete() {
    const sourcePath = path.join(__dirname, 'public', 'app-complete.html');
    const destPath = path.join(__dirname, 'public', 'index-prod.html');
    
    if (!fs.existsSync(sourcePath)) {
        log(`ERROR: app-complete.html not found at ${sourcePath}`);
        return false;
    }
    
    try {
        let content = fs.readFileSync(sourcePath, 'utf8');
        fs.writeFileSync(destPath, content, 'utf8');
        log(`Successfully copied app-complete.html to index-prod.html`);
        return true;
    } catch (err) {
        log(`Error copying app-complete.html: ${err.message}`);
        return false;
    }
}

// Create a fallback index.html file to handle direct navigation
function createFallbackHtml() {
    const fallbackPath = path.join(__dirname, 'public', 'fallback.html');
    const content = `<!DOCTYPE html>
<html>
<head>
    <title>HTML Snippet Builder</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="/styles.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="mb-5 text-center">
            <h1>HTML Snippet Builder</h1>
            <p class="lead">Create and manage HTML content with drag-and-drop functionality</p>
        </div>
        
        <div class="card mb-4">
            <div class="card-body">
                <h2>Getting Started</h2>
                <p>Click one of the buttons below to access the application:</p>
                <div class="d-grid gap-3">
                    <a href="/app" class="btn btn-primary">Launch Application</a>
                    <a href="/" class="btn btn-outline-secondary">Go to Home</a>
                </div>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-header">Login Credentials</div>
            <div class="card-body">
                <p><strong>Admin:</strong> eideken@hotmail.com / sword91</p>
                <p><strong>User:</strong> user@example.com / password123</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    try {
        fs.writeFileSync(fallbackPath, content, 'utf8');
        log(`Successfully created fallback.html`);
        return true;
    } catch (err) {
        log(`Error creating fallback.html: ${err.message}`);
        return false;
    }
}

// Update the server route handlers file if it exists
function updateServerRoutes() {
    // This function would update server-side route handlers if needed
    log('Skipping server routes update - not required for this deployment');
    return true;
}

// Main function to run all setup steps
async function main() {
    log('Starting static files setup for production...');
    
    const results = [
        setupIndexHtml(),
        setupAppComplete(),
        createFallbackHtml(),
        updateServerRoutes()
    ];
    
    const allSuccessful = results.every(result => result);
    if (allSuccessful) {
        log('✅ Static files setup completed successfully!');
    } else {
        log('⚠️ Static files setup completed with some errors.');
    }
}

// Execute the main function
main().catch(err => {
    log(`Fatal error: ${err.message}`);
    process.exit(1);
}); 