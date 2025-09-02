const { execWrapper } = require('../utils/exec-wrapper');

const GETRpcMetrics = (app, environement) => {
    app.get('/rpc-metrics', async (req, res) => {
        try {
            // Call localhost:8545/metrics to get RPC metrics
            const response = await fetch('http://localhost:8545/metrics');
            
            if (response.ok) {
                const metrics = await response.json();
                res.send({
                    success: true,
                    metrics: metrics
                });
            } else {
                res.send({
                    success: false,
                    error: `Failed to fetch metrics: HTTP ${response.status}`,
                    metrics: null
                });
            }
        } catch (error) {
            console.error('Error fetching RPC metrics:', error);
            res.send({
                success: false,
                error: error.message,
                metrics: null
            });
        }
    });
};

module.exports = {
    GETRpcMetrics
}; 