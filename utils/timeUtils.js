/**
 * Calcule le temps estimé basé sur les blocs restants
 * Un bloc prend 15 secondes sur le réseau Helios
 * 
 * @param {number} blocksRemaining - Nombre de blocs restants
 * @returns {string} Temps estimé au format lisible
 */
const calculateEstimatedTime = (blocksRemaining) => {
    if (blocksRemaining <= 0) return 'Activating now';
    
    const SECONDS_PER_BLOCK = 15;
    const totalSeconds = blocksRemaining * SECONDS_PER_BLOCK;
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
        return `in ${days} day${days > 1 ? 's' : ''} ${hours}h`;
    } else if (hours > 0) {
        return `in ${hours}h ${minutes}min`;
    } else if (minutes > 0) {
        return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return `in ${seconds} second${seconds > 1 ? 's' : ''}`;
    }
};

/**
 * Calcule le nombre de blocs restants avant un bloc cible
 * 
 * @param {number} currentBlock - Bloc actuel
 * @param {number} targetBlock - Bloc cible
 * @returns {number} Nombre de blocs restants (minimum 0)
 */
const calculateBlocksRemaining = (currentBlock, targetBlock) => {
    return Math.max(0, targetBlock - currentBlock);
};

module.exports = {
    calculateEstimatedTime,
    calculateBlocksRemaining
};
