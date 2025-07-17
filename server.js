const express = require('express');
const corsUtils = require('./utils/cors.js');
const environementLoader = require('./environements/environement.js');
const fs = require('fs');
const { parsePairNodes } = require('./utils/pairnodes.js');
const middlewares = require('./utils/middlewares.js');
const { runAutomation } = require('./automation/automation.js');
const { initAppNodeFunctions } = require('./application/initAppNodeFunctions.js');

const environement = environementLoader.load();

////////////////////////////////////////////
// MIDDLEWARES (JSON, CORS, ALLOWED FILES, AUTH)
////////////////////////////////////////////

const app = express();
app.use(express.json()) //Notice express.json middleware
corsUtils.setCors(app, ['*']);
middlewares.asFile(app, ['favicon.png', 'favicon.ico', 'logo.png', 'icon.png', 'style.css', 'js/utils.js', 'js/api.js', 'js/side-bar.js']);
middlewares.asPageFile(app, [{ file: 'login', path: '/' }, 'login', 'setup', 'status', 'validator', 'settings', 'eth-stats', 'wallet', 'hyperions', 'ibc-relayers']);
middlewares.auth(app, environement, './html/pages/404.html', 'access-code', []);
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

  app.node = {
      mining: '0',
      setup: false,
      logs: [],
      status: async () => '0',
      stop: async () => {},
      getInfos: async () => ({})
  };

  app.hyperion = {
    status: async () => '0',
    logs: [],
    start: async () => {},
    stop: async () => {},
    getInfos: async () => ({})
  };

  ////////////////////////////////////////////
  // ROUTES
  ////////////////////////////////////////////

  let routes = [... fs.readdirSync('./exposition')]
    .filter(x => !['example.js'].includes(x)  && x.endsWith('.js'))
    .map(x => [x, require(`./exposition/${x}`)])
    .map(x => ({ name: x[0].replace('.js', ''), use: Object.values(x[1])[0], type: 'normal' }));

  [... routes].forEach(routeUseFunction => {
    routeUseFunction.use(app, environement);

    let method = routeUseFunction.name.split('-', 1)[0];
    let path = routeUseFunction.name.replace(`${method}-`, '');
    console.log(`[Helios Node - API] - ${method} - ${path}`);
  });

  ////////////////////////////////////////////
  // ACTIONS
  ////////////////////////////////////////////

  let actionsArray = [... fs.readdirSync('./actions')]
    .filter(x => !['example.js'].includes(x)  && x.endsWith('.js'))
    .map(x => [x, require(`./actions/${x}`)])
    .map(x => ({ name: x[0].replace('.js', ''), use: Object.values(x[1])[0], type: 'normal' }));

  app.actions = {};

  [... actionsArray].forEach(action => {
    let method = action.name;
    console.log(`[Helios Node - API] - ACTION - ${method}`);
    app.actions[method] = action;
  });

  const homeDirectory = await app.actions.getHomeDirectory.use();

  if (!fs.existsSync(homeDirectory)) {
    fs.mkdirSync(homeDirectory);
  }

  ////////////////////////////////////////////
  // AUTOMATIONS
  ////////////////////////////////////////////
  await initAppNodeFunctions(app);
  
  await runAutomation(app, environement);
};

////////////////////////////////////////////
// SERVER
////////////////////////////////////////////

const PORT = process.env.PORT || environement?.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[Helios Node - API] - Start Server Port ${PORT}`);
  main();
});
