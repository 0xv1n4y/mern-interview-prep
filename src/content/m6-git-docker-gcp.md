# Git, GitHub, Docker & GCP

The most-asked Git, GitHub, Docker & GCP interview questions, explained simply: short answer, everyday example, code and a point-wise interview answer. **21 questions**, of which **13 are ★ must-ask**. Open a question and use the **Practice** tab to answer by typing or speaking and get AI feedback.

## Key terms in plain English

| Term | What it means (simply) |
|---|---|
| Version control | A system that saves every change to your code, so you can see history and go back. |
| Repository (repo) | A project folder tracked by Git, including its full history. |
| Commit | A saved snapshot of your changes, with a message. |
| Branch | A separate line of work, so you can build a feature without touching the main code. |
| Merge | Combining the changes from one branch into another. |
| Pull request (PR) | A request on GitHub to merge your branch, where teammates review the code. |
| Container | A small, isolated box that runs an app with everything it needs. |
| Image | The recipe/template used to create containers. |
| Dockerfile | A text file with step-by-step instructions to build an image. |
| Cloud | Renting computers, storage and services over the internet instead of buying servers. |
| VM (virtual machine) | A full computer created in software, running on a real server. |
| CI/CD | Automatically testing (CI) and deploying (CD) code whenever you push changes. |

## Git and GitHub

### What is Git? What is the difference between Git and GitHub? {basic} {star}

:::quick
**Git** is a version-control tool on your computer that tracks every change to your code. **GitHub** is a website that hosts Git repositories online, so teams can share code, review pull requests and run automation.
:::

:::simple
Git is like the "track changes + history" feature on your laptop. GitHub is like Google Drive for that history, where the whole team can see it and work together.
:::

:::say
- Git is a distributed version-control system; GitHub is a cloud platform that hosts Git repos and adds collaboration features like pull requests, issues and Actions.
:::

### Explain the basic Git workflow and commands {basic} {star}

:::quick
Edit files → `git add` (stage) → `git commit` (save a snapshot) → `git push` (upload to GitHub). Use `git pull` to get others' changes.
:::

:::simple
Staging is putting items into a box; committing is sealing and labelling the box; pushing is sending the box to the warehouse (GitHub).
:::

```bash
git init                         # start tracking a folder
git clone <url>                  # copy a repo from GitHub
git status                       # what changed?
git add file.js                  # stage one file  (git add . = all)
git commit -m "Add login API"    # save a snapshot with a message
git push origin main             # upload to GitHub
git pull                         # download and merge latest changes
git log --oneline                # history
git diff                         # see unstaged changes
```

### What is a branch? How do you work with branches? {basic} {star}

:::quick
A branch is an independent line of development. You create a branch for each feature or bug fix, work there, and merge it back into `main` when it's ready, so `main` always stays stable.
:::

```bash
git checkout -b feature/login     # create and switch (or: git switch -c feature/login)
# ... work and commit ...
git push -u origin feature/login  # push branch, then open a Pull Request
git checkout main                 # switch back
git branch -d feature/login       # delete after merging
```

:::say
- I create a short-lived branch per feature, push it, open a pull request, and merge after review. main always stays deployable.
:::

### git merge vs git rebase {mid} {star}

:::quick
**Merge** combines two branches and creates a **merge commit**, keeping the full history as it happened. **Rebase** moves your commits **on top of** the latest main, giving a clean, straight history. Don't rebase branches that others are also using.
:::

:::simple
Merge: two roads join at a junction (you can see both roads). Rebase: you pick up your road and re-lay it at the end of the main road, so it looks like one straight road.
:::

```bash
git checkout feature/login
git merge main          # bring main's changes in (merge commit)
# or
git rebase main         # replay my commits on top of main (linear history)
```

### How do you resolve a merge conflict? {mid} {star}

:::quick
A conflict happens when two branches change the **same lines**. Git marks the conflict in the file. Open it, decide what the correct code is (keep one side or combine both), remove the markers, test, then `git add` and commit.
:::

```bash
<<<<<<< HEAD
const limit = 10;
=======
const limit = 20;
>>>>>>> feature/pagination

# After choosing the right code:
git add config.js
git commit                 # (or: git rebase --continue during a rebase)
```

:::say
- I read both changes, talk to the other developer if needed, combine them correctly, remove the markers, and run the tests before committing.
:::

### What is a pull request? {basic} {star}

:::quick
A pull request (PR) asks to merge your branch into another (usually `main`). Teammates **review the code**, leave comments, automated tests run, and after approval it's merged.
:::

**📘 Explanation**

- Keep PRs small and focused.
- Write a clear description: what changed and why, and how to test it.
- Respond to review comments politely; fix and push again.

### git fetch vs git pull {basic} {star}

:::quick
`git fetch` downloads new changes from GitHub **but doesn't change your files**. `git pull` = `fetch` + `merge`: it downloads **and** updates your current branch.
:::

