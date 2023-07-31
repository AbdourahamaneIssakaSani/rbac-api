/* eslint-disable no-undef */
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../index"); // accessing app from the exported object
const {
  setupRateLimiter,
  teardownRateLimiter,
} = require("../src/middlewares/rate.guard");

let server;

beforeAll(async () => {
  await setupRateLimiter();
  await mongoose.connect(process.env.V1_MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  server = app.listen(process.env.PORT);
}, 10000);

afterAll(async () => {
  await teardownRateLimiter();
  await server.close();
  await mongoose.connection.close();
  await new Promise((resolve) => setTimeout(resolve, 500));
}, 10000);

describe("Server", () => {
  it("should start and show the welcome message", async () => {
    const res = await request(server).get("/");
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe("RBAC System Server is running");
  }, 10000);
});
