# Data Analysis Backend

Node.js + Express + MongoDB backend API for the Advanced Data Analyzer Pro application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/data-analysis
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
GEMINI_API_KEY=your-google-gemini-api-key
NODE_ENV=development
```

3. Make sure MongoDB is running

4. Run development server:
```bash
npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login user

### Datasets
- `POST /api/datasets/upload` - Upload CSV/Excel file
- `GET /api/datasets` - Get all user datasets
- `GET /api/datasets/:id` - Get dataset by ID
- `POST /api/datasets/:id/analyze` - Run analysis
- `POST /api/datasets/:id/preprocess` - Apply preprocessing
- `GET /api/datasets/:id/download` - Download refined CSV
- `POST /api/datasets/:id/automate` - Run full automation pipeline
- `POST /api/datasets/:id/summarize` - Generate AI summary
- `GET /api/datasets/:id/threads` - Get chat threads

## Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB + Mongoose
- JWT Authentication
- Google Gemini AI
- Multer (file uploads)
- PapaParse & XLSX (file parsing)

