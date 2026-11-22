# Node.js & Express

The most-asked Node.js & Express interview questions, explained simply: short answer, everyday example, code and a point-wise interview answer. **19 questions**, of which **12 are ★ must-ask**. Open a question and use the **Practice** tab to answer by typing or speaking and get AI feedback.

## Key terms in plain English

| Term | What it means (simply) |
|---|---|
| Runtime | A program that runs your code. Node.js is a runtime that runs JavaScript outside the browser. |
| Server | A computer program that listens for requests and sends back responses. |
| Request / Response | The browser asks for something (request); the server replies (response). |
| API | A set of URLs another program can call to get or change data. |
| REST | A simple style of designing APIs using URLs and HTTP methods (GET, POST, PUT, DELETE). |
| Endpoint / Route | One specific API URL, like `GET /api/users`. |
| Middleware | A function that runs between receiving a request and sending the response. |
| Non-blocking I/O | Node starts a slow task (database, file) and keeps serving others instead of waiting. |
| npm | Node Package Manager: installs libraries other developers wrote. |
| JWT | JSON Web Token: a signed "ID card" the server gives after login. |
| Hashing | Turning a password into scrambled text that can't be turned back. |
| CORS | A browser safety rule that controls which websites may call your API. |
| Environment variable | A setting (like a password or URL) stored outside the code. |

## Node.js basics

### What is Node.js? {basic} {star}

:::quick
Node.js is a **runtime** that lets you run JavaScript on the **server**, outside the browser. It is built on Chrome's V8 engine and uses **non-blocking, event-driven** I/O.
:::

:::simple
Before Node, JavaScript could only live inside the browser. Node gave JavaScript a "house" on the server, so the same language can build both the website and its backend.
:::

**📘 Explanation**

- Great for APIs, real-time apps (chat), and streaming.
- Not ideal for heavy CPU work (video processing, big calculations) on the main thread.
- Same language on frontend and backend = faster development in the MERN stack.

:::say
- Node.js is a JavaScript runtime built on V8 for server-side code.
- Its non-blocking, event-driven model handles many requests efficiently on one thread.
- I use it with Express to build REST APIs for my React apps.
:::

### Why is Node.js single-threaded? How does it handle many requests? {mid} {star}

:::quick
Node runs your JavaScript on **one main thread**, but slow work (database queries, file reads, network calls) is handed off to the system (via **libuv**). While waiting, Node serves other requests. When the work finishes, its callback is queued and the **event loop** runs it.
:::

:::simple
One waiter in a restaurant takes orders from all tables and gives them to the kitchen. He doesn't stand at the kitchen waiting; he serves other tables, and brings food when the kitchen rings the bell.
:::

:::say
- Node uses one thread for JavaScript plus non-blocking I/O.
- It never waits on the database or network, so one process can handle thousands of connections.
- For CPU-heavy tasks I would use worker threads or a separate service.
:::

:::warn
Saying "Node can't handle many users because it's single-threaded". The I/O work happens in the background; only JavaScript execution is single-threaded.
:::

### What is npm? What is package.json? {basic} {star}

:::quick
**npm** installs packages (libraries). **package.json** lists your project's name, scripts and dependencies. **package-lock.json** locks exact versions so everyone installs the same thing.
:::

```bash
npm init -y                 # create package.json
npm install express         # add a dependency
npm install -D nodemon      # add a dev-only dependency
npm run dev                 # run a script from package.json

// package.json
{
  "scripts": { "dev": "nodemon src/server.js", "start": "node src/server.js" },
  "dependencies": { "express": "^4.19.2" },
  "devDependencies": { "nodemon": "^3.1.0" }
}
```

### What is the difference between CommonJS (require) and ES Modules (import)? {basic}

:::quick
**CommonJS** uses `require` / `module.exports` (older Node default). **ES Modules** use `import` / `export` (modern standard, used in React too). Enable ESM in Node with `"type": "module"` in package.json.
:::

```js
// CommonJS
const express = require('express');
module.exports = router;

// ES Modules
import express from 'express';
export default router;
```

### What are streams in Node.js? {mid}

:::quick
Streams read or write data **piece by piece** instead of loading everything into memory. Used for big files, video, and file uploads/downloads.
:::

:::simple
Watching a movie on YouTube (streaming) instead of downloading the whole 2 GB file first.
:::

```js
const fs = require('fs');
// Send a large file without loading it fully into memory
app.get('/download', (req, res) => {
  fs.createReadStream('big-report.csv').pipe(res);
});
```

### process.nextTick vs setImmediate vs setTimeout {adv}

