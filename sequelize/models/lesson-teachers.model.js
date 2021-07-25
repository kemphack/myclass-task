module.exports = (sequelize) => {
  return sequelize.define('lessonTeachers', {

  }, {
    sequelize,
    tableName: 'lesson_teachers',
    timestamps: false,
  });
};
