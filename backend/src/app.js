import express from 'express';
import cors from 'cors';
import receiptRoutes from './routes/receipts.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/receipts', receiptRoutes);

// JSON error handler — prevents Express returning HTML error pages
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
});

export default app;