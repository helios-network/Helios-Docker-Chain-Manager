const { execWrapper } = require('../utils/exec-wrapper');

const removePeer = async (app, environement, req, res) => {
    app.post('/remove-peer', async (req, res) => {
        try {
            const { peerAddress } = req.body;
    
            if (!peerAddress) {
                return res.json({
                    success: false,
                    error: 'Peer address is required'
                });
            }
    
            const success = await app.node.removePeer(peerAddress);
    
            if (success) {
                res.json({
                    success: true,
                    message: `Peer ${peerAddress} removed successfully`
                });
            } else {
                res.json({
                    success: false,
                    error: 'Failed to remove peer'
                });
            }
        } catch (error) {
            console.error('Error removing peer:', error);
            res.json({
                success: false,
                error: error.message
            });
        }
    });
};

module.exports = {
    removePeer
}; 