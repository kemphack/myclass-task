const request = require('supertest');
const createApp = require('../app/createApp');
const installer = require('../sequelize/installer');
const { GenericContainer } = require("testcontainers");

let app;
let container, sequelizeTest;

const BASE_TIMEOUT = 100000;

jest.setTimeout(BASE_TIMEOUT);

describe('backend test', () => {
  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(jest.fn());
    jest.spyOn(console, 'debug').mockImplementation(jest.fn());
    container = await new GenericContainer("postgres")
      .withExposedPorts(5432)
      .withEnv('POSTGRES_PASSWORD', process.env.DB_PASSWORD)
      .withEnv('POSTGRES_USER', process.env.DB_USER)
      .withCopyFileToContainer(__dirname + '/test.sql', '/test.sql')
      .withCopyFileToContainer(__dirname + '/init.sh', '/docker-entrypoint-initdb.d/init-user-db.sh')
      .start()
    const stream = await container.logs();
    await new Promise((resolve, reject) => {
      let dataInitialized = false;
      stream.on('data', (line) => {
        if (!dataInitialized) {
          if (line.includes('initialization ended')) {
            dataInitialized = true;
          }
        } else if (line.includes('database system is ready to accept connections')) {
          resolve();
        }
        setTimeout(reject, 15000);
      });
    });
    sequelizeTest = await installer.init({
      dialect: 'postgres',
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'postgres',
      host: container.getHost(),
      port: container.getMappedPort(5432),
    });
    app = createApp(sequelizeTest);
  });

  test('first route', () => {
    return request(app)
      .get('/')
      .expect(200);
  });
  test('first route status wrong', () => {
    return request(app)
      .get('/?status=3')
      .expect(400);
  });
  test('first route students count', () => {
    return request(app)
      .get('/?studentsCount=3,5')
      .expect(200)
  });
  test('first route students count fail', () => {
    return request(app)
      .get('/?studentsCount=5,3')
      .expect(400)
  });
  test('first route date wrong', () => {
    return request(app)
      .get('/?date=2019-13-13')
      .expect(400)
  });
  test('first route date range', () => {
    return request(app)
      .get('/?date=2019-10-10,2019-10-15')
      .expect(200)
  });
  test('first route check if lessonsPerPage works', () => {
    return request(app)
      .get('/?lessonsPerPage=7')
      .then(response => {
        expect(response.body.result.length).toBe(7);
      })
  })
  test('first route check if teacherIds correct', async () => {
    const response = await request(app)
      .get('/?date=2019-09-01&teacherIds=1&lessonsPerPage=10')
      .expect(200);
    const lessons = response.body.result;
    for (lesson of lessons) {
      const ids = lesson.teachers.map(teacher => teacher.id);
      const date = lesson.date;
      expect(date).toBe('2019-09-01');
      expect(ids.includes(1)).toBeTruthy();
    }
  });
  test('first route check if studentsCount correct', async () => {
    const response = await request(app)
      .get('/?studentsCount=3')
      .expect(200);
    const lessons = response.body.result;
    for (lesson of lessons) {
      expect(lesson.students.length).toBe(3);
    }
  });
  test('second route', () => {
    return request(app)
      .post('/lessons')
      .send({
        teacherIds: [1],
        firstDate: new Date(),
        lessonsCount: 1,
        title: 'whatever',
        days: [0, 1, 2, 3],
      })
      .expect(200)
  });
  test('second route 2', (done) => {
    request(app)
      .post('/lessons')
      .send({
        teacherIds: [1],
        firstDate: "2021-07-01",
        lastDate: "2022-06-30",
        title: "Spring",
        days: [0, 1, 2, 3, 4, 5, 6],
      })
      .expect(200)
      .then(response => {
        expect(response.body.result.length).toBe(300);
        done();
      })
      .catch(err => done(err))
  });
  test('second route 3', () => {
    return request(app)
      .post('/lessons')
      .send({
        "teacherIds": [1],
        "title": "Spring",
        "days": [1],
        "firstDate": "2021-07-01",
        "lastDate": "2023-08-01"
      })
      .expect(400)
  });
  test('second route 3', () => {
    return request(app)
      .post('/lessons')
      .send({
        "teacherIds": [1],
        "title": "Spring",
        "days": [1],
        "firstDate": "2021-07-01",
        "lastDate": "2023-08-01"
      })
      .expect(400)
  });
  test('complex', async () => {
    const response = await request(app)
      .post('/lessons')
      .send({
        "teacherIds": [1],
        "title": "Complex lesson",
        "days": [0, 1, 2, 3, 4, 5, 6],
        "firstDate": "2023-07-01",
        "lessonsCount": 1
      });
    const ids = response.body.result;
    return await request(app)
      .get('/?date=2023-07-01')
      .then(response => {
        const lessonIds = response.body.result.map(lesson => lesson.id);
        expect(lessonIds.includes(ids[0])).toBeTruthy()
      })
  });
  afterAll(async () => {
    await sequelizeTest.close();
    await container.stop();
  });

});
