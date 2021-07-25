const {Sequelize} = require('sequelize');
const models = require('./models');

// Подключаем переменные среды
require('dotenv').config();

module.exports = async function() {
  sequelize = new Sequelize({
    dialect: 'postgres',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_LOCATION,
    port: process.env.DB_PORT,
  });
  await sequelize.authenticate();
  // инициализируем все модели
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
    through: lessonTeachers, foreignKey: 'teacher_id'});
  teacher.belongsToMany(lesson, {
    through: lessonTeachers, foreignKey: 'lesson_id'});
  lesson.belongsToMany(student, {
    through: lessonStudents, foreignKey: 'student_id'});
  student.belongsToMany(lesson, {
    through: lessonStudents, foreignKey: 'lesson_id'});
  return sequelize;
};
