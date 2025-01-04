const example = (app, environement) => {
    app.get('/example', async (req, res) => {
        res.send('example');
    });
};

module.exports = {
    example
};