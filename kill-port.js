const { execSync } = require('child_process');

try {
  console.log('Attempting to kill processes on port 5000...');
  
  try {
    console.log('Finding processes on port 5000...');
    // On Windows
    const result = execSync('netstat -ano | findstr :5000', { encoding: 'utf8' });
    
    const lines = result.split('\n')
      .filter(line => line.includes('LISTENING'))
      .map(line => line.trim().split(/\s+/).pop())
      .filter(pid => pid && !isNaN(parseInt(pid)));
    
    if (lines.length > 0) {
      console.log(`Found ${lines.length} processes using port 5000`);
      
      // Kill each process
      lines.forEach(pid => {
        try {
          console.log(`Killing process with PID: ${pid}`);
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Successfully killed process ${pid}`);
        } catch (killError) {
          console.log(`Error killing process ${pid}: ${killError.message}`);
        }
      });
      
      console.log('All processes killed. Port 5000 should be free now.');
    } else {
      console.log('No processes found listening on port 5000');
    }
  } catch (error) {
    console.log('No process found using port 5000 or unable to search for it');
  }
  
  console.log('Port cleanup complete. You can now start the server on port 5000.');
} catch (error) {
  console.error('Error:', error.message);
} 