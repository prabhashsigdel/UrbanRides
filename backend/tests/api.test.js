import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createAuth } from '../lib/auth.js';
import { createApp } from '../app.js';
import Vehicle from '../Models/Vehicle.js';
import Booking from '../Models/Booking.js';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'correct-horse-battery';

let mongo;
let app;

beforeAll(async () => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-that-is-long-enough-for-better-auth';
  process.env.BETTER_AUTH_URL = ORIGIN;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp(createAuth({ db: mongoose.connection.db }));
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

/** Signs a new user up and returns a supertest agent that carries their session cookie. */
async function signUp(email, extra = {}) {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/sign-up/email')
    .set('Origin', ORIGIN)
    .send({ name: 'Test User', email, password: PASSWORD, ...extra });
  expect(res.status).toBe(200);
  return { agent, user: res.body.user };
}

async function signUpAdmin(email = 'admin@example.com') {
  const session = await signUp(email);
  await mongoose.connection.db.collection('user').updateOne({ email }, { $set: { role: 'admin' } });
  return session;
}

const bookingFor = (vehicleId) => ({
  vehicleId: String(vehicleId),
  pickupLocation: 'Thamel, Kathmandu',
  pickupDate: '2030-01-10',
  pickupTime: '10:00',
  returnLocation: 'Thamel, Kathmandu',
  returnDate: '2030-01-12',
  returnTime: '10:00',
  phoneNumber: '9800000000',
});

describe('sign-up', () => {
  it('ignores role and isAdmin sent in the sign-up body', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', ORIGIN)
      .send({ name: 'Sneaky', email: 'sneaky@example.com', password: PASSWORD, role: 'admin', isAdmin: true });

    const stored = await mongoose.connection.db.collection('user').findOne({ email: 'sneaky@example.com' });
    // Better Auth either rejects the field or drops it; either way no admin account exists.
    expect(stored?.role ?? 'user').toBe('user');
    expect(stored?.isAdmin).toBeUndefined();
    expect([200, 400]).toContain(res.status);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', ORIGIN)
      .send({ name: 'Short', email: 'short@example.com', password: 'abc123' });
    expect(res.status).toBe(400);
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    await signUp('known@example.com');
    const unknown = await request(app).post('/api/auth/sign-in/email').set('Origin', ORIGIN)
      .send({ email: 'nobody@example.com', password: PASSWORD });
    const wrong = await request(app).post('/api/auth/sign-in/email').set('Origin', ORIGIN)
      .send({ email: 'known@example.com', password: 'wrong-password-123' });
    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body.message).toBe(wrong.body.message);
  });
});

describe('vehicles', () => {
  const car = { type: 'car', model: 'Suzuki Swift', pricePerDay: 5000 };

  it('lets anyone list vehicles', async () => {
    await Vehicle.create(car);
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('answers 401 to changes from signed-out visitors', async () => {
    const vehicle = await Vehicle.create(car);
    expect((await request(app).post('/api/vehicles').send(car)).status).toBe(401);
    expect((await request(app).put(`/api/vehicles/${vehicle._id}`).send({ pricePerDay: 1 })).status).toBe(401);
    expect((await request(app).delete(`/api/vehicles/${vehicle._id}`)).status).toBe(401);
  });

  it('answers 403 to changes from signed-in non-admins', async () => {
    const vehicle = await Vehicle.create(car);
    const { agent } = await signUp('rider@example.com');
    expect((await agent.post('/api/vehicles').send(car)).status).toBe(403);
    expect((await agent.delete(`/api/vehicles/${vehicle._id}`)).status).toBe(403);
    expect(await Vehicle.countDocuments()).toBe(1);
  });

  it('lets admins add, edit and delete vehicles', async () => {
    const { agent } = await signUpAdmin();
    const created = await agent.post('/api/vehicles').send(car);
    expect(created.status).toBe(201);

    const updated = await agent.put(`/api/vehicles/${created.body._id}`).send({ pricePerDay: 5500, _id: 'nope' });
    expect(updated.status).toBe(200);
    expect(updated.body.pricePerDay).toBe(5500);

    expect((await agent.delete(`/api/vehicles/${created.body._id}`)).status).toBe(200);
    expect(await Vehicle.countDocuments()).toBe(0);
  });

  it('refuses writes sent from an untrusted origin, even with an admin session', async () => {
    const { agent } = await signUpAdmin();
    const res = await agent.post('/api/vehicles').set('Origin', 'https://evil.example').send(car);
    expect(res.status).toBe(403);
    expect(await Vehicle.countDocuments()).toBe(0);
    expect((await agent.post('/api/vehicles').set('Origin', ORIGIN).send(car)).status).toBe(201);
  });

  it('answers 404 for a malformed vehicle id', async () => {
    const { agent } = await signUpAdmin();
    expect((await agent.delete('/api/vehicles/not-an-id')).status).toBe(404);
  });
});

describe('bookings', () => {
  let vehicle;
  beforeEach(async () => {
    vehicle = await Vehicle.create({ type: 'bike', model: 'Honda Dio', pricePerDay: 1000 });
  });

  it('needs a signed-in user', async () => {
    expect((await request(app).get('/api/bookings')).status).toBe(401);
    expect((await request(app).post('/api/bookings').send(bookingFor(vehicle._id))).status).toBe(401);
  });

  it('saves the booking against the signed-in user, not the request body', async () => {
    const { agent, user } = await signUp('rider@example.com');
    const res = await agent.post('/api/bookings').send({ ...bookingFor(vehicle._id), userId: 'someone-else' });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(user.id);
  });

  it('only lists your own bookings', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    await alice.agent.post('/api/bookings').send(bookingFor(vehicle._id));

    const aliceList = await alice.agent.get('/api/bookings');
    const bobList = await bob.agent.get('/api/bookings');
    expect(aliceList.body).toHaveLength(1);
    expect(aliceList.body[0].vehicleId.model).toBe('Honda Dio');
    expect(bobList.body).toHaveLength(0);
  });

  it("won't let one user cancel another user's booking", async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    const { body: booking } = await alice.agent.post('/api/bookings').send(bookingFor(vehicle._id));

    expect((await bob.agent.delete(`/api/bookings/${booking._id}`)).status).toBe(404);
    expect(await Booking.countDocuments()).toBe(1);
    expect((await alice.agent.delete(`/api/bookings/${booking._id}`)).status).toBe(200);
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('rejects invalid bookings', async () => {
    const { agent } = await signUp('rider@example.com');
    const backwards = await agent.post('/api/bookings').send({ ...bookingFor(vehicle._id), returnDate: '2030-01-01' });
    expect(backwards.status).toBe(400);

    const missing = await agent.post('/api/bookings').send(bookingFor(new mongoose.Types.ObjectId()));
    expect(missing.status).toBe(404);

    await Vehicle.updateOne({ _id: vehicle._id }, { available: false });
    const unavailable = await agent.post('/api/bookings').send(bookingFor(vehicle._id));
    expect(unavailable.status).toBe(409);
  });
});
