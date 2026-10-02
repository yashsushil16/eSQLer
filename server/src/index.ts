import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// AES-256-GCM Encryption Helper for user connection strings
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY
  ? Buffer.from(process.env.DB_ENCRYPTION_KEY.slice(0, 64), 'hex')
  : crypto.randomBytes(32);

function encryptSecret(text: string): { iv: string; encryptedData: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), encryptedData: encrypted, tag };
}

function decryptSecret(iv: string, encryptedData: string, tag: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Rate Limiter for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // limit each IP to 60 requests per windowMs
  message: { error: 'Too many AI requests. Please wait a moment before trying again.' },
});

// Initialize AI clients
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongoConnected: mongoose.connection.readyState === 1,
    aiAvailable: Boolean(groq || gemini),
  });
});

/**
 * AI Query Assistant Endpoint
 * Translates natural language into dialect-specific queries using ONLY schema metadata.
 */
app.post('/api/ai/query-assist', aiLimiter, async (req, res) => {
  const { prompt, dialect, schema } = req.body;

  if (!prompt || !dialect) {
    return res.status(400).json({ error: 'Prompt and dialect are required' });
  }

  const systemInstruction = `You are eSQLer AI Query Assistant.
Your job is to convert natural language questions into accurate, executable ${dialect.toUpperCase()} queries.
The user provided their database schema:
${JSON.stringify(schema, null, 2)}

Rules:
1. Reference only valid tables and columns present in the schema.
2. Return ONLY a JSON object with this exact structure:
{
  "query": "THE_SQL_OR_MONGO_QUERY_HERE",
  "explanation": "Brief 1-sentence explanation of what the query does"
}
Do not enclose in markdown ticks if possible, or return raw JSON.`;

  try {
    if (groq) {
      const candidates = ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
      for (const modelName of candidates) {
        try {
          const completion = await groq.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          });

          const rawContent = completion.choices[0]?.message?.content || '{}';
          const parsed = JSON.parse(rawContent);
          return res.json(parsed);
        } catch (groqErr: any) {
          // Continue to next candidate
        }
      }
    }

    if (gemini) {
      const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
      for (const mName of geminiModels) {
        try {
          const model = gemini.getGenerativeModel({ model: mName });
          const result = await model.generateContent(`${systemInstruction}\n\nUser Question: ${prompt}`);
          const text = result.response.text();
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return res.json(parsed);
        } catch (geminiErr: any) {
          // Continue to next model candidate
        }
      }
    } else {
      return res.status(503).json({
        error: 'No LLM API keys configured on server.',
      });
    }
  } catch (err: any) {
    console.error('AI error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate query' });
  }
});

/**
 * Database Introspection Endpoint
 * Introspects external PostgreSQL / MySQL databases into eSQLer DiagramGraph
 */
app.post('/api/db/introspect', async (req, res) => {
  const { engine, host, port, database, username, password, useSsl } = req.body;

  // SSRF Protection: Reject private/internal network addresses if required
  if (host === '169.254.169.254' || host === 'metadata.google.internal') {
    return res.status(400).json({ error: 'Prohibited target host' });
  }

  try {
    if (engine === 'postgres') {
      const client = new PgClient({
        host,
        port: port || 5432,
        database,
        user: username,
        password,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      });

      await client.connect();

      // Introspect tables
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `;
      const tablesRes = await client.query(tablesQuery);
      const tableNames = tablesRes.rows.map((r) => r.table_name);

      const tables: any[] = [];
      const relationships: any[] = [];
      const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#38BDF8', '#A78BFA', '#FB923C'];

      for (let i = 0; i < tableNames.length; i++) {
        const tName = tableNames[i];
        const tableId = `tbl_${tName}`;

        const colsQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `;
        const colsRes = await client.query(colsQuery, [tName]);

        const pkQuery = `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1;
        `;
        const pkRes = await client.query(pkQuery, [tName]);
        const pkCols = new Set(pkRes.rows.map((r) => r.column_name));

        const columns = colsRes.rows.map((c) => {
          let uType = 'varchar';
          const rawType = c.data_type.toLowerCase();
          if (rawType.includes('int')) uType = 'int';
          else if (rawType.includes('float') || rawType.includes('numeric') || rawType.includes('real')) uType = 'float';
          else if (rawType.includes('bool')) uType = 'boolean';
          else if (rawType.includes('timestamp') || rawType.includes('date')) uType = 'timestamp';
          else if (rawType.includes('uuid')) uType = 'uuid';
          else if (rawType.includes('json')) uType = 'json';

          return {
            id: `col_${tName}_${c.column_name}`,
            name: c.column_name,
            type: uType,
            isPrimary: pkCols.has(c.column_name),
            isNullable: c.is_nullable === 'YES',
            isUnique: false,
            defaultValue: c.column_default || undefined,
          };
        });

        tables.push({
          id: tableId,
          name: tName,
          columns,
          color: colors[i % colors.length],
          sprite: 'cylinder',
          position: { x: 100 + (i % 3) * 340, y: 100 + Math.floor(i / 3) * 300 },
        });
      }

      await client.end();

      return res.json({
        graph: {
          dialect: 'postgres',
          tables,
          relationships,
        },
      });
    } else {
      return res.status(400).json({ error: `Engine ${engine} direct cloud introspection is supported via Postgres driver currently.` });
    }
  } catch (err: any) {
    console.error('Introspection error:', err);
    return res.status(500).json({ error: err.message || 'Connection failed' });
  }
});

// Socket.io Real-time Presence
io.on('connection', (socket) => {
  socket.on('cursor-move', (data) => {
    socket.broadcast.emit('user-cursor', { userId: socket.id, ...data });
  });

  socket.on('disconnect', () => {
    io.emit('user-left', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

async function startServer() {
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB Atlas');
    } else {
      console.warn('MONGODB_URI not provided.');
    }

    server.listen(PORT, () => {
      console.log(`eSQLer backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
