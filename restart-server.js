const { execSync } = require('child_process');
const { spawn } = require('child_process');
const path = require('path');

// Get the current directory
const currentDir = __dirname;
console.log('Current directory:', currentDir);

try {
    console.log('Attempting to restart server...');
    
    // Kill any existing processes on port 5000
    try {
        console.log('Checking for processes on port 5000...');
        const findPIDCommand = 'netstat -ano | findstr :5000';
        const result = execSync(findPIDCommand, { encoding: 'utf8' });
        
        // Extract PID from the result
        const lines = result.split('\n').filter(line => line.includes('LISTENING'));
        if (lines.length > 0) {
            const pid = lines[0].trim().split(/\s+/).pop();
            console.log(`Found process with PID: ${pid}`);
            
            try {
                // Kill the process
                execSync(`taskkill /F /PID ${pid}`);
                console.log(`Successfully killed process ${pid}`);
            } catch (killError) {
                console.log(`Error killing process: ${killError.message}`);
            }
        } else {
            console.log('No process found listening on port 5000');
        }
    } catch (error) {
        console.log('No process found using port 5000 or unable to kill it');
    }
    
    // Start the server
    console.log('Starting the server...');
    
    // Use spawn to run the server in the background
    const server = spawn('node', ['server.js'], {
        cwd: currentDir,
        stdio: 'inherit',
        detached: true
    });
    
    // Unref to allow the parent process to exit independently
    server.unref();
    
    console.log('Server started successfully!');
    console.log('Server should be available at http://localhost:5000');
    
} catch (error) {
    console.error('Error restarting server:', error.message);
} 