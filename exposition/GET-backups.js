const { listBackups } = require('../application/listBackups');

const GETBackups = (app, environement) => {
    app.get('/get-backups', async (req, res) => {
        try {
            const result = await listBackups(app);
            
            if (result.success) {
                const transformedBackups = result.backups.map(backup => {
                    const match = backup.filename.match(/snapshot_(\d+)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.tar\.gz/);
                    if (match) {
                        const [, blockId, dateTime] = match;
                        const [date, time] = dateTime.split('_');
                        const formattedDateTime = `${date} ${time.replace(/-/g, ':')}`;
                        
                        return {
                            filename: backup.filename,
                            blockId: backup.blockHeight || parseInt(blockId),
                            date: date,
                            time: time.replace(/-/g, ':'),
                            formattedDateTime: formattedDateTime,
                            fullPath: backup.path,
                            size: backup.size
                        };
                    }
                    return null;
                }).filter(backup => backup !== null);
                
                res.json({ success: true, backups: transformedBackups });
            } else {
                res.status(500).json({ success: false, error: result.error });
            }
        } catch (error) {
            console.error('Error loading backups:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    GETBackups
}; 