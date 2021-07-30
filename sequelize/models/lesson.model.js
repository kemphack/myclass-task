const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('lesson', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATEONLY,
    },
    title: {
      type: DataTypes.CHAR(100),
    },
    status: {
      type: DataTypes.INTEGER,
    },
  }, {
    timestamps: false,
  });
};
