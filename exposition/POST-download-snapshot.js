const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const sanitizeFilename = (name) => {
    if (!name || typeof name !== 'string') {
        return null;
    }
    return path.basename(name).replace(/[^\w.\-]/g, '_');
};

const downloadSnapshot = (app, environement) => {
    app.post('/download-snapshot', async (req, res) => {
        const { headerUrl, downloadUrl, filename, overwrite = false } = req.body || {};

        if (!headerUrl && (!downloadUrl || !filename)) {
            return res.status(400).json({
                success: false,
                error: 'headerUrl or (downloadUrl and filename) are required'
            });
        }

        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const backupsDir = path.join(homeDirectory, 'backups');

            if (!fs.existsSync(backupsDir)) {
                fs.mkdirSync(backupsDir, { recursive: true });
            }

            const initialFilename = sanitizeFilename(filename);
            const progressState = {
                status: 'initializing',
                stage: 'prepare',
                downloadedBytes: 0,
                totalBytes: null,
                speedBps: 0,
                filename: initialFilename,
                startedAt: Date.now(),
                updatedAt: Date.now(),
                error: null
            };

            app.locals.snapshotDownloadProgress = progressState;

            const clearProgressLater = () => {
                setTimeout(() => {
                    if (app.locals.snapshotDownloadProgress === progressState) {
                        app.locals.snapshotDownloadProgress = null;
                    }
                }, 5 * 60 * 1000);
            };

            let metadata = {};

            if (headerUrl) {
                try {
                    progressState.status = 'fetching-header';
                    progressState.stage = 'header';
                    progressState.updatedAt = Date.now();

                    console.log('[download-snapshot] Fetching header:', headerUrl);
                    const headerResponse = await fetch(headerUrl);
                    if (!headerResponse.ok) {
                        progressState.status = 'error';
                        progressState.error = `Failed to download header file: ${headerResponse.statusText}`;
                        progressState.updatedAt = Date.now();
                        clearProgressLater();
                        return res.status(400).json({
                            success: false,
                            error: progressState.error
                        });
                    }
                    metadata = await headerResponse.json();
                } catch (headerError) {
                    progressState.status = 'error';
                    progressState.error = `Failed to download header file: ${headerError.message}`;
                    progressState.updatedAt = Date.now();
                    clearProgressLater();
                    return res.status(400).json({
                        success: false,
                        error: progressState.error
                    });
                }
            }

            const finalDownloadUrl = metadata.downloadUrl || downloadUrl;
            const finalFilename = sanitizeFilename(metadata.filename || filename);

            progressState.filename = finalFilename;

            if (!finalDownloadUrl || !finalFilename) {
                progressState.status = 'error';
                progressState.error = 'Snapshot metadata is incomplete: missing downloadUrl or filename';
                progressState.updatedAt = Date.now();
                clearProgressLater();
                return res.status(400).json({
                    success: false,
                    error: progressState.error
                });
            }

            const targetPath = path.join(backupsDir, finalFilename);

            if (fs.existsSync(targetPath) && !overwrite) {
                progressState.status = 'error';
                progressState.error = 'A backup with this filename already exists';
                progressState.updatedAt = Date.now();
                clearProgressLater();
                return res.status(409).json({
                    success: false,
                    error: progressState.error
                });
            }

            console.log('[download-snapshot] Downloading snapshot:', finalDownloadUrl);

            const snapshotResponse = await fetch(finalDownloadUrl);
            if (!snapshotResponse.ok || !snapshotResponse.body) {
                progressState.status = 'error';
                progressState.stage = 'download';
                progressState.error = `Failed to download snapshot: ${snapshotResponse.statusText}`;
                progressState.updatedAt = Date.now();
                clearProgressLater();
                return res.status(400).json({
                    success: false,
                    error: progressState.error
                });
            }

            const contentLengthHeader = snapshotResponse.headers.get('content-length');
            const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;

            if (Number.isFinite(contentLength)) {
                progressState.totalBytes = contentLength;
            } else if (typeof metadata.fileSize === 'number' && metadata.fileSize > 0) {
                progressState.totalBytes = metadata.fileSize;
            }

            progressState.status = 'downloading';
            progressState.stage = 'download';
            progressState.downloadedBytes = 0;
            progressState.speedBps = 0;
            progressState.startedAt = Date.now();
            progressState.updatedAt = Date.now();

            const tempPath = `${targetPath}.download`;
            const writableStream = fs.createWriteStream(tempPath);

            const readableStream = snapshotResponse.body
                ? (typeof snapshotResponse.body.getReader === 'function'
                    ? Readable.fromWeb(snapshotResponse.body)
                    : snapshotResponse.body)
                : null;

            if (!readableStream || typeof readableStream.on !== 'function') {
                progressState.status = 'error';
                progressState.stage = 'download';
                progressState.error = 'Snapshot stream is not readable.';
                progressState.updatedAt = Date.now();
                clearProgressLater();
                return res.status(400).json({
                    success: false,
                    error: progressState.error
                });
            }

            let lastBytes = 0;
            let lastLogTime = Date.now();

            readableStream.on('data', (chunk) => {
                const now = Date.now();
                progressState.downloadedBytes += chunk.length;

                const bytesDelta = progressState.downloadedBytes - lastBytes;
                const timeDelta = (now - lastLogTime) / 1000;
                if (timeDelta > 0 && bytesDelta >= 0) {
                    progressState.speedBps = bytesDelta / timeDelta;
                }

                lastBytes = progressState.downloadedBytes;
                lastLogTime = now;
                progressState.updatedAt = now;
            });

            try {
                await pipeline(readableStream, writableStream);
            } catch (streamError) {
                progressState.status = 'error';
                progressState.stage = 'download';
                progressState.error = `Stream error: ${streamError.message}`;
                progressState.updatedAt = Date.now();
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                clearProgressLater();
                throw streamError;
            }

            progressState.status = 'finalizing';
            progressState.stage = 'finalize';
            progressState.speedBps = 0;
            progressState.updatedAt = Date.now();

            try {
                fs.renameSync(tempPath, targetPath);
            } catch (renameError) {
                progressState.status = 'error';
                progressState.stage = 'finalize';
                progressState.error = `Failed to finalize snapshot: ${renameError.message}`;
                progressState.updatedAt = Date.now();
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                clearProgressLater();
                throw renameError;
            }

            const stats = fs.statSync(targetPath);

            progressState.status = 'completed';
            progressState.stage = 'completed';
            progressState.downloadedBytes = stats.size;
            progressState.speedBps = 0;
            progressState.updatedAt = Date.now();

            console.log(`[download-snapshot] Snapshot saved: ${targetPath} (${stats.size} bytes)`);

            clearProgressLater();

            return res.json({
                success: true,
                message: 'Snapshot downloaded successfully',
                backup: {
                    filename: finalFilename,
                    path: targetPath,
                    size: stats.size,
                    blockId: metadata.blockId,
                    uploadedAt: metadata.uploadedAt,
                    description: metadata.description
                }
            });
        } catch (error) {
            console.error('[download-snapshot] Error:', error);

            if (app.locals.snapshotDownloadProgress) {
                app.locals.snapshotDownloadProgress.status = 'error';
                app.locals.snapshotDownloadProgress.stage = 'error';
                app.locals.snapshotDownloadProgress.error = error.message;
                app.locals.snapshotDownloadProgress.updatedAt = Date.now();
                setTimeout(() => {
                    if (app.locals.snapshotDownloadProgress && app.locals.snapshotDownloadProgress.error === error.message) {
                        app.locals.snapshotDownloadProgress = null;
                    }
                }, 5 * 60 * 1000);
            }

            return res.status(500).json({
                success: false,
                error: `Internal server error: ${error.message}`
            });
        }
    });
};

module.exports = {
    downloadSnapshot
};
