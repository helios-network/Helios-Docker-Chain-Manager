const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const noop = () => {};

async function downloadToFile(url, destination, options = {}) {
    const {
        maxRedirects = 5,
        timeout = null,
        headers = {},
        onStart = noop,
        onProgress = noop,
        onComplete = noop
    } = options;

    const tempFilePath = `${destination}.download`;

    await fs.promises.mkdir(path.dirname(destination), { recursive: true });

    let completed = false;

    const cleanupPartial = async () => {
        try {
            await fs.promises.unlink(tempFilePath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    };

    try {
        await new Promise((resolve, reject) => {
            let fileStream = null;
            let requestRef = null;
            let responseRef = null;

            const markDone = (err) => {
                if (completed) {
                    return;
                }
                completed = true;

                if (err) {
                    if (requestRef && !requestRef.destroyed) {
                        requestRef.destroy(err);
                    }
                    if (responseRef && !responseRef.destroyed) {
                        responseRef.destroy(err);
                    }
                    if (fileStream && !fileStream.destroyed) {
                        fileStream.destroy(err);
                    }
                } else if (fileStream && typeof fileStream.close === 'function' && fileStream.closed !== true) {
                    fileStream.close(() => {});
                }
                fileStream = null;
                requestRef = null;
                responseRef = null;

                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            };

            const attemptDownload = (currentUrl, redirectsRemaining) => {
                const urlObj = new URL(currentUrl);
                const transport = urlObj.protocol === 'https:' ? https : http;

                const defaultHeaders = {
                    'User-Agent': 'HeliosSetup/1.0 (+https://helioschainlabs.org)',
                    'Accept': '*/*',
                    'Accept-Encoding': 'identity'
                };

                requestRef = transport.get(currentUrl, { headers: { ...defaultHeaders, ...headers } }, (response) => {
                    try {
                        if (completed) {
                            response.resume();
                            return;
                        }

                        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                            if (redirectsRemaining === 0) {
                                response.resume();
                                markDone(new Error('Too many redirects while downloading file'));
                                return;
                            }

                            const nextUrl = new URL(response.headers.location, currentUrl).toString();
                            response.resume();
                            attemptDownload(nextUrl, redirectsRemaining - 1);
                            return;
                        }

                        if (response.statusCode < 200 || response.statusCode >= 300) {
                            const errorChunks = [];
                            response.on('data', (chunk) => errorChunks.push(chunk));
                            response.on('end', () => {
                                const errorBody = Buffer.concat(errorChunks).toString('utf8');
                                const message = errorBody
                                    ? `Download failed with status code ${response.statusCode}: ${errorBody}`
                                    : `Download failed with status code ${response.statusCode}`;
                                markDone(new Error(message));
                            });
                            response.on('error', (streamErr) => {
                                markDone(streamErr);
                            });
                            return;
                        }

                        responseRef = response;

                        const totalHeader = response.headers['content-length'];
                        const totalBytes = totalHeader ? Number(totalHeader) : null;
                        try {
                            onStart(Number.isFinite(totalBytes) ? totalBytes : null);
                        } catch (callbackError) {
                            console.error('downloadToFile onStart callback failed:', callbackError);
                        }

                        let downloadedBytes = 0;

                        response.on('data', (chunk) => {
                            downloadedBytes += chunk.length;
                            try {
                                onProgress({
                                    downloaded: downloadedBytes,
                                    total: Number.isFinite(totalBytes) ? totalBytes : null
                                });
                            } catch (callbackError) {
                                console.error('downloadToFile onProgress callback failed:', callbackError);
                            }
                        });

                        response.on('error', (streamErr) => {
                            markDone(streamErr);
                        });

                        fileStream = fs.createWriteStream(tempFilePath);

                        fileStream.on('finish', () => {
                            try {
                                onComplete({
                                    downloaded: downloadedBytes,
                                    total: Number.isFinite(totalBytes) ? totalBytes : null
                                });
                            } catch (callbackError) {
                                console.error('downloadToFile onComplete callback failed:', callbackError);
                            }
                            markDone();
                        });

                        fileStream.on('error', (streamError) => {
                            markDone(streamError);
                        });

                        response.pipe(fileStream);
                    } catch (innerError) {
                        markDone(innerError);
                    }
                });

                if (!requestRef) {
                    markDone(new Error('Failed to initiate download request'));
                    return;
                }

                if (typeof timeout === 'number' && timeout > 0) {
                    requestRef.setTimeout(timeout, () => {
                        requestRef.destroy(new Error('Download timed out'));
                    });
                }

                requestRef.on('error', (error) => {
                    markDone(error);
                });
            };

            try {
                attemptDownload(url, maxRedirects);
            } catch (invokeErr) {
                markDone(invokeErr);
            }
        });

        try {
            await fs.promises.unlink(destination);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }

        await fs.promises.rename(tempFilePath, destination);
    } catch (error) {
        await cleanupPartial().catch(() => {});
        throw error;
    }
}

module.exports = {
    downloadToFile
};
