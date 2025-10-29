const getDownloadSnapshotProgress = (app) => {
    app.get('/download-snapshot/progress', (req, res) => {
        const progress = app.locals.snapshotDownloadProgress;

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
            filename = null,
            error = undefined
        } = progress;

        let percent = null;
        if (typeof totalBytes === 'number' && totalBytes > 0) {
            percent = Math.min(100, (downloadedBytes / totalBytes) * 100);
        }

        return res.json({
            status,
            stage,
            downloadedBytes,
            totalBytes,
            speedBps,
            percent,
            startedAt,
            updatedAt,
            filename,
            error
        });
    });
};

module.exports = {
    getDownloadSnapshotProgress
};
