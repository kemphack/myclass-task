const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('lessonStudents', {
    visit: {
      type: DataTypes.BOOLEAN,
    },
  }, {
    sequelize,
    tableName: 'lesson_students',
    timestamps: false,
  });
};

