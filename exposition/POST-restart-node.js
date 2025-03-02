const restartNode = (app, environement) => {
    app.post('/restart-node', async (req, res) => {
        if (!app.node) {
            res.send(false);
            return;
        }

        console.log("Arrêt du nœud...");
        await app.node.stop(); // Arrête le nœud

        setTimeout(async () => {
            console.log("Redémarrage du nœud...");
            await app.node.start(); // Redémarre le nœud
            res.send(true);
        }, 3000); // Pause de 3 secondes avant de redémarrer
    });
};

module.exports = {
    restartNode
};
