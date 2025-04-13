const { execSync } = require('child_process');

try {
  console.log('Attempting to kill all server processes...');
  
  // Kill any process on port 5000
  try {
    console.log('Checking for processes on port 5000...');
    const findPIDCommand5000 = 'netstat -ano | findstr :5000';
    const result5000 = execSync(findPIDCommand5000, { encoding: 'utf8' });
    
    // Extract PIDs from the results
    const lines5000 = result5000.split('\n').filter(line => line.includes('LISTENING'));
    
    if (lines5000.length > 0) {
      // Multiple processes might be using the port in different ways
      const pids = new Set();
      
      lines5000.forEach(line => {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && !isNaN(parseInt(pid))) {
          pids.add(pid);
        }
      });
      
      // Kill all identified processes
      for (const pid of pids) {
        console.log(`Attempting to kill process with PID: ${pid}`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Successfully killed process ${pid}`);
        } catch (killError) {
          console.log(`Error killing process ${pid}: ${killError.message}`);
        }
      }
    } else {
      console.log('No process found listening on port 5000');
    }
  } catch (error) {
    console.log('No process found using port 5000 or unable to search for it');
  }
  
  // Kill any process on port 8000
  try {
    console.log('Checking for processes on port 8000...');
    const findPIDCommand8000 = 'netstat -ano | findstr :8000';
    const result8000 = execSync(findPIDCommand8000, { encoding: 'utf8' });
    
    // Extract PIDs from the results
    const lines8000 = result8000.split('\n').filter(line => line.includes('LISTENING'));
    
    if (lines8000.length > 0) {
      // Multiple processes might be using the port in different ways
      const pids = new Set();
      
      lines8000.forEach(line => {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && !isNaN(parseInt(pid))) {
          pids.add(pid);
        }
      });
      
      // Kill all identified processes
      for (const pid of pids) {
        console.log(`Attempting to kill process with PID: ${pid}`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Successfully killed process ${pid}`);
        } catch (killError) {
          console.log(`Error killing process ${pid}: ${killError.message}`);
        }
      }
    } else {
      console.log('No process found listening on port 8000');
    }
  } catch (error) {
    console.log('No process found using port 8000 or unable to search for it');
  }
  
  // Try to kill any node.js processes related to our app
  try {
    console.log('Attempting to kill all node.js processes for server.js and server-debug.js...');
    execSync('taskkill /F /IM node.exe', { stdio: 'ignore' });
    console.log('Killed all node processes');
  } catch (error) {
    console.log('No node processes found or unable to kill them');
  }
  
  console.log('Server cleanup complete. You can now start the server on port 5000');
} catch (error) {
  console.error('Error:', error.message);
} 