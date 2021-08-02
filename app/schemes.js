const Joi = require('joi');
const moment = require('moment');

const dateToSql = (date) => {
  return moment(date.getTime()).format('YYYY-MM-DD HH:mm:ss');
};

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
  return dates.map(dateToSql);
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

const filterScheme = Joi.object({
  date: Joi.custom(validateDates).optional(),
  status: Joi.number().integer().min(0).max(1).optional(),
  teacherIds: Joi.custom(validateIds).optional(),
  lessonsPerPage: Joi.number().integer().positive().default(5),
  page: Joi.number().integer().positive().optional().default(1),
  studentsCount: Joi.custom(validateCount).optional(),
});

const datesLimit = 300;
const lessonsScheme = Joi.object({
  teacherIds: Joi.array()
      .items(Joi.number().positive().integer())
      .min(1)
      .unique()
      .required(),
  title: Joi.string().max(100).required(),
  days: Joi.array()
      .items(Joi.number().integer().min(0).max(6))
      .min(1)
      .unique()
      .required(),
  firstDate:
    Joi.date(),
  lessonsCount:
    Joi.number().positive().integer().max(datesLimit),
  lastDate:
    Joi.date()
        .max(
            Joi.ref('firstDate', {
              adjust: (date) => {
                return new Date(date.getTime() + 365*24*60*60*1000);
              },
            }),
        )
        .min(Joi.ref('firstDate'))
        .error((errors) => {
          const dateLessIndex = errors.findIndex((el) => el.code == 'date.max');
          if (dateLessIndex != -1) {
            const error = errors[dateLessIndex].local;
            const message =
              `"${error.key}" must not bigger than year ago of `+
              `"${error.limit.key}"`;
            errors[dateLessIndex] = new Error(message);
          }
          return errors;
        }),
}).xor('lastDate', 'lessonsCount');

module.exports = {
  filter: filterScheme,
  lessons: lessonsScheme,
  datesLimit,
  dateToSql,
};
