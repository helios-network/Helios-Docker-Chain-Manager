const fs = require('fs');
const path = require('path');

const GETSettings = (app, environement) => {
    app.get('/get-settings', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const settingsPath = path.join(homeDirectory, 'settings.json');
            
            let settings = {
                dumpCommitDebugExecutionTrace: true
            };
            
            if (fs.existsSync(settingsPath)) {
                const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                settings = { ...settings, ...savedSettings };
            }
            
            res.json({ success: true, settings });
        } catch (error) {
            console.error('Error loading settings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    GETSettings
}; 