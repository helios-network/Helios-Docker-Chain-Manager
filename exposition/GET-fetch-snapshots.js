const fetchSnapshots = (app, environement) => {
    app.get('/fetch-snapshots', async (req, res) => {
        try {
            console.log('Fetching snapshots from Helios Chain Labs...');
            // Determine snapshots URL from environment or configuration
            const snapshotsUrl = (environement && environement.snapshotsUrl)
                || process.env.SNAPSHOTS_URL
                || 'https://snapshots.helioschainlabs.org/snapshots/';

            console.log(`Using snapshots URL: ${snapshotsUrl}`);

            // Fetch snapshots from the external API
            const response = await fetch(snapshotsUrl);
            
            if (!response.ok) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Failed to fetch snapshots: ${response.statusText}` 
                });
            }
            
            const data = await response.json();
            
            if (!data.snapshots || !Array.isArray(data.snapshots)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid snapshots data format' 
                });
            }
            
            // Clean up URLs that have double https:// protocol
            const cleanedSnapshots = data.snapshots.map(snapshot => ({
                ...snapshot,
                downloadUrl: snapshot.downloadUrl ? snapshot.downloadUrl.replace(/^https:\/\/https:\/\//, 'https://') : snapshot.downloadUrl,
                headerUrl: snapshot.headerUrl ? snapshot.headerUrl.replace(/^https:\/\/https:\/\//, 'https://') : snapshot.headerUrl
            }));
            
            console.log(`Snapshots fetched successfully: ${cleanedSnapshots.length} snapshots available`);
            
            return res.json({
                success: true,
                snapshots: cleanedSnapshots
            });
            
        } catch (error) {
            console.error('Error fetching snapshots:', error);
            return res.status(500).json({ 
                success: false, 
                error: `Internal server error: ${error.message}` 
            });
        }
    });
};

module.exports = {
    fetchSnapshots
};
