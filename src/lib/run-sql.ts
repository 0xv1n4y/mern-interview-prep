// Real PostgreSQL running inside the browser (PGlite, WebAssembly). Loaded only when first used.
// Every run starts from fresh sample data, so learners can INSERT / UPDATE / DROP freely.
import type { PGlite } from '@electric-sql/pglite'

export const SAMPLE_TABLES: { name: string; columns: string }[] = [
  { name: 'customers', columns: 'id, name, email, city, is_active, phone' },
  { name: 'orders', columns: 'id, customer_id → customers, amount, status, created_at' },
  { name: 'products', columns: 'id, name, category, price' },
  { name: 'order_items', columns: 'order_id → orders, product_id → products, quantity' },
  { name: 'departments', columns: 'id, name' },
  { name: 'employees', columns: 'id, name, department, department_id → departments, salary, manager_id → employees, joined_on' },
  { name: 'accounts', columns: 'id, owner, balance' },
  { name: 'students / courses / enrollments', columns: 'many-to-many example' },
]

const SEED = `
CREATE TABLE customers (
  id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL,
  city TEXT, is_active BOOLEAN NOT NULL DEFAULT true, phone TEXT
);
INSERT INTO customers (name, email, city, is_active, phone) VALUES
 ('Vinay', 'vinay@example.com', 'Hyderabad', true, '9000000001'),
 ('Ravi', 'ravi@example.com', 'Hyderabad', true, NULL),
 ('Anitha', 'anitha@example.com', 'Visakhapatnam', true, '9000000003'),
 ('Kiran', 'kiran@example.com', 'Bengaluru', false, NULL),
 ('Sneha', 'sneha@example.com', 'Hyderabad', true, '9000000005'),
 ('Arjun', 'arjun@example.com', 'Chennai', true, '9000000006'),
 ('Divya', 'divya@example.com', 'Visakhapatnam', true, NULL),
 ('Rahul', 'rahul@example.com', 'Pune', true, '9000000008'),
 ('Meena', 'meena@example.com', 'Hyderabad', false, '9000000009'),
 ('Suresh', 'suresh@example.com', 'Bengaluru', true, NULL);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY, customer_id INT NOT NULL REFERENCES customers(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0), status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO orders (customer_id, amount, status, created_at) VALUES
 (1, 1200, 'paid', NOW() - INTERVAL '40 days'), (1, 450, 'shipped', NOW() - INTERVAL '10 days'),
 (1, 3000, 'delivered', NOW() - INTERVAL '2 days'), (2, 800, 'paid', NOW() - INTERVAL '25 days'),
 (2, 150, 'cancelled', NOW() - INTERVAL '5 days'), (3, 2200, 'delivered', NOW() - INTERVAL '60 days'),
 (3, 999, 'shipped', NOW() - INTERVAL '1 day'), (5, 5400, 'paid', NOW() - INTERVAL '3 days'),
 (5, 700, 'delivered', NOW() - INTERVAL '15 days'), (6, 320, 'paid', NOW() - INTERVAL '8 days'),
 (8, 1500, 'delivered', NOW() - INTERVAL '30 days'), (8, 1500, 'paid', NOW() - INTERVAL '4 days'),
 (10, 2750, 'shipped', NOW() - INTERVAL '6 days');

CREATE TABLE products (id SERIAL PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price NUMERIC(10,2) NOT NULL);
INSERT INTO products (name, category, price) VALUES
 ('Laptop stand', 'accessories', 1200), ('Mechanical keyboard', 'accessories', 3500), ('USB-C hub', 'accessories', 1500),
 ('JavaScript book', 'books', 450), ('SQL book', 'books', 550), ('Headphones', 'audio', 2200), ('Webcam', 'video', 2750);

CREATE TABLE order_items (order_id INT REFERENCES orders(id), product_id INT REFERENCES products(id), quantity INT NOT NULL DEFAULT 1, PRIMARY KEY (order_id, product_id));
INSERT INTO order_items VALUES (1,1,1),(2,4,1),(3,2,1),(4,5,1),(6,6,1),(7,4,2),(8,2,1),(8,7,1),(9,6,1),(11,3,1),(12,3,1),(13,7,1);

CREATE TABLE departments (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO departments (name) VALUES ('Engineering'), ('Sales'), ('HR'), ('Marketing');

CREATE TABLE employees (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL,
  department_id INT REFERENCES departments(id), salary NUMERIC(10,2) NOT NULL,
  manager_id INT REFERENCES employees(id), joined_on DATE NOT NULL
);
INSERT INTO employees (name, department, department_id, salary, manager_id, joined_on) VALUES
 ('Lakshmi', 'Engineering', 1, 150000, NULL, '2018-04-01'),
 ('Vinay', 'Engineering', 1, 90000, 1, '2023-07-01'),
 ('Ravi', 'Engineering', 1, 120000, 1, '2020-01-15'),
 ('Priya', 'Engineering', 1, 120000, 1, '2021-03-10'),
 ('Sanjay', 'Sales', 2, 110000, NULL, '2019-06-20'),
 ('Anil', 'Sales', 2, 65000, 5, '2022-09-01'),
 ('Pooja', 'Sales', 2, 72000, 5, '2021-11-11'),
 ('Neha', 'HR', 3, 80000, NULL, '2019-02-02'),
 ('Kavya', 'HR', 3, 55000, 8, '2024-01-08'),
 ('Imran', 'Marketing', 4, 95000, NULL, '2020-08-08'),
 ('Deepa', 'Marketing', 4, 60000, 10, '2023-05-05'),
 ('Vinay', 'Marketing', 4, 58000, 10, '2024-02-14');

CREATE TABLE accounts (id SERIAL PRIMARY KEY, owner TEXT NOT NULL, balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0));
INSERT INTO accounts (owner, balance) VALUES ('Vinay', 5000), ('Ravi', 2000);

CREATE TABLE students (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE courses (id SERIAL PRIMARY KEY, title TEXT NOT NULL);
CREATE TABLE enrollments (student_id INT REFERENCES students(id), course_id INT REFERENCES courses(id), PRIMARY KEY (student_id, course_id));
INSERT INTO students (name) VALUES ('Asha'), ('Bala'), ('Chitra');
INSERT INTO courses (title) VALUES ('React'), ('Node.js'), ('PostgreSQL');
INSERT INTO enrollments VALUES (1,1),(1,2),(2,2),(2,3),(3,1);
`

