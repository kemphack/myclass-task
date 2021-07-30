const installer = require('./sequelize/installer');
const createApp = require('./app/createApp');

async function startServer() {
  sequelize = await installer.init();
  const app = createApp(sequelize);
  app.listen(3335, () => {
    console.log('express server started');
  });
}

startServer();