:::quick
`process.nextTick` runs **right after the current operation**, before anything else. Promise callbacks run next. `setTimeout(fn, 0)` and `setImmediate` run in later phases of the event loop.
:::

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
// sync → nextTick → promise → timeout / immediate (order of these two can vary)
```

## Express.js

### What is Express.js? {basic} {star}

:::quick
Express is a small, popular **web framework** for Node.js. It makes it easy to create routes, use middleware and send responses, so you can build REST APIs quickly.
:::

```js
const express = require('express');
const app = express();

app.use(express.json());                     // read JSON request bodies

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(4000, () => console.log('Server running on port 4000'));
```

:::say
- Express is a minimal framework on top of Node's HTTP module.
- It gives routing, middleware and helpers like res.json, so I can focus on business logic.
:::

### What is middleware? {basic} {star}

:::quick
Middleware is a function with `(req, res, next)` that runs **between the request and the response**. It can read or change the request, stop the request (send a response), or call `next()` to pass control on.
:::

:::simple
Airport security checks: ticket check → baggage scan → passport check → boarding. Each checkpoint can let you pass (`next()`) or stop you.
:::

**📘 Explanation**

- Types: application-level (`app.use`), router-level, built-in, third-party, and **error-handling** middleware (4 arguments).
- Order matters: middleware runs in the order you add it.

```js
// Custom logger middleware
function logger(req, res, next) {
  console.log(req.method, req.url);
  next();                              // pass to the next middleware/route
}
app.use(logger);

// Built-in and third-party middleware
app.use(express.json());               // parse JSON body
app.use(cors());                       // allow other origins
app.use(helmet());                     // security headers
```

:::say
- Middleware are functions that run in order on each request, with access to req, res and next.
- I use them for parsing, logging, authentication, validation and central error handling.
:::

### What is the difference between req.params, req.query and req.body? {basic}

:::quick
`params` = values in the URL path, `query` = values after `?`, `body` = data sent in POST/PUT requests.
:::

```js
// GET /api/users/42?sort=name
app.get('/api/users/:id', (req, res) => {
  req.params.id;   // '42'     (part of the path)
  req.query.sort;  // 'name'   (after the ?)
});

// POST /api/users  with JSON { "name": "Vinay" }
app.post('/api/users', (req, res) => {
  req.body.name;   // 'Vinay'  (needs app.use(express.json()))
});
```

### What is a REST API? Explain HTTP methods and status codes {basic} {star}

:::quick
A REST API uses **URLs for things (resources)** and **HTTP methods for actions**: `GET` read, `POST` create, `PUT` replace, `PATCH` update part, `DELETE` remove. It returns proper **status codes**.
:::

**📘 Explanation**

- **2xx success:** 200 OK, 201 Created, 204 No Content.
- **4xx client error:** 400 Bad Request, 401 Unauthorized (not logged in), 403 Forbidden (not allowed), 404 Not Found, 409 Conflict (duplicate).
- **5xx server error:** 500 Internal Server Error.

**REST endpoints**

```text
GET    /api/products        → list products        200
GET    /api/products/5      → one product          200 / 404
POST   /api/products        → create               201
PATCH  /api/products/5      → update some fields   200
DELETE /api/products/5      → delete               204
```

:::say
- REST uses nouns in URLs and HTTP verbs for actions, and is stateless.
- I return precise status codes, such as 201 for created, 401 vs 403 for auth, and 404 when not found.
:::

### How do you structure an Express project? {mid} {star}

:::quick
Split code by responsibility: **routes** (URLs) → **controllers** (handle request/response) → **services** (business logic) → **models** (database). Keep config, middleware and utilities in their own folders.
:::

```text
src/
  server.js            # starts the app
  app.js               # express setup + middleware + routes
  config/db.js         # database connection
  routes/user.routes.js
  controllers/user.controller.js
  services/user.service.js
  models/user.model.js
  middleware/auth.js, errorHandler.js
  utils/
```

:::say
- Routes only map URLs, controllers stay thin, services hold business rules, and models talk to the database. This makes the code easy to test and maintain.
:::

### Write a simple CRUD API with Express {basic}

```js
// routes/product.routes.js
const router = require('express').Router();
const Product = require('../models/product.model');

router.get('/', async (req, res, next) => {
  try { res.json(await Product.find()); } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try { res.status(201).json(await Product.create(req.body)); } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try { await Product.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (err) { next(err); }
});

module.exports = router;
// app.js:  app.use('/api/products', require('./routes/product.routes'));
```

### How do you handle errors in Express? {mid} {star}

:::quick
Catch errors in routes and pass them to `next(err)`. Add **one error-handling middleware at the end** (it has 4 arguments) that logs the error and sends a clean JSON response. Never send stack traces to users.
:::

```js
// Wrapper so you don't repeat try/catch in every route
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  res.json(user);
}));

