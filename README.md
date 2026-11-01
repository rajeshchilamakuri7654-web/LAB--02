# Lab 2 — SQLite CRUD API

## Student details

- **Name:** Chilamakuri Rajesh
- **Registration number:** 252U1R1061
- **Section:** CSE (CORE) – 2A
- **College:** Aurora Deemed to be University
- **Subject:** Backend Development Fundamentals
- **Faculty:** Joel Prashanth D

## Run locally

Open a terminal in `lab-02` and run:

```bash
npm install
npm run dev
```

The API starts at `http://localhost:3000`. The default SQLite file is
`database.db` in this project folder. To use another database file, set
`DB_PATH` before starting the server. For example, in PowerShell:

```powershell
$env:DB_PATH = "C:\some\folder\database.db"
npm start
```

The server creates the database directory and table when needed. It inserts the
10 sample books only when the table is empty, so restarting the app does not
duplicate or replace existing records.

## API endpoints

All request and response bodies use JSON.

| Method | URL | Success response |
| --- | --- | --- |
| GET | `/books/` | `200` and an array of all books |
| GET | `/books/:id/` | `200` and one book |
| POST | `/books/` | `201` and the inserted book |
| PUT | `/books/:id/` | `200` and the updated book |
| DELETE | `/books/:id/` | `200` and a success message |

Book IDs must be positive integers. A missing book returns `404`; invalid IDs
or book data return `400`. A book needs a non-empty `title` and `author`, a
non-negative integer `price`, and a positive integer `pages`. PUT replaces all
four book fields.

## Postman examples

Set the request header `Content-Type` to `application/json`.

**Create a book — `POST /books/`**

```json
{
  "title": "The Alchemist",
  "author": "Paulo Coelho",
  "price": 250,
  "pages": 208
}
```

**Update a book — `PUT /books/1/`**

```json
{
  "title": "The Alchemist (Updated)",
  "author": "Paulo Coelho",
  "price": 275,
  "pages": 208
}
```

To test the other endpoints, send `GET http://localhost:3000/books/`,
`GET http://localhost:3000/books/1/`, or
`DELETE http://localhost:3000/books/1/`.

## Deploy on Render

Create a **Web Service** from the existing GitHub repository. Do not create a
new repository or add a persistent disk for the free demo.

In the Render Dashboard, use these settings:

- **Runtime:** Node
- **Branch:** `main`
- **Root Directory:** `lab-02`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/books/`
- **Environment Variables:** none required for the free demo

If the directory in GitHub is named with different capitalization, enter that
exact directory name as the Root Directory.

### Option A — Free demo (ephemeral storage)

Deploy with the settings above and no `DB_PATH`. The service creates
`database.db` in the project directory and supports GET, POST, PUT, and DELETE
while running. Render's default filesystem is ephemeral: data changes and the
database may disappear after a restart or redeployment. The sample books are
re-created if the table is empty.

### Option B — Persistent SQLite (paid compatible service)

Persistent disks are not available for free web services. To keep SQLite data
across deploys/restarts, use a paid Render web service that supports persistent
disks:

1. In the web service's **Disks** settings, add a disk with mount path
   `/var/data`.
2. In **Environment**, set `DB_PATH` to `/var/data/database.db`.
3. Keep the Root Directory, build command, start command, and health check
   listed above, then deploy.

The app creates the mounted directory if needed. If the disk has no database,
the app creates the table and inserts the 10 examples. If records already exist,
it leaves them unchanged. Do not rely on SQLite data surviving without the
persistent disk.
