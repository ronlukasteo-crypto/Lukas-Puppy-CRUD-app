import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as jose from 'jose';
import { Sequelize, DataTypes } from 'sequelize';

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;

if (!process.env.DB_HOST) {
  console.warn('Warning: DB_HOST not set in .env');
}

const DB_SCHEMA = process.env.DB_SCHEMA || 'app';
const useSsl = process.env.PGSSLMODE === 'require';

const ASGARDEO_ORG = process.env.ASGARDEO_ORG || 'orgron';
const JWKS_URI = `https://api.asgardeo.io/t/${ASGARDEO_ORG}/oauth2/jwks`;

app.use(cors());
app.use(express.json());

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : undefined,
    define: { schema: DB_SCHEMA },
  }
);

const Puppies = sequelize.define(
  'puppies',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    breed: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    schema: DB_SCHEMA,
    tableName: 'puppies',
    timestamps: false,
  }
);

async function authMiddleware(req, res, next) {
  const authHeader = (req.headers.authorization || '').trim();

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing auth',
      detail: 'Send Authorization: Bearer <access_token>',
    });
  }

  const token = authHeader.slice(7).trim();
  const looksLikeJwt = token && token.split('.').length === 3;

  if (!looksLikeJwt) {
    return res.status(401).json({
      error:
        'Access token is not a JWT. In Asgardeo, set your app to use JWT access tokens (Protocol tab).',
    });
  }

  try {
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URI));
    const { payload } = await jose.jwtVerify(token, JWKS);
    req.userId = payload.sub;
    return next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({
      error: 'Invalid or expired token',
      detail: err.message,
    });
  }
}

app.use('/api/puppies', authMiddleware);

app.get('/api/puppies', async (req, res) => {
  try {
    const puppies = await Puppies.findAll({
      where: { user_id: req.userId },
      order: [['id', 'ASC']],
    });
    res.json(puppies);
  } catch (error) {
    console.error('Error fetching puppies:', error);
    res.status(500).json({ error: 'Failed to fetch puppies', details: error.message });
  }
});

app.post('/api/puppies', async (req, res) => {
  const { name, breed, age } = req.body;
  if (name == null || breed == null || age == null) {
    return res.status(400).json({ error: 'name, breed, and age are required' });
  }
  try {
    const puppy = await Puppies.create({
      name,
      breed,
      age: Number(age),
      user_id: req.userId,
    });
    res.status(201).json(puppy);
  } catch (error) {
    console.error('Error creating puppy:', error);
    res.status(500).json({ error: 'Failed to create puppy', details: error.message });
  }
});

app.put('/api/puppies/:id', async (req, res) => {
  const { id } = req.params;
  const { name, breed, age } = req.body;
  if (name == null || breed == null || age == null) {
    return res.status(400).json({ error: 'name, breed, and age are required' });
  }
  try {
    const puppy = await Puppies.findOne({
      where: { id: Number(id), user_id: req.userId },
    });
    if (!puppy) {
      return res.status(404).json({ error: 'Puppy not found or you do not own it' });
    }
    await puppy.update({ name, breed, age: Number(age) });
    res.json({
      id: Number(id),
      name,
      breed,
      age: Number(age),
      user_id: req.userId,
    });
  } catch (error) {
    console.error('Error updating puppy:', error);
    res.status(500).json({ error: 'Failed to update puppy', details: error.message });
  }
});

app.delete('/api/puppies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const puppy = await Puppies.findOne({
      where: { id: Number(id), user_id: req.userId },
    });
    if (!puppy) {
      return res.status(404).json({ error: 'Puppy not found or you do not own it' });
    }
    await puppy.destroy();
    res.json({ message: 'Puppy deleted successfully', id: parseInt(id, 10) });
  } catch (error) {
    console.error('Error deleting puppy:', error);
    res.status(500).json({ error: 'Failed to delete puppy', details: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

async function start() {
  await sequelize.authenticate();
  await Puppies.sync({ alter: true });
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