// Error handler: must be LAST and have 4 parameters
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong' });
});
```

:::say
- All errors flow to one central error middleware, so every response has the same format and internal details stay in the logs.
:::

### How do you validate request data? {mid}

:::quick
**Never trust data from the client.** Validate the body, params and query before using them, with a library like **Joi**, **Zod** or **express-validator**, and return 400 with clear messages.
:::

```js
const Joi = require('joi');
const userSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18),
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    next();
  };
}
router.post('/', validate(userSchema), createUser);
```

## Authentication and security

### How does JWT authentication work? {mid} {star}

:::quick
1) User logs in with email + password. 2) Server checks the password and creates a **JWT** (signed token with the user id and role). 3) Client sends the token with every request. 4) Middleware **verifies** the token before allowing access.
:::

:::simple
Like a cinema ticket: once you pay at the counter (login), you get a stamped ticket (JWT). At the hall door, staff just check the stamp (verify); they don't ask you to pay again.
:::

**📘 Explanation**

- A JWT has 3 parts: **header.payload.signature**. The payload is readable (not encrypted), so never put passwords in it.
- The **signature** proves the server created it and that nobody changed it.
- Keep tokens **short-lived**; use a refresh token to get new ones.
- Store in an **HttpOnly cookie** (safer from XSS) or in memory.

```js
const jwt = require('jsonwebtoken');

// Login
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];   // "Bearer <token>"
  if (!token) return res.status(401).json({ message: 'Login required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Role check
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Access denied' });

app.get('/api/admin/stats', auth, allow('admin'), getStats);
```

:::say
- After login the server signs a JWT with the user id and role; each request sends it, and auth middleware verifies it.
- Authentication = who you are (401); authorisation = what you're allowed to do (403).
- In VTMS I used JWT with role-based access for teachers, schools and admins.
:::

### How do you store passwords securely? {basic} {star}

:::quick
Never store plain passwords. **Hash** them with **bcrypt** (which adds a random **salt** and is deliberately slow). At login, compare the typed password with the stored hash.
:::

:::simple
Hashing is like a meat grinder: you can turn meat into mince, but you can't turn mince back into meat.
:::

```js
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('myPassword123', 10);       // save this
const ok = await bcrypt.compare('myPassword123', hash);    // true at login
```

### What is CORS? {basic} {star}

:::quick
CORS (Cross-Origin Resource Sharing) is a browser rule: a page from one origin (e.g. `localhost:3000`) can't call an API on another origin (`localhost:4000`) unless the server allows it.
:::

```js
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
```

:::say
- CORS is enforced by the browser. I allow only my frontend's origin, never all origins in production.
:::

### What are environment variables? {basic} {star}

:::quick
Settings like database URLs, API keys and JWT secrets are kept **outside the code** in environment variables (a `.env` file locally), so secrets aren't pushed to GitHub and each environment (dev/production) can have different values.
:::

```js
# .env  (add .env to .gitignore!)
PORT=4000
MONGO_URI=mongodb+srv://...
JWT_SECRET=a-long-random-secret

// server.js
require('dotenv').config();
app.listen(process.env.PORT);
```

### How do you secure an Express API? {mid}

:::quick
Security is layers: validate input, protect passwords, limit requests, restrict origins and check permissions on every request.
:::

**📘 Explanation**

- **Validate all input** (Joi/Zod).
- **Hash passwords** (bcrypt).
- **Helmet** for security headers.
- **Rate limiting** on login and public APIs (express-rate-limit).
- **CORS** restricted to known origins.
- **Never** build database queries from raw user input (prevents injection).
- Keep secrets in environment variables; use **HTTPS**.
- Check **authorisation** on the server for every protected route.

## Quick revision sheet

| Topic | Remember this |
|---|---|
| Node.js | JavaScript runtime on V8; non-blocking, event-driven I/O. |
| Single thread | One JS thread + background I/O; never block it with heavy CPU work. |
| Express | Minimal framework: routing, middleware, helpers. |
| Middleware | (req, res, next); runs in order; call next() or send a response. |
| params / query / body | /users/:id · ?sort=name · POST JSON data. |
| Status codes | 200 · 201 · 204 · 400 · 401 · 403 · 404 · 409 · 500. |
| Structure | routes → controllers → services → models. |
| Errors | next(err) → one 4-argument error middleware at the end. |
| JWT | Sign after login → send with each request → verify in middleware. |
| Passwords | bcrypt hash + compare; never store plain text. |
| Security | Validate, helmet, rate limit, CORS, env vars, HTTPS. |
