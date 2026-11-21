# SQL & PostgreSQL

The most-asked SQL & PostgreSQL interview questions, explained simply: short answer, everyday example, code and a point-wise interview answer. **18 questions**, of which **10 are ★ must-ask**. Open a question and use the **Practice** tab to answer by typing or speaking and get AI feedback.

## Key terms in plain English

| Term | What it means (simply) |
|---|---|
| Table | Data stored in rows and columns, like an Excel sheet. |
| Row / Record | One entry in a table (one customer). |
| Column / Field | One property of every row (name, email). |
| Primary key | A column that uniquely identifies each row, like a roll number. |
| Foreign key | A column that points to the primary key of another table, linking them. |
| Query | A question you ask the database, written in SQL. |
| JOIN | Combining rows from two tables using a related column. |
| Aggregate function | Calculates one value from many rows: COUNT, SUM, AVG, MIN, MAX. |
| Index | A sorted shortcut that helps the database find rows quickly. |
| Transaction | A group of SQL steps that must all succeed or all fail together. |
| Normalisation | Organising tables so the same data isn't repeated in many places. |
| Constraint | A rule the database enforces, like NOT NULL or UNIQUE. |

## SQL basics

### What is SQL? What is PostgreSQL? {basic} {star}

:::quick
**SQL** (Structured Query Language) is the language for working with relational databases: storing, reading, updating and deleting data in tables. **PostgreSQL** is a powerful, free, open-source relational database that uses SQL, with extras like JSONB, full-text search and strong reliability.
:::

:::simple
SQL is the language; PostgreSQL is one of the "shops" that understands it (others: MySQL, Oracle, SQL Server).
:::

:::say
- SQL is the standard language for relational databases.
- PostgreSQL is an open-source relational database known for reliability, strong transactions and features like JSONB.
- I used PostgreSQL with Node.js in my Classroom Monitoring project.
:::

### What are the types of SQL commands (DDL, DML, DQL, DCL, TCL)? {basic}

```sql
DDL (structure):    CREATE, ALTER, DROP, TRUNCATE
DML (change data):  INSERT, UPDATE, DELETE
DQL (read data):    SELECT
DCL (permissions):  GRANT, REVOKE
TCL (transactions): BEGIN, COMMIT, ROLLBACK
```

### What are primary key and foreign key? {basic} {star}

:::quick
A **primary key** uniquely identifies each row (unique + not null). A **foreign key** in one table points to the primary key of another table, creating a relationship and preventing invalid links.
:::

:::simple
Your Aadhaar number is your primary key: unique to you. Your bank account form has a field "Aadhaar number" pointing to you: that's a foreign key.
:::

**📘 Explanation**

- Other constraints: `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`.

```sql
CREATE TABLE customers (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),   -- foreign key
  amount      NUMERIC(10,2) CHECK (amount > 0),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### DELETE vs TRUNCATE vs DROP {basic}

:::quick
`DELETE` removes chosen rows (can use WHERE, can be rolled back). `TRUNCATE` removes **all** rows quickly but keeps the table. `DROP` removes the **whole table** (structure and data).
:::

:::simple
DELETE = erase some lines from a notebook. TRUNCATE = tear out all pages but keep the cover. DROP = throw the notebook away.
:::

### Basic queries: SELECT, WHERE, ORDER BY, LIMIT, LIKE, IN, BETWEEN {basic}

```sql
SELECT name, email FROM customers WHERE city = 'Hyderabad';
SELECT * FROM products WHERE price BETWEEN 100 AND 500 ORDER BY price DESC LIMIT 10;
SELECT * FROM customers WHERE name LIKE 'V%';             -- starts with V
SELECT * FROM orders WHERE status IN ('paid', 'shipped');
SELECT * FROM customers WHERE phone IS NULL;              -- not "= NULL"
SELECT DISTINCT city FROM customers;
```

## Joins, grouping and common queries

### Explain the types of JOINs {basic} {star}

:::quick
**INNER JOIN:** only rows that match in both tables. **LEFT JOIN:** all rows from the left table + matches from the right (NULL if none). **RIGHT JOIN:** opposite of LEFT. **FULL JOIN:** all rows from both. **SELF JOIN:** a table joined with itself.
:::

:::simple
Two lists: students and their exam results. INNER = only students who wrote the exam. LEFT = all students, with blank results for those who didn't write it.
:::

```sql
-- Customers with their orders (only those who ordered)
SELECT c.name, o.amount
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;

-- ALL customers, even those with no orders
SELECT c.name, o.amount
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;

-- Customers who never ordered
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

:::say
- INNER returns only matches; LEFT keeps every row from the left table.
- A common trick: LEFT JOIN + WHERE right.id IS NULL finds rows with no match.
:::

### WHERE vs HAVING, and GROUP BY {basic} {star}

:::quick
`GROUP BY` groups rows so you can use COUNT, SUM, AVG on each group. `WHERE` filters **rows before** grouping. `HAVING` filters **groups after** grouping.
:::

```sql
-- Cities with more than 5 customers
SELECT city, COUNT(*) AS total
FROM customers
WHERE is_active = true          -- filters rows first
GROUP BY city
HAVING COUNT(*) > 5             -- filters groups
ORDER BY total DESC;
```

:::warn
Using an aggregate like `COUNT(*)` inside WHERE. Aggregates belong in HAVING.
:::

### Find the second highest salary {basic} {star}

```sql
-- Method 1: subquery
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Method 2: OFFSET
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
OFFSET 1 LIMIT 1;

-- Method 3: window function (works for Nth highest)
SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) t WHERE rnk = 2;
```

:::hint2
Mention `DENSE_RANK` handles ties correctly, e.g. if two people share the top salary.
:::