export type SqlResult = { fields: string[]; rows: Record<string, unknown>[]; affected?: number; command?: string }
export type SqlRun = { results: SqlResult[]; error?: string; hint?: string; ms: number }

let dbPromise: Promise<PGlite> | null = null
async function getDb(): Promise<PGlite> {
  dbPromise ??= import('@electric-sql/pglite').then(async ({ PGlite }) => new PGlite())
  return dbPromise
}

/** Is the database already downloaded? (first load is ~3 MB) */
export const sqlReady = () => dbPromise !== null

export async function runSql(sql: string): Promise<SqlRun> {
  const t0 = performance.now()
  const db = await getDb()
  // Fresh sample data every run. If the learner creates a table that already exists in the sample,
  // drop it first so CREATE TABLE examples work as written.
  const created = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)].map((m) => m[1].toLowerCase())
  await db.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; SET search_path TO public;' + SEED
    + created.map((t) => `DROP TABLE IF EXISTS ${t} CASCADE;`).join(''))
  try {
    const out = await db.exec(sql)
    const results: SqlResult[] = out.map((r) => ({
      fields: r.fields.map((f) => f.name),
      rows: r.rows as Record<string, unknown>[],
      affected: r.affectedRows,
    }))
    return { results, ms: Math.round(performance.now() - t0) }
  } catch (err) {
    const message = (err as Error).message || String(err)
    // Leave any open transaction so the next run starts clean.
    await db.exec('ROLLBACK').catch(() => {})
    const missing = message.match(/relation "([^"]+)" does not exist/)
    return {
      results: [], error: message, ms: Math.round(performance.now() - t0),
      hint: missing ? `The table "${missing[1]}" isn't in the sample database. Add a CREATE TABLE for it, or use the sample tables (customers, orders, employees…).` : undefined,
    }
  }
}
