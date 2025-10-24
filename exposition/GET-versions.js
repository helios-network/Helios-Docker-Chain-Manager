/**
 * GET /get-versions
 * 
 * Endpoint pour récupérer les informations de versions
 * 
 * Response format:
 * {
 *   success: true,
 *   currentVersion: string,        // Version actuelle (ex: "v1.2.0")
 *   chainId: string,               // ID de la chaîne (ex: "helios-testnet-1")
 *   currentBlock: string,          // Hauteur de bloc actuelle (ex: "12345")
 *   lastUpdated: string,           // Date de dernière mise à jour (ex: "2025-10-23 12:00:00")
 *   nodeStatus: string,            // Statut du noeud: "up-to-date", "upgrade-required", "upgrade-missed", "syncing"
 *   statusMessage: string,         // Message descriptif du statut
 *   
 *   upgradeProposals: [            // Propositions de mise à jour (peuvent être votées)
 *     {
 *       id: string,                // ID de la proposition (ex: "45")
 *       title: string,             // Titre de la proposition
 *       description: string,       // Description
 *       status: string,            // Statut: "voting", "passed", "rejected"
 *       targetVersion: string,     // Version cible
 *       votesYes: number,          // Votes pour
 *       votesNo: number,           // Votes contre
 *       votesAbstain: number,      // Votes abstention
 *       votingEnd: string          // Date de fin du vote
 *     }
 *   ],
 *   
 *   pendingUpgrades: [             // Mises à jour planifiées
 *     {
 *       name: string,              // Nom de la mise à jour
 *       version: string,           // Version cible
 *       upgradeBlock: number,      // Hauteur de bloc de la mise à jour
 *       description: string,       // Description
 *       status: string,            // Statut: "pending", "active"
 *       blocksRemaining: number,   // Blocs restants
 *       estimatedTime: string      // Temps estimé
 *     }
 *   ]
 * }
 */

const { calculateEstimatedTime, calculateBlocksRemaining } = require('../utils/timeUtils');

const GETVersions = (app, environement) => {
    app.get('/get-versions', async (req, res) => {
        try {
            // DONNÉES HARDCODÉES - À REMPLACER PAR L'INTÉGRATION RÉELLE
            const currentBlock = 7500;
            const currentVersion = 'v1.2.0-testnet';
            
            // Mises à jour planifiées
            const pendingUpgrades = [
                {
                    name: 'v2.0.0-beta',
                    version: 'v2.0.0-beta',
                    upgradeBlock: 8000,
                    description: 'Beta testing for v2.0.0 - New consensus improvements',
                    status: 'pending',
                    blocksRemaining: calculateBlocksRemaining(currentBlock, 8000),
                    estimatedTime: calculateEstimatedTime(calculateBlocksRemaining(currentBlock, 8000))
                }
            ];
            
            // Déterminer le statut du noeud
            let nodeStatus = 'up-to-date';
            let statusMessage = 'Node is running the latest version';
            
            // Vérifier si une mise à jour est disponible mais manquée
            const missedUpgrades = pendingUpgrades.filter(upgrade => 
                currentBlock >= upgrade.upgradeBlock && 
                upgrade.version !== currentVersion
            );
            
            if (missedUpgrades.length > 0) {
                nodeStatus = 'upgrade-missed';
                statusMessage = `Critical: Upgrade to ${missedUpgrades[0].version} was required at block ${missedUpgrades[0].upgradeBlock}. Please upgrade immediately!`;
            } else {
                // Vérifier si une mise à jour est imminente
                const upcomingUpgrades = pendingUpgrades.filter(upgrade => 
                    currentBlock < upgrade.upgradeBlock &&
                    upgrade.blocksRemaining <= 1000 // Moins de 1000 blocs (environ 4h)
                );
                
                if (upcomingUpgrades.length > 0) {
                    nodeStatus = 'upgrade-required';
                    statusMessage = `Upgrade to ${upcomingUpgrades[0].version} required soon (${upcomingUpgrades[0].estimatedTime})`;
                }
            }
            
            const data = {
                success: true,
                
                // Version actuelle
                currentVersion: currentVersion,
                chainId: 'helios-testnet-1',
                currentBlock: currentBlock.toString(),
                lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19),
                nodeStatus: nodeStatus,
                statusMessage: statusMessage,
                
                // Propositions de mise à jour (affichées dans le tableau avec bouton Vote)
                upgradeProposals: [
                    {
                        id: '45',
                        title: 'Upgrade to v2.0.0-rc1',
                        description: 'Release candidate for v2.0.0 - Major improvements to consensus and performance',
                        status: 'voting',
                        targetVersion: 'v2.0.0-rc1',
                        votesYes: 850,
                        votesNo: 120,
                        votesAbstain: 30,
                        votingEnd: '2025-11-01'
                    },
                    {
                        id: '46',
                        title: 'Security Patch v1.2.1',
                        description: 'Emergency security patch for version 1.2.0',
                        status: 'voting',
                        targetVersion: 'v1.2.1-testnet',
                        votesYes: 920,
                        votesNo: 45,
                        votesAbstain: 15,
                        votingEnd: '2025-10-28'
                    }
                ],
                
                // Mises à jour planifiées (affichées dans le tableau)
                pendingUpgrades: pendingUpgrades
            };
            
            res.json(data);
        } catch (error) {
            console.error('Error loading version info:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    GETVersions
};