### Find duplicate records {basic}

```sql
SELECT email, COUNT(*)
FROM customers
GROUP BY email
HAVING COUNT(*) > 1;
```

### Highest-paid employee in each department {mid}

:::quick
**Window functions** (`ROW_NUMBER`, `RANK`, `DENSE_RANK`) calculate over groups of rows **without collapsing them** like GROUP BY does.
:::

```sql
SELECT department, name, salary FROM (
  SELECT department, name, salary,
         ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
) t WHERE rn = 1;
```

### What is a subquery? What is a view? {mid}

:::quick
A **subquery** is a query inside another query. A **view** is a saved query that you can use like a table.
:::

```sql
-- Subquery: customers who spent more than the average
SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM orders GROUP BY customer_id
             HAVING SUM(amount) > (SELECT AVG(amount) FROM orders));

-- View
CREATE VIEW monthly_sales AS
SELECT date_trunc('month', created_at) AS month, SUM(amount) AS total
FROM orders GROUP BY 1;

SELECT * FROM monthly_sales;
```

## Indexes, transactions and design

### What is an index? How does it make queries faster? {mid} {star}

:::quick
An index is a sorted data structure (usually a **B-tree**) on one or more columns. The database jumps straight to matching rows instead of reading every row (**full table scan**). It speeds up reads but slows inserts/updates slightly and uses disk space.
:::

:::simple
A phone contact list sorted A–Z: you jump to "V" instead of scrolling through every contact.
:::

**📘 Explanation**

- Index columns used in **WHERE, JOIN and ORDER BY** frequently.
- Primary keys and UNIQUE columns get an index automatically.
- Don't index everything: each index slows writes.

```sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status_date ON orders(status, created_at);   -- composite

-- See how PostgreSQL runs the query
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
-- "Seq Scan" = reading every row (slow on big tables)
-- "Index Scan" = using the index (fast)
```

:::say
- An index is like a sorted lookup table that avoids full scans.
- To find slow queries I use EXPLAIN ANALYZE and check for sequential scans on large tables.
:::

### What is a transaction? Explain ACID {mid} {star}

:::quick
A transaction groups steps so they **all succeed or all fail**. **ACID:** **A**tomicity (all or nothing), **C**onsistency (rules stay valid), **I**solation (transactions don't disturb each other), **D**urability (saved data survives a crash).
:::

:::simple
A bank transfer: take ₹1000 from A **and** add ₹1000 to B. If the second step fails, the first must be undone, or money disappears.
:::

```sql
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
COMMIT;      -- save both
-- If anything fails: ROLLBACK;  (undo both)
```

:::say
- A transaction makes a group of changes all-or-nothing.
- In my Classroom Monitoring API, each batch of records is saved in one transaction with a unique key, so retries never create duplicates.
:::

### What is normalisation? {mid} {star}

:::quick
Organising tables to **remove repeated data** and avoid update mistakes. **1NF:** one value per cell. **2NF:** every column depends on the whole primary key. **3NF:** no column depends on another non-key column.
:::

:::simple
Instead of writing the customer's full address on every order, save it once in a customers table and just reference the customer id.
:::

**📘 Explanation**

- **Denormalisation** = adding some duplication on purpose for faster reads (e.g. reports).

### How do you design tables for a one-to-many and many-to-many relationship? {mid}

:::quick
**One-to-many:** put a foreign key in the "many" table (orders.customer_id). **Many-to-many:** create a **junction table** with two foreign keys.
:::

```sql
-- Many-to-many: students ↔ courses
CREATE TABLE enrollments (
  student_id INT REFERENCES students(id),
  course_id  INT REFERENCES courses(id),
  PRIMARY KEY (student_id, course_id)
);
```

### SQL vs NoSQL: when would you use each? {basic} {star}

:::quick
**SQL (PostgreSQL):** structured, related data that needs strong consistency: payments, orders, inventory, reports. **NoSQL (MongoDB):** flexible or nested data, fast-changing structure, very large scale: profiles, logs, catalogues.
:::

:::say
- I pick based on the data: highly related and transactional → PostgreSQL; flexible documents → MongoDB.
:::

### What is SQL injection and how do you prevent it? {basic} {star}

:::quick
An attacker types SQL code into an input, and if your code joins that text directly into a query, it runs. **Prevent it with parameterised queries** (placeholders), never string concatenation.
:::

```sql
// DANGEROUS
db.query("SELECT * FROM users WHERE email = '" + email + "'");
// if email = ' OR '1'='1  → returns ALL users

// SAFE (node-postgres)
db.query('SELECT * FROM users WHERE email = $1', [email]);
```

### How do you connect PostgreSQL with Node.js? {basic}

:::quick
Use the `pg` library with a **connection pool** (reuses connections) and parameterised queries. ORMs like Prisma or Sequelize are also common.
:::

```sql
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/api/customers/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM customers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});
```

## Quick revision sheet

| Topic | Remember this |
|---|---|
| Keys | Primary = unique row id; foreign = link to another table. |
| DELETE / TRUNCATE / DROP | Some rows / all rows / whole table. |
| JOINs | INNER = matches only; LEFT = all left + matches. |
| WHERE vs HAVING | WHERE filters rows; HAVING filters groups. |
| 2nd highest | MAX(...) WHERE < MAX, or OFFSET 1, or DENSE_RANK. |
| Window functions | ROW_NUMBER / RANK over PARTITION BY without collapsing rows. |
| Index | B-tree; EXPLAIN ANALYZE → Seq Scan vs Index Scan. |
| ACID | Atomic · Consistent · Isolated · Durable. |
| Normalisation | Remove duplicate data: 1NF, 2NF, 3NF. |
| Injection | Always use $1 placeholders, never string concatenation. |
