const getSetupNodeFromBackupProgress = (app) => {
    app.get('/setup-node-from-backup/progress', (req, res) => {
        const progress = app.locals.setupNodeFromBackupProgress;

        if (!progress) {
            return res.json({
                status: 'idle'
            });
        }

        const {
            status = 'idle',
            stage = null,
            downloadedBytes = 0,
            totalBytes = null,
            speedBps = 0,
            startedAt = null,
            updatedAt = Date.now(),
            error = undefined
        } = progress;

        let percent = null;
        if (typeof totalBytes === 'number' && totalBytes > 0) {
            percent = Math.min(100, (downloadedBytes / totalBytes) * 100);
        }

        res.json({
            status,
            stage,
            downloadedBytes,
            totalBytes,
            speedBps,
            percent,
            startedAt,
            updatedAt,
            error
        });
    });
};

module.exports = {
    getSetupNodeFromBackupProgress
};
