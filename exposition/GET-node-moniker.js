const GETNodeMoniker = (app, environement) => {
    app.get('/node-moniker', async (req, res) => {
        try {
            const moniker = await app.node.getMoniker();

            if (!moniker) {
                return res.status(404).json({
                    success: false,
                    error: 'Node moniker not found'
                });
            }

            res.json({
                success: true,
                moniker: moniker.trim()
            });
        } catch (error) {
            console.error('Error retrieving node moniker:', error);
            res.status(500).json({
                success: false,
                error: 'Unable to retrieve node moniker'
            });
        }
    });
};

module.exports = {
    GETNodeMoniker
};
