const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const B2 = require('backblaze-b2');
const crypto = require('crypto');

// Constants
const PART_SIZE = 100 * 1024 * 1024; // 100MB
const B2_BASE_URL = 'https://f003.backblazeb2.com/file';

// Helper functions
const calculateSha1 = (buffer) => crypto.createHash('sha1').update(buffer).digest('hex');

const validateB2Config = (settings) => {
    const { b2ApplicationKeyId, b2ApplicationKey, b2BucketName } = settings;
    if (!b2ApplicationKeyId || !b2ApplicationKey || !b2BucketName) {
        throw new Error('B2 configuration incomplete. Please configure all B2 settings.');
    }
    return { b2ApplicationKeyId, b2ApplicationKey, b2BucketName };
};

const loadSettings = (homeDirectory) => {
    const settingsPath = path.join(homeDirectory, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
        throw new Error('No B2 configuration found. Please configure B2 first.');
    }
    
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (parseError) {
        throw new Error('Invalid settings file format.');
    }
};

const findBucket = (buckets, bucketName) => {
    const bucket = buckets.data.buckets.find(b => b.bucketName === bucketName);
    if (!bucket) {
        const availableBuckets = buckets.data.buckets.map(b => b.bucketName).join(', ');
        throw new Error(`B2 bucket '${bucketName}' not found. Available buckets: ${availableBuckets}`);
    }
    return bucket;
};

const checkExistingFiles = async (b2, bucketId, backupFileName, headerFileName) => {
    try {
        const listFilesResult = await b2.listFileNames({
            bucketId,
            prefix: 'backups/',
            maxFileCount: 1000
        });
        
        const existingFiles = listFilesResult.data.files || [];
        return {
            backup: existingFiles.find(f => f.fileName === backupFileName),
            header: existingFiles.find(f => f.fileName === headerFileName)
        };
    } catch (error) {
        console.error('B2: Error listing files:', error);
        return { backup: null, header: null };
    }
};

const deleteExistingFiles = async (b2, existingFiles, backupFileName, headerFileName) => {
    const deletePromises = [];
    
    if (existingFiles.backup) {
        deletePromises.push(
            b2.deleteFileVersion({
                fileName: backupFileName,
                fileId: existingFiles.backup.fileId
            }).catch(error => console.error('B2: Error deleting existing backup:', error))
        );
    }
    
    if (existingFiles.header) {
        deletePromises.push(
            b2.deleteFileVersion({
                fileName: headerFileName,
                fileId: existingFiles.header.fileId
            }).catch(error => console.error('B2: Error deleting existing header:', error))
        );
    }
    
    await Promise.all(deletePromises);
};

const uploadHeaderFile = async (b2, bucketId, headerFile, headerFileName) => {
    const uploadUrlRes = await b2.getUploadUrl({ bucketId });
    const sha1 = calculateSha1(headerFile.buffer);
    
    return await b2.uploadFile({
        uploadUrl: uploadUrlRes.data.uploadUrl,
        uploadAuthToken: uploadUrlRes.data.authorizationToken,
        fileName: headerFileName,
        data: headerFile.buffer,
        contentType: 'application/json',
        hash: sha1
    });
};

const uploadBackupFileSimple = async (b2, bucketId, backupFile, backupFileName) => {
    const uploadUrlRes = await b2.getUploadUrl({ bucketId });
    const fileBuffer = fs.readFileSync(backupFile.path);
    const sha1 = calculateSha1(fileBuffer);
    
    return await b2.uploadFile({
        uploadUrl: uploadUrlRes.data.uploadUrl,
        uploadAuthToken: uploadUrlRes.data.authorizationToken,
        fileName: backupFileName,
        data: fileBuffer,
        contentType: backupFile.mimetype || 'application/octet-stream',
        hash: sha1
    });
};

const uploadBackupFileMultipart = async (b2, bucketId, backupFile, backupFileName) => {
    const startRes = await b2.startLargeFile({
        bucketId,
        fileName: backupFileName,
        contentType: backupFile.mimetype || 'application/octet-stream'
    });
    
    const fileId = startRes.data.fileId;
    const uploadPartRes = await b2.getUploadPartUrl({ fileId });
    const { uploadUrl, authorizationToken } = uploadPartRes.data;
    
    const stats = fs.statSync(backupFile.path);
    const totalSize = stats.size;
    const numParts = Math.ceil(totalSize / PART_SIZE);
    const partSha1Array = [];
    
    try {
        // const fileStream = fs.createReadStream(backupFile.path);
        
        for (let i = 0; i < numParts; i++) {
            const start = i * PART_SIZE;
            const end = Math.min(start + PART_SIZE, totalSize);
            const partSize = end - start;
            
            // Read part from file stream
            const partBuffer = Buffer.alloc(partSize);
            const readStream = fs.createReadStream(backupFile.path, { start, end: end - 1 });
            
            await new Promise((resolve, reject) => {
                let bytesRead = 0;
                readStream.on('data', (chunk) => {
                    chunk.copy(partBuffer, bytesRead);
                    bytesRead += chunk.length;
                });
                readStream.on('end', () => {
                    resolve();
                });
                readStream.on('error', reject);
            });
            
            const sha1 = calculateSha1(partBuffer);
            partSha1Array.push(sha1);
            
            await b2.uploadPart({
                uploadUrl,
                uploadAuthToken: authorizationToken,
                partNumber: i + 1,
                data: partBuffer,
                hash: sha1
            });
        }
        
        return await b2.finishLargeFile({
            fileId,
            partSha1Array
        });
    } catch (error) {
        // Cleanup on error
        try {
            await b2.cancelLargeFile({ fileId });
        } catch (cancelError) {
            console.error('B2: Cancel large file error:', cancelError);
        }
        throw error;
    }
};

