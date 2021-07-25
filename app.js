const express = require('express');
const initSequelize = require('./sequelize/initSequelize');

const app = express();
let sequelize;

app.get('/', async (req, res) => {
  const result = await sequelize.models.lesson.findAll({
    include: [{
      model: sequelize.models.teacher,
      required: true,
      through: {
        attributes: [],
      },
    }, {
      attributes: {
        include:
          [[sequelize.literal('"students->lessonStudents"."visit"'), 'visit']],
      },
      through: {
        attributes: [],
      },
      model: sequelize.models.student,
    }],
  });
  res.send(result);
});

async function startServer() {
  sequelize = await initSequelize();
  app.listen(3334, () => {
    console.log('express server started');
  });
}

startServer();
