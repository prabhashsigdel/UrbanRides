import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createAuth } from '../lib/auth.js';
import { createApp } from '../app.js';
import Vehicle from '../Models/Vehicle.js';
import Booking from '../Models/Booking.js';
import { UPLOAD_DIR } from '../lib/uploads.js';

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

// Smallest valid PNG, so multer accepts it as an image.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const uploadExists = (fileName) => fs.existsSync(path.join(UPLOAD_DIR, fileName));

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

  it('deletes the old photo when a vehicle gets a new one or is removed', async () => {
    const { agent } = await signUpAdmin();
    const created = await agent.post('/api/vehicles')
      .field('type', 'car').field('model', 'Suzuki Swift').field('pricePerDay', '5000')
      .attach('image', PNG, { filename: 'first.png', contentType: 'image/png' });
    expect(created.status).toBe(201);
    const firstImage = created.body.image;
    expect(uploadExists(firstImage)).toBe(true);

    const priceOnly = await agent.put(`/api/vehicles/${created.body._id}`).field('pricePerDay', '5200');
    expect(priceOnly.body.image).toBe(firstImage);
    expect(uploadExists(firstImage)).toBe(true);

    const updated = await agent.put(`/api/vehicles/${created.body._id}`)
      .attach('image', PNG, { filename: 'second.png', contentType: 'image/png' });
    expect(updated.status).toBe(200);
    expect(uploadExists(firstImage)).toBe(false);
    expect(uploadExists(updated.body.image)).toBe(true);

    await agent.delete(`/api/vehicles/${created.body._id}`);
    expect(uploadExists(updated.body.image)).toBe(false);
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

  it('refuses a booking that overlaps another one for the same vehicle', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    expect((await alice.agent.post('/api/bookings').send(bookingFor(vehicle._id))).status).toBe(201);

    // 10th to 12th is taken: any range touching those days clashes, including the return day.
    const clashes = [['2030-01-09', '2030-01-10'], ['2030-01-11', '2030-01-11'], ['2030-01-12', '2030-01-14'], ['2030-01-01', '2030-01-30']];
    for (const [pickupDate, returnDate] of clashes) {
      const res = await bob.agent.post('/api/bookings').send({ ...bookingFor(vehicle._id), pickupDate, returnDate });
      expect(res.status, `${pickupDate} to ${returnDate}`).toBe(409);
    }

    const after = await bob.agent.post('/api/bookings').send({ ...bookingFor(vehicle._id), pickupDate: '2030-01-13', returnDate: '2030-01-14' });
    expect(after.status).toBe(201);
    const other = await Vehicle.create({ type: 'bike', model: 'Yamaha Ray', pricePerDay: 900 });
    expect((await bob.agent.post('/api/bookings').send(bookingFor(other._id))).status).toBe(201);
  });

  it('lets only one of two simultaneous bookings for the same dates through', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    const results = await Promise.all([
      alice.agent.post('/api/bookings').send(bookingFor(vehicle._id)),
      bob.agent.post('/api/bookings').send(bookingFor(vehicle._id)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Booking.countDocuments()).toBe(1);
  });

  it('limits each user to 10 booking attempts an hour', async () => {
    const { agent } = await signUp('rider@example.com');
    for (let i = 0; i < 10; i += 1) {
      const day = String(i * 3 + 1).padStart(2, '0');
      const res = await agent.post('/api/bookings').send({ ...bookingFor(vehicle._id), pickupDate: `2031-03-${day}`, returnDate: `2031-03-${day}` });
      expect(res.status).toBe(201);
    }
    const nextDay = { ...bookingFor(vehicle._id), pickupDate: '2031-04-01', returnDate: '2031-04-01' };
    const blocked = await agent.post('/api/bookings').send(nextDay);
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();

    const other = await signUp('other@example.com');
    expect((await other.agent.post('/api/bookings').send(nextDay)).status).toBe(201);
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

describe('admin', () => {
  let vehicle;
  beforeEach(async () => {
    vehicle = await Vehicle.create({ type: 'car', model: 'Hyundai Creta', pricePerDay: 8000 });
  });

  it('keeps the admin routes from regular users', async () => {
    const { agent } = await signUp('rider@example.com');
    expect((await request(app).get('/api/admin/bookings')).status).toBe(401);
    expect((await agent.get('/api/admin/bookings')).status).toBe(403);
    expect((await agent.get('/api/admin/stats')).status).toBe(403);
    expect((await agent.get('/api/auth/admin/list-users')).status).toBe(403);
  });

  it("lists everyone's bookings with the customer, and can cancel any of them", async () => {
    const alice = await signUp('alice@example.com');
    const { body: booking } = await alice.agent.post('/api/bookings').send(bookingFor(vehicle._id));
    const { agent } = await signUpAdmin();

    const list = await agent.get('/api/admin/bookings');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].customer.email).toBe('alice@example.com');
    expect(list.body[0].vehicleId.model).toBe('Hyundai Creta');

    expect((await agent.delete(`/api/admin/bookings/${booking._id}`)).status).toBe(200);
    expect(await Booking.countDocuments()).toBe(0);
    expect((await agent.delete(`/api/admin/bookings/${booking._id}`)).status).toBe(404);
  });

  it('summarises the fleet, takings and upcoming pickups', async () => {
    const alice = await signUp('alice@example.com');
    await alice.agent.post('/api/bookings').send(bookingFor(vehicle._id));
    const bike = await Vehicle.create({ type: 'bike', model: 'Honda Dio', pricePerDay: 1000 });
    await Vehicle.create({ type: 'bike', model: 'Yamaha Ray', pricePerDay: 900, available: false });
    // On hire right now: picked up yesterday, back tomorrow, so 2 days at Rs 1,000 this month.
    const day = 24 * 60 * 60 * 1000;
    const today = new Date(new Date().toISOString().slice(0, 10));
    await Booking.create({ ...bookingFor(bike._id), userId: alice.user.id, pickupDate: new Date(today - day), returnDate: new Date(+today + day) });
    const { agent } = await signUpAdmin();

    const { body } = await agent.get('/api/admin/stats');
    expect(body.fleet).toEqual({ onHire: 1, available: 1, unavailable: 1 });
    expect(body).toMatchObject({ users: 2, upcomingBookings: 1 });
    expect(body.bookingsByDay).toHaveLength(14);
    expect(body.bookingsByDay.at(-1).count).toBe(2);
    expect(body.revenueByMonth).toHaveLength(6);
    expect(body.nextPickups).toHaveLength(1);
    expect(body.nextPickups[0]).toMatchObject({ customer: 'Test User', vehicle: { model: 'Hyundai Creta' } });
  });

  it('lets admins list users, change roles and ban through Better Auth', async () => {
    const { user: rider } = await signUp('rider@example.com');
    const { agent } = await signUpAdmin();

    const users = await agent.get('/api/auth/admin/list-users');
    expect(users.status).toBe(200);
    expect(users.body.users.map((u) => u.email).sort()).toEqual(['admin@example.com', 'rider@example.com']);

    const asAdmin = (url, body) => agent.post(url).set('Origin', ORIGIN).send(body);
    expect((await asAdmin('/api/auth/admin/set-role', { userId: rider.id, role: 'admin' })).status).toBe(200);
    expect((await asAdmin('/api/auth/admin/ban-user', { userId: rider.id })).status).toBe(200);

    const signIn = await request(app).post('/api/auth/sign-in/email').set('Origin', ORIGIN)
      .send({ email: 'rider@example.com', password: PASSWORD });
    expect(signIn.status).toBe(403);
  });
});

describe('account password', () => {
  /** Stands in for a Google-only account: a signed-in user whose credential account has no password. */
  async function signUpWithoutPassword(email) {
    const session = await signUp(email);
    await mongoose.connection.db.collection('account').updateMany({ providerId: 'credential' }, { $unset: { password: '' } });
    return session;
  }

  it('lets an account without a password set one, then sign in with it', async () => {
    const { agent } = await signUpWithoutPassword('google@example.com');
    const res = await agent.post('/api/account/password').send({ newPassword: 'brand-new-password' });
    expect(res.status).toBe(200);

    const signIn = await request(app).post('/api/auth/sign-in/email').set('Origin', ORIGIN)
      .send({ email: 'google@example.com', password: 'brand-new-password' });
    expect(signIn.status).toBe(200);
  });

  it('refuses to overwrite an existing password, short passwords and signed-out callers', async () => {
    expect((await request(app).post('/api/account/password').send({ newPassword: 'whatever-password' })).status).toBe(401);

    const withPassword = await signUp('rider@example.com');
    expect((await withPassword.agent.post('/api/account/password').send({ newPassword: 'another-password' })).status).toBe(400);

    const { agent } = await signUpWithoutPassword('google@example.com');
    expect((await agent.post('/api/account/password').send({ newPassword: 'short' })).status).toBe(400);
    expect((await agent.post('/api/account/password').send({})).status).toBe(400);
  });
});

describe('profile and account deletion', () => {
  const del = (agent, body) => agent.post('/api/auth/delete-user').set('Origin', ORIGIN).send(body);

  it('lets a user rename themselves', async () => {
    const { agent } = await signUp('rider@example.com');
    const res = await agent.post('/api/auth/update-user').set('Origin', ORIGIN).send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect((await mongoose.connection.db.collection('user').findOne({ email: 'rider@example.com' })).name).toBe('New Name');
  });

  it('deletes the account and its bookings after checking the password', async () => {
    const vehicle = await Vehicle.create({ type: 'bike', model: 'Honda Dio', pricePerDay: 1000 });
    const { agent } = await signUp('rider@example.com');
    await agent.post('/api/bookings').send(bookingFor(vehicle._id));

    expect((await del(agent, { password: 'wrong-password-123' })).status).toBe(400);
    expect(await Booking.countDocuments()).toBe(1);

    expect((await del(agent, { password: PASSWORD })).status).toBe(200);
    expect(await mongoose.connection.db.collection('user').countDocuments({ email: 'rider@example.com' })).toBe(0);
    expect(await Booking.countDocuments()).toBe(0);
    expect((await agent.get('/api/bookings')).status).toBe(401);
  });

  it("won't let the only admin delete themselves", async () => {
    const { agent } = await signUpAdmin('boss@example.com');
    const res = await del(agent, { password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LAST_ADMIN');

    await signUpAdmin('second@example.com');
    expect((await del(agent, { password: PASSWORD })).status).toBe(200);
  });
});

describe('admin user moderation', () => {
  const flag = (agent, id, body) => agent.put(`/api/admin/users/${id}/flag`).send(body);

  it('flags and unflags a customer, and shows the flag in users and bookings', async () => {
    const vehicle = await Vehicle.create({ type: 'bike', model: 'Honda Dio', pricePerDay: 1000 });
    const rider = await signUp('rider@example.com');
    await rider.agent.post('/api/bookings').send(bookingFor(vehicle._id));
    const { agent } = await signUpAdmin();

    expect((await flag(agent, rider.user.id, { reason: '   ' })).status).toBe(400);
    expect((await flag(agent, rider.user.id, { reason: 'Returned the bike two days late' })).status).toBe(200);

    const list = await agent.get('/api/auth/admin/list-users');
    expect(list.body.users.find((u) => u.id === rider.user.id).flagReason).toBe('Returned the bike two days late');
    const bookings = await agent.get('/api/admin/bookings');
    expect(bookings.body[0].customer.flagReason).toBe('Returned the bike two days late');
    expect((await agent.get('/api/admin/users/booking-counts')).body).toEqual({ [rider.user.id]: 1 });

    expect((await agent.delete(`/api/admin/users/${rider.user.id}/flag`)).status).toBe(200);
    const after = await mongoose.connection.db.collection('user').findOne({ email: 'rider@example.com' });
    expect(after.flagReason).toBeUndefined();
  });

  it("won't let users flag anyone, or clear a flag on themselves", async () => {
    const rider = await signUp('rider@example.com');
    const { agent, user: admin } = await signUpAdmin();
    expect((await flag(rider.agent, admin.id, { reason: 'nope' })).status).toBe(403);
    expect((await flag(agent, admin.id, { reason: 'self' })).status).toBe(400);

    await flag(agent, rider.user.id, { reason: 'No-show twice' });
    await rider.agent.post('/api/auth/update-user').set('Origin', ORIGIN).send({ flagReason: null, name: 'Rider' });
    const stored = await mongoose.connection.db.collection('user').findOne({ email: 'rider@example.com' });
    expect(stored.flagReason).toBe('No-show twice');
  });

  it('bans with a reason that the users list returns', async () => {
    const rider = await signUp('rider@example.com');
    const { agent } = await signUpAdmin();
    await agent.post('/api/auth/admin/ban-user').set('Origin', ORIGIN)
      .send({ userId: rider.user.id, banReason: 'Damaged a car', banExpiresIn: 7 * 24 * 60 * 60 });
    const list = await agent.get('/api/auth/admin/list-users');
    const banned = list.body.users.find((u) => u.id === rider.user.id);
    expect(banned).toMatchObject({ banned: true, banReason: 'Damaged a car' });
    expect(new Date(banned.banExpires) > new Date()).toBe(true);
  });

  it('switches a vehicle off the road with a plain JSON update', async () => {
    const vehicle = await Vehicle.create({ type: 'car', model: 'Suzuki Swift', pricePerDay: 5000 });
    const { agent } = await signUpAdmin();
    const res = await agent.put(`/api/vehicles/${vehicle._id}`).send({ available: false });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ available: false, model: 'Suzuki Swift', pricePerDay: 5000 });
  });
});

describe('vehicle specs', () => {
  it('saves optional specs, clears them when sent blank, and rejects bad values', async () => {
    const { agent } = await signUpAdmin();
    const created = await agent.post('/api/vehicles')
      .field('type', 'car').field('model', 'Suzuki Alto 800').field('pricePerDay', '3500')
      .field('seats', '5').field('transmission', 'manual').field('fuel', 'petrol').field('mileage', '22');
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ seats: 5, transmission: 'manual', fuel: 'petrol', mileage: 22 });

    const cleared = await agent.put(`/api/vehicles/${created.body._id}`).field('mileage', '').field('fuel', '');
    expect(cleared.status).toBe(200);
    expect(cleared.body.mileage).toBeUndefined();
    expect(cleared.body.fuel).toBeUndefined();
    expect(cleared.body.seats).toBe(5);

    expect((await agent.put(`/api/vehicles/${created.body._id}`).send({ fuel: 'coal' })).status).toBe(400);
    expect((await agent.put(`/api/vehicles/${created.body._id}`).send({ seats: 0 })).status).toBe(400);
    expect((await agent.put(`/api/vehicles/${created.body._id}`).send({ mileage: 'lots' })).status).toBe(400);
  });
});
