const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Configuration
const config = {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:10000',
    checkInterval: 60000, // 1 minute
    alertThresholds: {
        errorRate: 10,
        responseTime: 2000,
        memoryUsage: 0.9 // 90% of available memory
    }
};

// Monitoring state
let state = {
    lastCheck: null,
    consecutiveFailures: 0,
    metrics: {
        uptime: 0,
        responseTime: [],
        errorCount: 0,
        requestCount: 0
    }
};

// Helper functions
const calculateAverageResponseTime = () => {
    if (state.metrics.responseTime.length === 0) return 0;
    const sum = state.metrics.responseTime.reduce((a, b) => a + b, 0);
    return sum / state.metrics.responseTime.length;
};

const checkMemoryUsage = () => {
    const used = process.memoryUsage();
    const usedPercent = used.heapUsed / used.heapTotal;
    
    if (usedPercent > config.alertThresholds.memoryUsage) {
        logger.warn('High memory usage detected', {
            usedPercent,
            heapUsed: used.heapUsed,
            heapTotal: used.heapTotal
        });
    }

    return usedPercent;
};

// Main health check function
async function performHealthCheck() {
    const startTime = Date.now();
    
    try {
        // Check API health
        const response = await axios.get(`${config.apiUrl}/api/health`);
        const responseTime = Date.now() - startTime;

        // Update metrics
        state.metrics.responseTime.push(responseTime);
        if (state.metrics.responseTime.length > 100) {
            state.metrics.responseTime.shift();
        }
        state.metrics.requestCount++;
        state.lastCheck = new Date();
        state.consecutiveFailures = 0;

        // Check response time
        if (responseTime > config.alertThresholds.responseTime) {
            logger.warn('Slow response time detected', {
                responseTime,
                threshold: config.alertThresholds.responseTime
            });
        }

        // Check MongoDB status
        if (response.data.mongodb !== 'connected') {
            logger.error('MongoDB connection issue detected', {
                status: response.data.mongodb
            });
        }

        // Log metrics
        logger.info('Health check completed', {
            status: response.data.status,
            responseTime,
            averageResponseTime: calculateAverageResponseTime(),
            memoryUsage: checkMemoryUsage(),
            metrics: response.data.metrics
        });

        // Check error rate
        if (response.data.metrics.errors > config.alertThresholds.errorRate) {
            logger.error('High error rate detected', {
                errorCount: response.data.metrics.errors,
                threshold: config.alertThresholds.errorRate
            });
        }

    } catch (error) {
        state.consecutiveFailures++;
        state.metrics.errorCount++;

        logger.error('Health check failed', {
            error: error.message,
            consecutiveFailures: state.consecutiveFailures
        });

        // Alert on consecutive failures
        if (state.consecutiveFailures >= 3) {
            logger.error('Service may be down', {
                consecutiveFailures: state.consecutiveFailures,
                lastError: error.message
            });

            // Here you could add code to send alerts via email, SMS, etc.
        }
    }
}

// Start monitoring
async function startMonitoring() {
    logger.info('Starting monitoring service', {
        apiUrl: config.apiUrl,
        checkInterval: config.checkInterval
    });

    // Perform initial check
    await performHealthCheck();

    // Schedule regular checks
    setInterval(performHealthCheck, config.checkInterval);
}

// Handle process termination
process.on('SIGTERM', () => {
    logger.info('Monitoring service shutting down');
    process.exit(0);
});

// Start the monitoring
startMonitoring().catch(error => {
    logger.error('Failed to start monitoring', {
        error: error.message
    });
    process.exit(1);
}); 