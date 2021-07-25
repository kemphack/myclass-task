const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('student', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: {
      type: DataTypes.CHAR(10),
    },
  }, {
    timestamps: false,
  });
};
