const fs = require('fs');
const path = require('path');

const POSTSettings = (app, environement) => {
    app.post('/post-settings', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const settingsPath = path.join(homeDirectory, 'settings.json');
            
            let settings = {};
            if (fs.existsSync(settingsPath)) {
                settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }

            Object.keys(req.body).forEach(key => {
                settings[key] = req.body[key];
            });
            
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            
            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    POSTSettings
}; 