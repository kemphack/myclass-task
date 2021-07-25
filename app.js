const express = require('express');
const Joi = require('joi');
const initSequelize = require('./sequelize/initSequelize');


let sequelize;
const app = express();

const validateDiap = (value, scheme) => {
  const validateScheme = Joi.array().items(scheme).single();
  const result = validateScheme.validate(value.split(','));
  if (result.error) {
    throw result.error;
  } else {
    if (result.value[0] <= result.value[1]) {
      return result.value;
    } else {
      throw new Error('first should less or equal second.');
    }
  }
};

const validateDates = (value) => {
  return validateDiap(value, Joi.date());
};

const validateIds = (value) => {
  const validatorId = Joi.array().items(Joi.number().integer().positive());
  const result = validatorId.validate(value.split(','));
  if (result.error) {
    throw result.error;
  } else {
    return result.value;
  }
};

const validateCount = (value) => {
  const dateScheme = Joi.array(Joi.date()).single();
  return validateDiap(value, dateScheme);
};

const filterValidateScheme = Joi.object({
  date: Joi.custom(validateDates).optional(),
  status: Joi.number().integer().min(0).max(1).optional(),
  teacherIds: Joi.custom(validateIds).optional(),
  lessonsPerPage: Joi.number().integer().positive().default(5),
  page: Joi.number().integer().positive().optional().default(1),
  studentsCount: Joi.custom(validateCount).optional(),
});

app.get('/', async (req, res) => {
  const result = filterValidateScheme.validate(req.query);
  if (result.error) {
    return res.status(400).send(result.error.message);
  }
  const filter = result.value;
  const countVisits =
    'SUM(CAST("students->lessonStudents"."visit" as INT)) over' +
    '(PARTITION BY "students->lessonStudents"."lesson_id")';
  const query = {
    offset: (filter.page - 1) * filter.lessonsPerPage,
    limit: filter.lessonsPerPage,
    include: [{
      model: sequelize.models.teacher,
      through: {
        attributes: [],
      },
    }, {
      attributes: {
        include:
          [
            [sequelize.literal('"students->lessonStudents"."visit"'), 'visit'],
            [sequelize.literal(countVisits), 'visitCount'],
          ],
      },
      through: {
        attributes: [],
      },
      model: sequelize.models.student,
    }],
  };
  if (filter.status) {
    query.where.status = status;
  }
  const queryResult = await sequelize.models.lesson.findAll(query);
  res.status(200).send(JSON.stringify(queryResult));
});

async function startServer() {
  sequelize = await initSequelize();
  app.listen(3334, () => {
    console.log('express server started');
  });
}

startServer();
