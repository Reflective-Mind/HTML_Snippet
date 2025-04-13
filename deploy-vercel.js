const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the current directory
const currentDir = process.cwd();
console.log('Current directory:', currentDir);

try {
    console.log('Starting Vercel deployment process...');
    
    // Check if vercel CLI is installed
    try {
        execSync('vercel --version', { stdio: 'pipe' });
        console.log('Vercel CLI is installed ✅');
    } catch (error) {
        console.log('Vercel CLI not found, installing it globally...');
        execSync('npm install -g vercel', { stdio: 'inherit' });
    }
    
    // Make sure we're logged in
    try {
        console.log('Checking Vercel authentication...');
        // This just checks if we're logged in, doesn't actually log in
        execSync('vercel whoami', { stdio: 'pipe' });
        console.log('Already logged in to Vercel ✅');
    } catch (error) {
        console.log('Not logged in to Vercel, launching login flow...');
        execSync('vercel login', { stdio: 'inherit' });
    }
    
    // Check for .vercel directory to determine if project is already linked
    const vercelDirPath = path.join(currentDir, '.vercel');
    const isVercelProject = fs.existsSync(vercelDirPath);
    
    if (isVercelProject) {
        console.log('Project is already linked to Vercel ✅');
    } else {
        console.log('Project not linked to Vercel, running setup...');
        // This will interactively set up the project
        execSync('vercel', { stdio: 'inherit' });
    }
    
    // Deploy to production
    console.log('Deploying to production...');
    execSync('vercel --prod', { stdio: 'inherit' });
    
    console.log('\n✅ Deployment complete! Your site should be live on Vercel.');
    console.log('You can view your deployments at: https://vercel.com/dashboard');
    
} catch (error) {
    console.error('Error during deployment:', error.message);
} 