const uploadBackupFile = async (b2, bucketId, backupFile, backupFileName) => {
    const stats = fs.statSync(backupFile.path);
    if (stats.size < PART_SIZE) {
        return await uploadBackupFileSimple(b2, bucketId, backupFile, backupFileName);
    } else {
        return await uploadBackupFileMultipart(b2, bucketId, backupFile, backupFileName);
    }
};

const POSTUploadBackupB2 = (app, environement) => {
    app.post('/upload-backup-b2', multer({ storage: multer.memoryStorage() }).any(), async (req, res) => {
        let b2 = null;
        
        try {
            // Authentication check
            const accessCode = req.headers['access-code'];
            if (!accessCode) {
                return res.status(401).json({ success: false, error: 'Access code required.' });
            }

            // Load settings
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const settings = loadSettings(homeDirectory);
            const { b2ApplicationKeyId, b2ApplicationKey, b2BucketName } = validateB2Config(settings);

            // Handle file storage manually
            let backupFile, headerFile;
            
            for (const file of req.files) {
                if (file.fieldname === 'backup') {
                    // Store backup file on disk
                    const tempDir = path.join(process.cwd(), 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const filename = 'backup-' + uniqueSuffix + '-' + file.originalname;
                    const filepath = path.join(tempDir, filename);
                    
                    fs.writeFileSync(filepath, file.buffer);
                    backupFile = { ...file, path: filepath };
                } else if (file.fieldname === 'header') {
                    // Keep header file in memory
                    headerFile = file;
                }
            }

            // Validate files
            if (!backupFile || !headerFile) {
                return res.status(400).json({ success: false, error: 'Missing backup or header file.' });
            }

            console.log('backupFile', backupFile);
            console.log('headerFile', headerFile);

            // Check if this is just a file existence check
            const checkOnly = req.body.checkOnly === 'true';
            
            // Initialize B2 client
            b2 = new B2({
                applicationKeyId: b2ApplicationKeyId,
                applicationKey: b2ApplicationKey
            });
            
            // Authorize with B2
            await b2.authorize();
            
            // Get bucket information
            const buckets = await b2.listBuckets();
            const bucket = findBucket(buckets, b2BucketName);
            const bucketId = bucket.bucketId;
            
            // Prepare file names
            const backupFileName = `backups/${backupFile.originalname}`;
            const headerFileName = `backups/${headerFile.originalname}`;

            // Check existing files
            const existingFiles = await checkExistingFiles(b2, bucketId, backupFileName, headerFileName);
            
            // If this is just a check, return the result
            if (checkOnly) {
                const fileExists = existingFiles.backup || existingFiles.header;
                
                // Generate URLs for existing files
                const backupUrl = existingFiles.backup ? `${B2_BASE_URL}/${b2BucketName}/${backupFileName}` : null;
                const headerUrl = existingFiles.header ? `${B2_BASE_URL}/${b2BucketName}/${headerFileName}` : null;
                
                return res.json({ 
                    success: true, 
                    fileExists,
                    existingFiles: {
                        backup: existingFiles.backup ? {
                            fileName: existingFiles.backup.fileName,
                            fileId: existingFiles.backup.fileId,
                            size: existingFiles.backup.contentLength,
                            uploadTimestamp: existingFiles.backup.uploadTimestamp,
                            url: backupUrl
                        } : null,
                        header: existingFiles.header ? {
                            fileName: existingFiles.header.fileName,
                            fileId: existingFiles.header.fileId,
                            size: existingFiles.header.contentLength,
                            uploadTimestamp: existingFiles.header.uploadTimestamp,
                            url: headerUrl
                        } : null
                    }
                });
            }
            
            // Delete existing files if they exist
            await deleteExistingFiles(b2, existingFiles, backupFileName, headerFileName);

            // Upload backup file first
            await uploadBackupFile(b2, bucketId, backupFile, backupFileName);
            
            // Generate download URL for the backup
            const backupUrl = `${B2_BASE_URL}/${b2BucketName}/${backupFileName}`;

            // Get file sizes before cleanup
            const backupSize = fs.statSync(backupFile.path).size;
            
            // Update header with download URL
            const headerContent = JSON.parse(headerFile.buffer.toString());
            headerContent.downloadUrl = backupUrl;
            headerContent.fileSize = backupFile.size;
            
            // Create updated header file
            const updatedHeaderBuffer = Buffer.from(JSON.stringify(headerContent, null, 2));
            const updatedHeaderFile = {
                ...headerFile,
                buffer: updatedHeaderBuffer
            };
            
            // Upload updated header file
            await uploadHeaderFile(b2, bucketId, updatedHeaderFile, headerFileName);
            
            // Prepare response
            const headerUrl = `${B2_BASE_URL}/${b2BucketName}/${headerFileName}`;
            
            // Clean up temporary backup file
            try {
                if (backupFile.path && fs.existsSync(backupFile.path)) {
                    fs.unlinkSync(backupFile.path);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up temporary backup file:', cleanupError);
            }
            
            return res.json({ 
                success: true, 
                message: 'Backup uploaded to B2 successfully!',
                links: { backup: backupUrl, header: headerUrl },
                files: {
                    backup: {
                        name: backupFile.originalname,
                        size: backupSize,
                        url: backupUrl
                    },
                    header: {
                        name: headerFile.originalname,
                        size: updatedHeaderBuffer.length,
                        url: headerUrl
                    }
                }
            });
            
        } catch (error) {
            console.error('B2: Upload error:', error);
            
            return res.status(500).json({ 
                success: false, 
                error: error.message || 'Upload failed'
            });
        }
    });
};

module.exports = {
    POSTUploadBackupB2
}; 