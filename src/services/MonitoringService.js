import axios from 'axios';

class MonitoringService {
    constructor() {
        this.healthCheckInterval = null;
        this.errorLogs = [];
        this.metrics = {
            snippetOperations: 0,
            pageOperations: 0,
            apiCalls: 0,
            errors: 0
        };
    }

    startMonitoring() {
        // Perform health checks every minute
        this.healthCheckInterval = setInterval(async () => {
            try {
                const health = await this.checkHealth();
                this.logMetric('health', health);

                // Alert if any issues
                if (!health.healthy) {
                    this.alertIssue('Health check failed', health);
                }
            } catch (error) {
                this.logError('Health check failed', error);
            }
        }, 60000);
    }

    stopMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
    }

    async checkHealth() {
        try {
            const response = await axios.get('/api/health');
            const { uptime, mongodb, timestamp } = response.data;

            return {
                healthy: mongodb === 'connected',
                uptime,
                timestamp,
                mongodb,
                memoryUsage: process.memoryUsage?.() || {}
            };
        } catch (error) {
            this.logError('Health check request failed', error);
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    trackOperation(type, details) {
        this.metrics[`${type}Operations`]++;
        this.logMetric(type, details);
    }

    logError(message, error) {
        const errorLog = {
            timestamp: new Date(),
            message,
            error: error.message,
            stack: error.stack
        };

        this.errorLogs.push(errorLog);
        this.metrics.errors++;

        // Keep only last 100 errors
        if (this.errorLogs.length > 100) {
            this.errorLogs.shift();
        }

        // Alert if error rate is high
        if (this.metrics.errors > 10) {
            this.alertIssue('High error rate detected', {
                errorCount: this.metrics.errors,
                recentErrors: this.errorLogs.slice(-5)
            });
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error(errorLog);
        }
    }

    logMetric(type, data) {
        const metric = {
            timestamp: new Date(),
            type,
            data
        };

        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
            this.sendToMonitoringService(metric);
        }
    }

    async sendToMonitoringService(data) {
        try {
            // Replace with your actual monitoring service endpoint
            await axios.post('/api/monitoring', data);
        } catch (error) {
            console.error('Failed to send metric to monitoring service:', error);
        }
    }

    alertIssue(message, data) {
        const alert = {
            timestamp: new Date(),
            message,
            data
        };

        // In production, send to alert service
        if (process.env.NODE_ENV === 'production') {
            this.sendAlert(alert);
        } else {
            console.warn('ALERT:', alert);
        }
    }

    async sendAlert(alert) {
        try {
            // Replace with your actual alert service endpoint
            await axios.post('/api/alerts', alert);
        } catch (error) {
            console.error('Failed to send alert:', error);
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            errorLogs: this.errorLogs,
            timestamp: new Date()
        };
    }
}

export const monitoring = new MonitoringService();
export default monitoring; 