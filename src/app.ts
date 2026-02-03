import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

const app: Application = express();

// CORS configuration - allow all origins in development
app.use(cors({
    origin: '*', // Allow all origins (for development)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for larger payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Main Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Bellariti Backend is running' });
});

// Global Error Handler
// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);

    // Check if it's a known error type here if we switch to bubbling errors up

    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

export default app;