:::simple
Fetch = checking your mailbox and reading the letters. Pull = reading them **and** acting on them immediately.
:::

### git stash, reset and revert {mid}

:::quick
`git stash` temporarily saves unfinished work so you can switch branches. `git reset` moves your branch back (rewrites history; use only locally). `git revert` creates a **new commit that undoes** an old one (safe for shared branches).
:::

```bash
git stash            # park my changes
git stash pop        # bring them back
git revert a1b2c3    # safely undo a pushed commit
git reset --soft HEAD~1   # undo my last local commit, keep the changes
```

### What is .gitignore? {basic}

:::quick
A file listing what Git should **not** track: `node_modules`, `.env` (secrets), build folders, log files.
:::

```text
node_modules/
.env
dist/
*.log
```

:::warn
Committing `.env` with passwords or API keys. If it happens, change those secrets immediately, because they stay in the Git history.
:::

## Docker

### What is Docker? Why use it? {basic} {star}

:::quick
Docker packages an application **with everything it needs** (Node version, libraries, settings) into a **container**, so it runs the same on every computer: developer laptop, test server or cloud.
:::

:::simple
Like a shipping container: whatever is inside (furniture, cars), the ship, train or truck handles it the same way. It fixes "it works on my machine but not on yours".
:::

**📘 Explanation**

- Same environment everywhere: no version mismatches.
- Easy to start databases and services locally (Postgres, Mongo, Redis) with one command.
- Lighter and faster than virtual machines because containers share the host's operating system kernel.

:::say
- Docker packages an app and its dependencies into a portable container, so it behaves the same in development and production.
:::

### Image vs container {basic} {star}

:::quick
An **image** is a read-only template (the recipe). A **container** is a running instance of an image (the dish). One image can create many containers.
:::

:::simple
Image = a cake recipe. Container = an actual cake baked from it. You can bake many cakes from one recipe.
:::

### Write a Dockerfile for a Node.js app {mid} {star}

:::quick
Start from a Node base image, copy `package.json` first and install dependencies (so Docker can cache that step), then copy the code and set the start command.
:::

**📘 Explanation**

- Add a `.dockerignore` file with `node_modules` and `.env`.
- Build: `docker build -t my-api .`  Run: `docker run -p 4000:4000 my-api`.

**Dockerfile**

```dockerfile
FROM node:20-alpine          # small Node.js base image
WORKDIR /app                 # folder inside the container
COPY package*.json ./
RUN npm ci --omit=dev        # install dependencies (cached if package.json unchanged)
COPY . .                     # copy the rest of the code
EXPOSE 4000                  # the port the app uses
CMD ["node", "server.js"]    # start command
```

### What is Docker Compose? {mid} {star}

:::quick
Docker Compose runs **multiple containers together** (frontend, backend, database) using one `docker-compose.yml` file and one command: `docker compose up`.
:::

**docker-compose.yml**

```yaml
services:
  mongo:
    image: mongo:7
    volumes: [mongo-data:/data/db]     # keep data after restart
  api:
    build: ./server
    ports: ["4000:4000"]
    environment:
      MONGO_URI: mongodb://mongo:27017/shop   # 'mongo' = service name
    depends_on: [mongo]
  web:
    build: ./client
    ports: ["3000:80"]
    depends_on: [api]
volumes:
  mongo-data:
```

:::say
- Compose defines my whole MERN stack in one file; services reach each other by service name, like mongo:27017.
:::

### Common Docker commands {basic}

```bash
docker build -t my-app .        # build an image
docker images                   # list images
docker run -d -p 3000:3000 my-app   # run in background, map port
docker ps                       # running containers
docker logs -f <id>             # view logs
docker exec -it <id> sh         # open a shell inside
docker stop <id>                # stop
docker compose up -d --build    # start all services
docker compose down             # stop all
```

### What is a Docker volume? {mid}

:::quick
Containers lose their data when deleted. A **volume** stores data **outside** the container (on the host), so database data survives restarts and rebuilds.
:::

## GCP (Google Cloud Platform)

:::note
You have real GCP experience: you deployed an application on GCP for Swashodhan Trust. Mention it.
:::

### What is cloud computing? What is GCP? {basic} {star}

:::quick
**Cloud computing** means renting servers, storage, databases and other services over the internet and paying only for what you use. **GCP** is Google's cloud platform (others: AWS, Azure).
:::

:::simple
Instead of buying a generator for your house, you use electricity from the grid and pay the monthly bill. The cloud is the "grid" for computers.
:::

**📘 Explanation**

- **IaaS:** rent virtual machines (Compute Engine).
- **PaaS:** just give your code; Google runs it (App Engine, Cloud Run).
- **SaaS:** ready-made software (Gmail, Google Docs).

