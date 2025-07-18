const fs = require('fs');
const path = require('path');
const B2 = require('backblaze-b2');

const GETTestB2 = (app, environement) => {
    app.get('/test-b2', async (req, res) => {
        try {
            const homeDirectory = await app.actions.getHomeDirectory.use();
            const settingsPath = path.join(homeDirectory, 'settings.json');
            
            if (!fs.existsSync(settingsPath)) {
                return res.json({ 
                    success: false, 
                    error: 'No settings file found',
                    details: 'Please configure B2 settings first'
                });
            }
            
            let settings;
            try {
                settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            } catch (parseError) {
                return res.json({ 
                    success: false, 
                    error: 'Invalid settings file format',
                    details: parseError.message
                });
            }
            
            const { b2ApplicationKeyId, b2ApplicationKey, b2BucketName } = settings;
            
            if (!b2ApplicationKeyId || !b2ApplicationKey || !b2BucketName) {
                return res.json({ 
                    success: false, 
                    error: 'B2 configuration incomplete',
                    details: {
                        hasKeyId: !!b2ApplicationKeyId,
                        hasKey: !!b2ApplicationKey,
                        hasBucket: !!b2BucketName,
                        missing: []
                    }
                });
            }
            const b2 = new B2({
                applicationKeyId: b2ApplicationKeyId,
                applicationKey: b2ApplicationKey
            });

            let authResult;
            try {
                authResult = await b2.authorize();
            } catch (authError) {
                console.error('B2 Test: Authorization failed:', authError);
                return res.json({ 
                    success: false, 
                    error: 'B2 authorization failed',
                    details: {
                        message: authError.message,
                        code: authError.code,
                        status: authError.status
                    }
                });
            }
            let buckets;
            try {
                buckets = await b2.listBuckets();
            } catch (bucketError) {
                console.error('B2 Test: Failed to list buckets:', bucketError);
                return res.json({ 
                    success: false, 
                    error: 'Failed to list B2 buckets',
                    details: {
                        message: bucketError.message,
                        code: bucketError.code,
                        status: bucketError.status
                    }
                });
            }

            const bucket = buckets.data.buckets.find(b => b.bucketName === b2BucketName);
            if (!bucket) {
                return res.json({ 
                    success: false, 
                    error: 'B2 bucket not found',
                    details: {
                        requestedBucket: b2BucketName,
                        availableBuckets: buckets.data.buckets.map(b => b.bucketName)
                    }
                });
            }
            try {
                const files = await b2.listFileNames({
                    bucketId: bucket.bucketId,
                    maxFileCount: 1
                });
            } catch (permissionError) {
                console.error('B2 Test: Permission error:', permissionError);
                return res.json({ 
                    success: false, 
                    error: 'B2 bucket permission error',
                    details: {
                        message: permissionError.message,
                        code: permissionError.code,
                        status: permissionError.status
                    }
                });
            }

            return res.json({ 
                success: true, 
                message: 'B2 configuration is valid and working',
                details: {
                    bucketName: b2BucketName,
                    bucketId: bucket.bucketId,
                    bucketType: bucket.bucketType,
                    authorization: 'OK',
                    permissions: 'OK'
                }
            });

        } catch (error) {
            console.error('B2 Test: General error:', error);
            return res.json({ 
                success: false, 
                error: 'General B2 test error',
                details: {
                    message: error.message,
                    stack: error.stack
                }
            });
        }
    });
};

module.exports = {
    GETTestB2
}; 