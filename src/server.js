require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { connectDatabase } = require('./config/database');
const logger = require('./config/logger');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

/** Split env list; empty means reflect browser origin in dev-friendly mode below */
function parseCorsAllowList() {
  const raw = process.env.CORS_ORIGIN ?? '*';
  if (raw.trim() === '*') return ['*'];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

const corsAllowList = parseCorsAllowList();
const isProd = process.env.NODE_ENV === 'production';

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      /* Non-browser clients (curl, Postman) send no Origin */
      if (!origin) {
        callback(null, true);
        return;
      }
      if (corsAllowList.includes('*')) {
        callback(null, true);
        return;
      }
      if (corsAllowList.includes(origin)) {
        callback(null, true);
        return;
      }
      /* Local Vite/React dev servers often move ports (5173, 5174, …) */
      if (
        !isProd &&
        (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'campussphere-api' });
});

app.use('/api', routes);

app.use((err, _req, res, _next) => {
  logger.error(err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = Number(process.env.PORT) || 5000;

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`CampusSphere API listening on port ${PORT}`);
    });
  })
  .catch(() => {
    process.exit(1);
  });
