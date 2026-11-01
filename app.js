const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());

const sampleBooks = [
  ["The Alchemist", "Paulo Coelho", 250, 208],
  ["Wings of Fire", "A. P. J. Abdul Kalam", 300, 180],
  ["The Guide", "R. K. Narayan", 220, 224],
  ["Malgudi Days", "R. K. Narayan", 275, 256],
  ["The Discovery of India", "Jawaharlal Nehru", 450, 688],
  ["Train to Pakistan", "Khushwant Singh", 280, 192],
  ["The White Tiger", "Aravind Adiga", 350, 321],
  ["The God of Small Things", "Arundhati Roy", 400, 340],
  ["India After Gandhi", "Ramachandra Guha", 550, 896],
  ["The Blue Umbrella", "Ruskin Bond", 150, 128],
];

let database;

const isValidId = (id) =>
  /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;

const validateBook = (book) => {
  if (book === null || typeof book !== "object" || Array.isArray(book)) {
    return "Request body must be a JSON object.";
  }

  if (typeof book.title !== "string" || book.title.trim() === "") {
    return "title must be a non-empty string.";
  }

  if (typeof book.author !== "string" || book.author.trim() === "") {
    return "author must be a non-empty string.";
  }

  if (!Number.isSafeInteger(book.price) || book.price < 0) {
    return "price must be a non-negative integer.";
  }

  if (!Number.isSafeInteger(book.pages) || book.pages <= 0) {
    return "pages must be a positive integer.";
  }

  return null;
};

const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

app.get(
  "/books/",
  asyncHandler(async (request, response) => {
    const books = await database.all("SELECT * FROM book ORDER BY id");
    response.json(books);
  }),
);

app.get(
  "/books/:id/",
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      return response.status(400).json({ error: "id must be a positive integer." });
    }

    const book = await database.get("SELECT * FROM book WHERE id = ?", [id]);
    if (book === undefined) {
      return response.status(404).json({ error: "Book not found." });
    }

    return response.json(book);
  }),
);

app.post(
  "/books/",
  asyncHandler(async (request, response) => {
    const validationError = validateBook(request.body);
    if (validationError !== null) {
      return response.status(400).json({ error: validationError });
    }

    const { title, author, price, pages } = request.body;
    const result = await database.run(
      "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)",
      [title.trim(), author.trim(), price, pages],
    );
    const createdBook = await database.get("SELECT * FROM book WHERE id = ?", [
      result.lastID,
    ]);

    return response.status(201).json(createdBook);
  }),
);

app.put(
  "/books/:id/",
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      return response.status(400).json({ error: "id must be a positive integer." });
    }

    const validationError = validateBook(request.body);
    if (validationError !== null) {
      return response.status(400).json({ error: validationError });
    }

    const { title, author, price, pages } = request.body;
    const result = await database.run(
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?",
      [title.trim(), author.trim(), price, pages, id],
    );

    if (result.changes === 0) {
      return response.status(404).json({ error: "Book not found." });
    }

    const updatedBook = await database.get("SELECT * FROM book WHERE id = ?", [id]);
    return response.json(updatedBook);
  }),
);

app.delete(
  "/books/:id/",
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    if (!isValidId(id)) {
      return response.status(400).json({ error: "id must be a positive integer." });
    }

    const result = await database.run("DELETE FROM book WHERE id = ?", [id]);
    if (result.changes === 0) {
      return response.status(404).json({ error: "Book not found." });
    }

    return response.json({ message: "Book deleted successfully." });
  }),
);

app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error.status === 400 && error.type === "entity.parse.failed") {
    return response.status(400).json({ error: "Request body must contain valid JSON." });
  }

  console.error("Request failed:", error);
  return response.status(500).json({ error: "An internal server error occurred." });
});

async function initializeDBAndServer() {
  const configuredPath = process.env.DB_PATH || path.join(__dirname, "database.db");
  const databasePath = path.resolve(configuredPath);

  await fs.promises.mkdir(path.dirname(databasePath), { recursive: true });

  database = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  await database.run(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY,
      title TEXT,
      author TEXT,
      price INTEGER,
      pages INTEGER
    )
  `);

  await database.run("BEGIN IMMEDIATE");
  try {
    const { count } = await database.get("SELECT COUNT(*) AS count FROM book");
    if (count === 0) {
      for (const [title, author, price, pages] of sampleBooks) {
        await database.run(
          "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)",
          [title, author, price, pages],
        );
      }
    }
    await database.run("COMMIT");
  } catch (error) {
    await database.run("ROLLBACK");
    throw error;
  }

  const port = process.env.PORT || 3000;
  await new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`SQLite database: ${databasePath}`);
      resolve();
    });
    server.once("error", reject);
  });
}

initializeDBAndServer().catch(async (error) => {
  console.error("Unable to initialize the database or start the server:", error);
  if (database !== undefined) {
    await database.close().catch((closeError) => {
      console.error("Unable to close the database:", closeError);
    });
  }
  process.exitCode = 1;
});
