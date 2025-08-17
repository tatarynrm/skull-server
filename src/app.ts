import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import telegramAuthRouter from "./routes/auth.route";
import cloudinaryRouter from "./routes/cloudinary-upload.route";
import uploadsRouter from "./routes/upload.routes";
import cookieParser from "cookie-parser";
import cors from "cors";

import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { registerSocketHandlers } from "./sockets/SocketProvider";
import { pool } from "./db/pool";
import path from 'path'
import bot from "./bot/bot";

dotenv.config();


const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);
// Підключення до Redis
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

 pubClient.connect();
 subClient.connect();
// Allowed origins for CORS
const allowedOrigins = [
  'https://skulldate.site',
  'https://www.skulldate.site',
  'https://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://127.0.0.1:80',
  'http://127.0.0.1:80',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: '90mb' })); // Максимальний розмір тіла 50 MB
app.use(express.urlencoded({ limit: '90mb', extended: true }));

// Routes
app.use("/auth", telegramAuthRouter);
app.use("/cloudinary", cloudinaryRouter);
app.use("/upload", uploadsRouter);


app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Test route to check server status
app.get('/syka', async (req: Request, res: Response) => {
  console.log('GET /syka');
  res.json({ message: "Everything is okay" });
});

// Root route for basic check
app.get('/', async (req: Request, res: Response) => {
  console.log('GET /');
  res.json({ message: "Everything is okay" });
});

// Preflight CORS (OPTIONS) handling for all routes
const io = new Server(httpServer, {
  cors: {
    origin: ['http://127.0.0.1','https://skulldate.site','http://localhost:3000'], // Next.js frontend
    methods: ['GET', 'POST'],
  },
});
io.adapter(createAdapter(pubClient, subClient));
// Логіка сокетів
registerSocketHandlers(io);
// Start the server




// 🔹 Типи
type ColumnDef = {
  data_type: string;
  is_nullable: boolean;
};

type TableSchema = {
  [columnName: string]: ColumnDef;
};

type DatabaseSchema = {
  [tableName: string]: TableSchema;
};

type NewColumnDef = {
  type: string;
};

// 🔹 Отримати поточну схему
app.get('/api/schema', async (req: Request, res: Response) => {
  try {
    const result = await pool.query<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: 'YES' | 'NO';
    }>(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const schema: DatabaseSchema = {};

    for (const row of result.rows) {
      if (!schema[row.table_name]) {
        schema[row.table_name] = {};
      }
      schema[row.table_name][row.column_name] = {
        data_type: row.data_type,
        is_nullable: row.is_nullable === 'YES',
      };
    }

    res.json(schema);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка при отриманні схеми' });
  }
});

// 🔹 Додати стовпчик до існуючої таблиці
app.post('/api/schema/add-column', async (req: Request, res: Response) => {
  const { tableName, columnName, columnType } = req.body;


  if (!tableName || !columnName || !columnType) {
    res.status(400).json({ error: 'Некоректні дані' });
    return;
  }

  try {
    await pool.query(
      `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnType}`
    );
    res.json({ message: 'Стовпчик додано' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка при додаванні стовпчика' });
  }
});

// 🔹 Створити нову таблицю
app.post('/api/schema/add-table', async (req: Request, res: Response) => {
  const { tableName, columns } = req.body as {
    tableName: string;
    columns: { [columnName: string]: NewColumnDef };
  };

  if (!tableName || !columns || typeof columns !== 'object') {
    res.status(400).json({ error: 'Некоректні дані' });
    return;
  }

  const columnDefs = Object.entries(columns)
    .map(([name, def]: [string, NewColumnDef]) => `"${name}" ${def.type}`)
    .join(', ');

  try {
    await pool.query(`CREATE TABLE "${tableName}" (${columnDefs})`);
    res.json({ message: 'Таблиця створена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка при створенні таблиці' });
  }
});



const CORRECT_PASSWORD = 'Aa527465182';


// Видалити таблицю
app.post('/api/schema/delete-table', async (req: Request, res: Response) => {
  const { tableName, password } = req.body;
console.log(password,'password');

  if (password !== CORRECT_PASSWORD) {
     res.status(401).json({ error: 'Неправильний пароль' });return
  }

  if (!tableName) {
     res.status(400).json({ error: 'Вкажіть назву таблиці' });return
  }

  try {
    await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    res.json({ message: `Таблиця "${tableName}" успішно видалена` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка при видаленні таблиці' });
  }
});

// Видалити стовпчик з таблиці
app.post('/api/schema/delete-column', async (req: Request, res: Response) => {
  const { tableName, columnName, password } = req.body;

  if (password !== CORRECT_PASSWORD) {
     res.status(401).json({ error: 'Неправильний пароль' });return
  }

  if (!tableName || !columnName) {
     res.status(400).json({ error: 'Вкажіть назву таблиці та стовпчика' });return
  }

  try {
    await pool.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${columnName}" CASCADE`);
    res.json({ message: `Стовпчик "${columnName}" видалено з таблиці "${tableName}"` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка при видаленні стовпчика' });
  }
});





app.post('/api/trucks',async (req:Request,res:Response) =>{
  const {company_id,model,number_plate,year} = req.body;
  try {
    const data = await pool.query(`insert into trucks (company_id,model,number_plate,year) values($1,$2,$3,$4) returning *`,[
company_id,model,number_plate,year
    ])
    console.log(data.rows[0],'data rows 0');
   res.json(data.rows[0])
    
  } catch (error) {
    console.log(error);
    
  }
})

app.get('/d',async (req:Request,res:Response) =>{
  try {
    res.json({msg:"OK"})
  } catch (error) {
    console.log(error);
    
  }
})


bot.launch(); // Launch the bot
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
