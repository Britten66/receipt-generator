import express from 'express';
import cors from 'cors';
import receiptRoutes from './routes/receipts.routes.js';
import profileRoutes from './routes/profile.routes.js';

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin.endsWith(".vercel.app") || origin === "http://localhost:5173") {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/receipts', receiptRoutes);
app.use('/api/profile', profileRoutes);

// JSON error handler — prevents Express returning HTML error pages
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
});

export default app;