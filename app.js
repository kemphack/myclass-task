const express = require('express');
const {Op} = require('sequelize');
const Joi = require('joi');
const moment = require('moment');
const initSequelize = require('./sequelize/initSequelize');
const {nanoid} = require('nanoid');


let sequelize;
const app = express();

const validateDiap = (value, scheme) => {
  const validateScheme = Joi.array().items(scheme).max(2);
  const result = validateScheme.validate(value.split(','));
  if (result.error) {
    throw result.error;
  } else if (result.value.length > 1) {
    if (result.value[0] <= result.value[1]) {
      return result.value;
    } else {
      throw new Error('first should less or equal second.');
    }
  }
  return result.value;
};

const validateDates = (value) => {
  const dates = validateDiap(value, Joi.date());
  console.log(dates);
  return dates.map(
      (date) => moment(date.getTime()).format('YYYY-MM-DD HH:mm:ss'),
  );
};

const validateIds = (value) => {
  const validatorId =
    Joi.array().min(1).items(Joi.number().integer().positive());
  const result = validatorId.validate(value.split(','));
  if (result.error) {
    throw result.error;
  } else {
    return result.value;
  }
};

const validateCount = (value) => {
  const dateScheme = Joi.number().integer().positive();
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
    return res.status(400).send({
      error: result.error.message,
    });
  }
  const filter = result.value;
  // запрос для подсчета количества посещений на уроке
  const countVisits =
    `(SELECT COUNT(*) FROM "lesson_students" ls
    WHERE "ls"."lesson_id"=lesson.id AND "ls"."visit"=True)`;
  // создаем запрс, который впоследствии будет дорабатываться
  const query = {
    offset: (filter.page - 1) * filter.lessonsPerPage,
    limit: filter.lessonsPerPage,
    order: [['date', 'ASC']],
    where: {},
    attributes: {
      include: [[sequelize.literal(countVisits), 'visitCount']],
    },
    include: [{
      model: sequelize.models.teacher,
      through: {
        attributes: [],
      },
    }, {
      model: sequelize.models.student,
      require: false,
      attributes: {
        // переносим lessonStudents в student
        include:
          [[sequelize.literal('"students->lessonStudents"."visit"'), 'visit']],
      },
      through: {
        attributes: [],
      },
    }],
  };

  // status добавляется в where самого занятия (фильтруем занятия)
  if (filter.status) {
    query.where.status = filter.status;
  }
  // date добавляется в where самого занятия (фильтруем занятия)
  if (filter.date) {
    const {date} = filter;
    // в случае если дано одно число
    if (date.length == 1) {
      query.where.date = {
        [Op.eq]: date[0],
      };
    } else {
      // в случае диапазона добавляем две границы
      query.where.date = {
        [Op.and]: {
          [Op.gte]: date[0],
          [Op.lte]: date[1],
        },
      };
    }
  }
  /* teacherIds уже указывается для модели teacher, чтобы
  был обязательно хотя бы один учитель из teacherIds,
  при этом важно что здесь же и создается where, т.к. where
  сам по себе накладывает условие на наличие хотя бы
  одного учителя. */
  if (filter.teacherIds) {
    query.include[0].where = {
      id: {
        [Op.in]: filter.teacherIds,
      },
    };
  }
  /* здесь добавляется подзапрос countVisits, чтобы ограничить
  количество пользователей посредством nanoid(),
  т.к. sequelize требует обязательно указать поле,
  издержки библиотеки
   */
  if (filter.studentsCount) {
    const {studentsCount} = filter;
    if (studentsCount.length == 1) {
      query.where[nanoid()] = sequelize.literal(countVisits+'>='+studentsCount);
    } else {
      query.where[nanoid()] =
        sequelize.literal(countVisits+'>='+studentsCount[0]);
      query.where[nanoid()] =
        sequelize.literal(countVisits+'<='+studentsCount[1]);
    }
  }
  const queryResult = await sequelize.models.lesson.findAll(query);
  res.status(200).send({result: queryResult});
});

async function startServer() {
  sequelize = await initSequelize();
  app.listen(3334, () => {
    console.log('express server started');
  });
}

startServer();
