const express = require('express');
const {Op} = require('sequelize');
const {nanoid} = require('nanoid');
const schemes = require('./schemes');
const { datesLimit } = require('./schemes');

function answerWithError(res, errorMsg) {
  res.status(400).send({
    error: errorMsg,
  });
}
function answerWithResult(res, data) {
  res.status(200).send({
    result: data,
  });
}


module.exports = (sequelize) => {
  const app = express();
  app.use(express.json());

  app.get('/', async (req, res) => {
    const validResult = schemes.filter.validate(req.query);
    if (validResult.error) {
      return answerWithError(res, validResult.error.message);
    }
    const filter = validResult.value;
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
        require: false,
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
            [[sequelize.literal('"students->lessonStudents"."visit"'),
              'visit']],
        },
        through: {
          attributes: [],
        },
      }],
    };

    // status добавляется в where самого занятия (фильтруем занятия)
    if (filter.status !== undefined) {
      query.where.status = {
        [Op.eq]: filter.status,
      };
    }
    // date добавляется в where самого занятия (фильтруем занятия)
    if (filter.date !== undefined) {
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
    if (filter.teacherIds !== undefined) {
      const teacherCondition = `(SELECT COUNT(*) FROM "lesson_teachers" lt
        WHERE "lt"."lesson_id"=lesson.id AND 
        "lt"."teacher_id" in (${filter.teacherIds.join(',')}))
        >0`;
      query.where[nanoid()] = sequelize.literal(teacherCondition);
      // query.include[0].where = {
      //   id: {
      //     [Op.in]: filter.teacherIds,
      //   },
      // };
    }
    /* здесь добавляется подзапрос countVisits, чтобы ограничить
    количество пользователей посредством nanoid(),
    т.к. sequelize требует обязательно указать поле,
    издержки библиотеки
    */
    if (filter.studentsCount !== undefined) {
      const {studentsCount} = filter;
      if (studentsCount.length == 1) {
        query.where[nanoid()] =
          sequelize.literal(countVisits+'='+studentsCount);
      } else {
        query.where[nanoid()] =
          sequelize.literal(countVisits+'>='+studentsCount[0]);
        query.where[nanoid()] =
          sequelize.literal(countVisits+'<='+studentsCount[1]);
      }
    }
    const queryResult = await sequelize.models.lesson.findAll(query);
    answerWithResult(res, queryResult);
  });

  app.post('/lessons', async (req, res) => {
    const validResult = schemes.lessons.validate(req.body);
    if (validResult.error) {
      return answerWithError(res, validResult.error.message);
    }
    const {
      firstDate,
      lastDate,
      teacherIds,
      lessonsCount,
      title,
      days,
    } = validResult.value;
    let dates = new Array(365);
    for (let i = 0; i < dates.length; i++) {
      const timestamp = firstDate.getTime() + i*24*60*60*1000;
      dates[i] = new Date(timestamp);
    }
    dates = dates.filter((date) => days.includes(date.getDay()));
    if (lastDate) {
      dates = dates.filter((date) => date <= lastDate);
    } else {
      dates = dates.slice(0, lessonsCount);
    }
    dates = dates.slice(0, datesLimit);
    const lessonsPayload = dates.map((date) => ({
      date,
      title,
      status: 0,
    }));
    try {
      const lessons = await sequelize.transaction(async (t) => {
        const lessons =
          await sequelize.models.lesson.bulkCreate(
              lessonsPayload,
              {transaction: t, validate: true},
          );
        console.log(lessons);
        for (lesson of lessons) {
          await lesson.addTeachers(teacherIds, {transaction: t});
        }
        return lessons;
      });
      answerWithResult(res, lessons.map((lesson) => lesson.id));
    } catch (e) {
      console.error(e);
      answerWithError(res, e.original.detail);
    }
  });

  return app;
};

