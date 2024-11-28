const express = require('express');
const corsUtils = require('./utils/cors.js');
const environementLoader = require('./environements/environement.js');
const fs = require('fs');
const { parsePairNodes } = require('./utils/pairnodes.js');
const middlewares = require('./utils/middlewares.js');

const environement = environementLoader.load();

////////////////////////////////////////////
// MIDDLEWARES (JSON, CORS, ALLOWED FILES, AUTH)
////////////////////////////////////////////

const app = express();
app.use(express.json()) //Notice express.json middleware
corsUtils.setCors(app, ['*']);
middlewares.asFile(app, ['favicon.png', 'logo.png']);
middlewares.auth(app, environement, './html/pages/login.html', 'access-code', []);
middlewares.setHeaders(app, [
  ['Access-Control-Allow-Origin', '*'],
  ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'],
  ['Access-Control-Allow-Headers', 'X-Requested-With,content-type']
]);
// TODO: add middleware against flood

const main = async () => {
  ////////////////////////////////////////////
  // LOAD SERVICES
  ////////////////////////////////////////////

  // app.pairNodes = await parsePairNodes();

  ////////////////////////////////////////////
  // ROUTES
  ////////////////////////////////////////////

  let routes = [... fs.readdirSync('./routes')]
    .filter(x => !['example.js'].includes(x)  && x.endsWith('.js'))
    .map(x => [x, require(`./routes/${x}`)])
    .map(x => ({ name: x[0].replace('.js', ''), use: Object.values(x[1])[0], type: 'normal' }));

  [... routes].forEach(routeUseFunction => {
    routeUseFunction.use(app, environement);

    let method = routeUseFunction.name.split('-', 1)[0];
    let path = routeUseFunction.name.replace(`${method}-`, '');
    console.log(`[Helios Node - API] - ${method} - ${path}`);
  });
};

////////////////////////////////////////////
// SERVER
////////////////////////////////////////////

const PORT = process.env.PORT || environement?.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[Helios Node - API] - Start Server Port ${PORT}`);
  main();
});