:::say
- Cloud computing gives on-demand servers and services with pay-as-you-go pricing.
- I have deployed an application on GCP using a Compute Engine virtual machine.
:::

:::hint2
Only describe the GCP steps you actually did. For anything else, say "the approach I would take is…".
:::

### What are the main GCP services? {basic}

:::quick
Know these by name and what each one is for. That's usually enough for a full stack interview.
:::

```text
Compute Engine   → virtual machines (full control of a server)
Cloud Run        → run Docker containers without managing servers
App Engine       → deploy code directly (platform manages everything)
GKE              → Kubernetes for many containers
Cloud Storage    → store files, images, backups (buckets)
Cloud SQL        → managed PostgreSQL / MySQL
Firestore        → NoSQL database
IAM              → users, roles and permissions
VPC / Firewall   → private network and allowed ports
Cloud Logging    → application logs
```

### How would you deploy a MERN app on GCP? {mid} {star}

:::quick
Two common ways: **(1) Compute Engine VM**, where you set up the server yourself, or **(2) Cloud Run**, where you deploy Docker containers and Google handles scaling.
:::

**📘 Explanation**

- **Option 1, Compute Engine (VM):**
   - Create a VM (e.g. Ubuntu), open ports 80/443 in the firewall.
   - SSH in, install Node.js, Nginx and PM2 (keeps the Node app running).
   - Clone the repo, add `.env`, `npm install`, build React, start the API with PM2.
   - Configure Nginx as a reverse proxy (domain → Node app) and add HTTPS with Let's Encrypt.
- **Option 2, Cloud Run (containers):**
   - Write a Dockerfile, build and push the image to Artifact Registry.
   - `gcloud run deploy`, set environment variables and secrets; it scales automatically.
- **Database:** MongoDB Atlas, or Cloud SQL for PostgreSQL.
- **Frontend:** a Cloud Storage bucket + CDN, Firebase Hosting, or served by Nginx.

```bash
# Cloud Run (from the project folder with a Dockerfile)
gcloud builds submit --tag asia-south1-docker.pkg.dev/my-project/apps/api
gcloud run deploy api --image asia-south1-docker.pkg.dev/my-project/apps/api \
  --region asia-south1 --allow-unauthenticated --set-env-vars NODE_ENV=production
```

:::say
- I have deployed an application on a GCP Compute Engine VM: creating the VM, opening firewall ports and setting it up over SSH.
- For a Node.js API on a VM, I would use Nginx as a reverse proxy and PM2 to keep the app running.
- For a containerised app I would use Cloud Run: it scales automatically and I only pay when requests come in.
:::

### What is a reverse proxy (Nginx)? What is PM2? {mid}

:::quick
**Nginx** receives all internet traffic on port 80/443 and forwards it to your Node app (and can serve React files and handle HTTPS). **PM2** keeps your Node app running, restarts it if it crashes, and restarts it after a server reboot.
:::

:::simple
Nginx is the receptionist who greets every visitor and sends them to the right room. PM2 is the security guard who restarts the lights if they go off.
:::

```bash
pm2 start server.js --name api
pm2 startup && pm2 save          # restart automatically after reboot
pm2 logs api
```

### What is CI/CD? {basic}

:::quick
**CI (Continuous Integration):** every push automatically runs tests and builds. **CD (Continuous Deployment):** if they pass, the code is deployed automatically. Tools: GitHub Actions, Cloud Build.
:::

**GitHub Actions example**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
```

### What is IAM? How do you keep cloud apps secure? {mid}

:::quick
**IAM** (Identity and Access Management) controls **who can do what** in your cloud project. Give each person or service **only the permissions they need** (least privilege).
:::

**📘 Explanation**

- Keep secrets in **Secret Manager** or environment variables, never in code.
- Open only the needed firewall ports (80, 443).
- Use HTTPS, and keep the OS and packages updated.
- Take regular database backups.

## Quick revision sheet

| Topic | Remember this |
|---|---|
| Git vs GitHub | Git = version control tool; GitHub = online hosting + PRs. |
| Workflow | add → commit → push; pull to update. |
| Branch | One branch per feature; merge via pull request. |
| Merge vs rebase | Merge keeps history + merge commit; rebase = linear history (local branches only). |
| Conflict | Edit → remove markers → test → add → commit. |
| fetch vs pull | fetch = download only; pull = download + merge. |
| revert vs reset | revert = safe undo commit; reset = rewrite local history. |
| Docker | App + dependencies in a portable container. |
| Image vs container | Recipe vs the cake. |
| Compose | Many containers from one YAML; services talk by name. |
| GCP | Compute Engine (VM), Cloud Run (containers), Cloud Storage, Cloud SQL, IAM. |
| Deploy | VM + Nginx + PM2, or Docker + Cloud Run. |
| CI/CD | Auto test on push; auto deploy when tests pass. |
