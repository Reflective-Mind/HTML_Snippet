const { execSync } = require('child_process');

try {
  console.log('👀 Attempting to kill all processes on port 5000...');
  
  try {
    console.log('🔍 Finding processes on port 5000...');
    
    // On Windows, we need to use different commands
    const findCommand = 'netstat -ano | findstr :5000';
    console.log('Running command:', findCommand);
    
    const result = execSync(findCommand, { encoding: 'utf8' });
    console.log('Command result:', result);
    
    const lines = result.split('\n')
      .filter(line => line.includes('LISTENING'))
      .map(line => line.trim().split(/\s+/).pop())
      .filter(pid => pid && !isNaN(parseInt(pid)));
    
    if (lines.length > 0) {
      console.log(`✅ Found ${lines.length} processes using port 5000`);
      
      // Kill each process
      for (const pid of lines) {
        try {
          console.log(`🔫 Killing process with PID: ${pid}`);
          const killCmd = `taskkill /F /PID ${pid}`;
          console.log('Running command:', killCmd);
          
          execSync(killCmd);
          console.log(`✅ Successfully killed process ${pid}`);
        } catch (killError) {
          console.log(`❌ Error killing process ${pid}: ${killError.message}`);
          
          // Try alternative method if the first one fails
          try {
            console.log('Attempting alternative kill method...');
            execSync(`taskkill /F /PID ${pid} /T`);
            console.log(`✅ Successfully killed process ${pid} with alternative method`);
          } catch (altKillError) {
            console.log(`❌ Alternative kill method also failed: ${altKillError.message}`);
          }
        }
      }
      
      // Verify port is free now
      try {
        console.log('🔍 Verifying port 5000 is now free...');
        execSync('netstat -ano | findstr :5000', { encoding: 'utf8' });
        console.log('⚠️ Warning: Port 5000 might still be in use. Attempting to kill processes again...');
        
        // One more aggressive attempt to kill any remaining processes
        execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :5000 ^| findstr LISTENING\') do taskkill /F /PID %a', { shell: true });
      } catch (verifyError) {
        // If this errors, it means nothing was found, which is good
        console.log('✅ Port 5000 is now free!');
      }
      
    } else {
      console.log('✅ No processes found listening on port 5000');
    }
  } catch (error) {
    console.log('ℹ️ No process found using port 5000 or unable to search for it');
    console.log('Error details:', error.message);
  }
  
  console.log('✅ Port cleanup complete. You can now start the server on port 5000.');
} catch (error) {
  console.error('❌ Error:', error.message);
} 