const request = require('supertest');
const createApp = require('../app/createApp');
const SequelizeMock = require('sequelize-mock');
const installer = require('../sequelize/installer');


describe('backend test', () => {
  let app;
  beforeAll(async () => {
    const DBConnectionMock = new SequelizeMock();
    installer.initModels(DBConnectionMock);
    app = createApp(DBConnectionMock);
  });
  test('first route', () => {
    return request(app)
        .get('/')
        .expect(200);
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
        .expect((res) => {
          if (res.body.error) {
            throw new Error(res.body.error);
          }
        });
  });
});
