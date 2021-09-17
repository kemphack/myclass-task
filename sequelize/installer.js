const { Sequelize } = require('sequelize');
const models = require('./models');

// Подключаем переменные среды
require('dotenv').config();

const defaultOptions = {
  dialect: 'postgres',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_LOCATION,
  port: process.env.DB_PORT,
};

async function init(dbOptions = defaultOptions) {
  sequelize = new Sequelize(dbOptions);
  await sequelize.authenticate();
  // инициализируем все модели
  return await initModels(sequelize);
};

/**
 * 
 * @param {*} sequelize 
 * @returns {Sequelize}
 */
async function initModels(sequelize) {
  await Promise.all(
    models.map(
      (createModel) => {
        const model = createModel(sequelize);
        return model.sync();
      },
    ),
  );
  const {
    lesson,
    teacher,
    student,
    lessonTeachers,
    lessonStudents,
  } = sequelize.models;

  // настраиваем отношения
  lesson.belongsToMany(teacher, {
    through: lessonTeachers, foreignKey: 'lesson_id'
  });
  teacher.belongsToMany(lesson, {
    through: lessonTeachers, foreignKey: 'teacher_id'
  });
  lesson.belongsToMany(student, {
    through: lessonStudents, foreignKey: 'lesson_id'
  });
  student.belongsToMany(lesson, {
    through: lessonStudents, foreignKey: 'student_id'
  });
  return sequelize;
}

module.exports = {
  init,
  initModels,
};
