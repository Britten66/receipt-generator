import express from 'express';
import cors from 'cors';
import receiptRoutes from './routes/receipts.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/receipts', receiptRoutes);

export default app;