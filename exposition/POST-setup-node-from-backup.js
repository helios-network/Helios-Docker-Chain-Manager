const fs = require('fs');
const { fileGetContent } = require('../utils/file-get-content');
const path = require('path');
const { setupNodeFromBackup } = require('../application/setupNodeFromBackup');
const { execWrapper } = require('../utils/exec-wrapper');
const { downloadToFile } = require('../utils/download-to-file');

const unrot13 = str => str.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 13))
    .join('');

const setupNodeFromBackupEndpoint = (app, environment) => {
    app.post('/setup-node-from-backup', async (req, res) => {
        try {
            const keyStoreNode = req.body['keyStoreNode'];
            const passwordCrypted = req.body['password'];
            const headerUrl = req.body['headerUrl'];
            const moniker = req.body['moniker'];
            const chainId = req.body['chainId'];
            const mode = req.body['mode'] == undefined ? "archive" : req.body['mode'];

            const progressState = {
                status: 'initializing',
                stage: 'validate',
                downloadedBytes: 0,
                totalBytes: null,
                speedBps: 0,
                startedAt: Date.now(),
                updatedAt: Date.now()
            };
            app.locals.setupNodeFromBackupProgress = progressState;

            const homeDirectory = await app.actions.getHomeDirectory.use();
            const tempDir = path.join(homeDirectory, 'backup-temp');

            if (fs.existsSync(tempDir)) {
                await execWrapper(`rm -rf ${tempDir}`);
            }
            fs.mkdirSync(tempDir, { recursive: true });

            try {
                progressState.status = 'validating';
                progressState.stage = 'validate';
                progressState.updatedAt = Date.now();

                const headerContent = await fileGetContent(headerUrl);
                const headerData = JSON.parse(headerContent.toString());
                
                if (!headerData.downloadUrl) {
                    throw new Error('Invalid backup header file - missing downloadUrl');
                }

                // Clean up URL that might have double https:// protocol
                const cleanDownloadUrl = headerData.downloadUrl.replace(/^https:\/\/https:\/\//, 'https://');

                console.log('[SetupNodeFromBackup] Header data parsed:', {
                    filename: headerData.filename,
                    downloadUrl: headerData.downloadUrl,
                    fileSize: headerData.fileSize,
                    hasHeaders: !!(headerData.headers || headerData.downloadHeaders)
                });
                if (typeof headerData.fileSize === 'number' && headerData.fileSize > 0) {
                    progressState.totalBytes = headerData.fileSize;
                }

                const backupFileName = `backup-${Date.now()}.tar.gz`;
                const backupFilePath = path.join(tempDir, backupFileName);

                let previousBytes = 0;
                let previousUpdate = Date.now();

                const downloadHeaders = {};
                if (headerData.headers && typeof headerData.headers === 'object') {
                    Object.assign(downloadHeaders, headerData.headers);
                }
                if (headerData.downloadHeaders && typeof headerData.downloadHeaders === 'object') {
                    Object.assign(downloadHeaders, headerData.downloadHeaders);
                }
                if (req.headers['access-code']) {
                    downloadHeaders['Access-Code'] = req.headers['access-code'];
                }
                if (Object.keys(downloadHeaders).length === 0) {
                    console.log('[SetupNodeFromBackup] No additional headers supplied for snapshot download.');
                } else {
                    console.log('[SetupNodeFromBackup] Using custom download header keys:', Object.keys(downloadHeaders));
                }

                await downloadToFile(cleanDownloadUrl, backupFilePath, {
                    headers: downloadHeaders,
                    onStart: (totalBytes) => {
                        progressState.status = 'downloading';
                        progressState.stage = 'download';
                        if (typeof totalBytes === 'number' && totalBytes > 0) {
                            progressState.totalBytes = totalBytes;
                        }
                        progressState.downloadedBytes = 0;
                        progressState.speedBps = 0;
                        progressState.updatedAt = Date.now();
                        previousBytes = 0;
                        previousUpdate = progressState.updatedAt;
                    },
                    onProgress: ({ downloaded, total }) => {
                        const now = Date.now();
                        const bytesDelta = downloaded - previousBytes;
                        const timeDeltaSeconds = (now - previousUpdate) / 1000;

                        progressState.downloadedBytes = downloaded;
                        if (typeof total === 'number' && total > 0) {
                            progressState.totalBytes = total;
                        }
                        if (progressState.totalBytes == null && typeof headerData.fileSize === 'number' && headerData.fileSize > 0) {
                            progressState.totalBytes = headerData.fileSize;
                        }
                        if (timeDeltaSeconds > 0 && bytesDelta >= 0) {
                            progressState.speedBps = bytesDelta / timeDeltaSeconds;
                        }
                        progressState.updatedAt = now;

                        previousBytes = downloaded;
                        previousUpdate = now;
                    },
                    onComplete: ({ downloaded, total }) => {
                        progressState.status = 'downloaded';
                        progressState.stage = 'download';
                        progressState.downloadedBytes = downloaded;
                        if (typeof total === 'number' && total > 0) {
                            progressState.totalBytes = total;
                        }
                        if (progressState.totalBytes == null && typeof headerData.fileSize === 'number' && headerData.fileSize > 0) {
                            progressState.totalBytes = headerData.fileSize;
                        }
                        progressState.speedBps = 0;
                        progressState.updatedAt = Date.now();
                    }
                });

                progressState.status = 'applying';
                progressState.stage = 'apply';
                progressState.speedBps = 0;
                progressState.updatedAt = Date.now();

                const success = await setupNodeFromBackup(
                    app, 
                    keyStoreNode, 
                    unrot13(atob(passwordCrypted)), 
                    moniker, 
                    chainId, 
                    mode, 
                    backupFilePath
                );

                if (!success) {
                    throw new Error('Failed to setup node from backup');
                }

                await execWrapper(`rm -rf ${tempDir}`);
                
                app.node.setup = true;

                progressState.status = 'completed';
                progressState.stage = 'done';
                progressState.updatedAt = Date.now();

                setTimeout(() => {
                    if (app.locals.setupNodeFromBackupProgress === progressState) {
                        app.locals.setupNodeFromBackupProgress = null;
                    }
                }, 5 * 60 * 1000);

                res.send({ status: 'ready', success: true });

            } catch (error) {
                progressState.status = 'error';
                progressState.error = error.message;
                progressState.updatedAt = Date.now();

                if (fs.existsSync(tempDir)) {
                    await execWrapper(`rm -rf ${tempDir}`);
                }
                setTimeout(() => {
                    if (app.locals.setupNodeFromBackupProgress === progressState) {
                        app.locals.setupNodeFromBackupProgress = null;
                    }
                }, 5 * 60 * 1000);
                throw error;
            }
        } catch (e) {
            console.error('Setup from backup failed:', e);
            res.send({ status: 'ko', error: e.message });
        }
    });
};

module.exports = {
    setupNodeFromBackup: setupNodeFromBackupEndpoint
}; 
