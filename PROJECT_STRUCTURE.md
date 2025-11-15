# Project Structure

## Overview
This is a full-stack MVP application for advanced data analysis with AI-powered summarization. The project is divided into two main parts: `backend` and `frontend`.

## Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── server.ts              # Express server setup
│   ├── models/
│   │   ├── User.ts            # User schema with password hashing
│   │   └── Dataset.ts         # Dataset schema with threads
│   ├── routes/
│   │   ├── auth.ts            # Authentication routes (signup/signin)
│   │   └── datasets.ts        # Dataset CRUD and processing routes
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication middleware
│   └── utils/
│       ├── analysis.ts        # Data analysis functions (type detection, stats, correlations)
│       ├── preprocessing.ts   # Preprocessing functions (missing values, encoding, normalization)
│       └── gemini.ts          # Google Gemini AI integration
├── package.json
├── tsconfig.json
└── .env.example
```

### Key Backend Features:
- JWT-based authentication
- File upload with Multer (CSV/Excel)
- Data parsing with PapaParse and XLSX
- Comprehensive data analysis
- Preprocessing pipeline
- Google Gemini AI integration for summarization
- MongoDB for data persistence

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Main app with routing
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── services/
│   │   └── api.ts            # API client with axios
│   ├── context/
│   │   └── AuthContext.tsx   # Authentication context provider
│   ├── pages/
│   │   ├── Login.tsx         # Login page
│   │   ├── Signup.tsx        # Signup page
│   │   ├── Dashboard.tsx   # Dashboard with dataset list
│   │   └── Analyzer.tsx      # Main analyzer page
│   └── components/
│       ├── FileUpload.tsx    # File upload component
│       ├── Tabs.tsx          # Tab navigation component
│       ├── AutomationWorkflow.tsx  # Automation workflow UI
│       ├── SummarizerChat.tsx      # AI chat interface
│       └── tabs/
│           ├── OverviewTab.tsx
│           ├── DistributionsTab.tsx
│           ├── CorrelationsTab.tsx
│           ├── OutliersTab.tsx
│           ├── DataQualityTab.tsx
│           ├── PreprocessingTab.tsx
│           └── PreviewTab.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── index.html
```

### Key Frontend Features:
- React with TypeScript
- React Router for navigation
- Context API for state management
- Framer Motion for animations
- Recharts for visualizations
- Tailwind CSS for styling
- React Hot Toast for notifications
- Responsive design

## Component Breakdown

### Original App.jsx → Modular Components

The original monolithic `App.jsx` has been split into:

1. **Pages** (Route-level components):
   - `Login.tsx` - User authentication
   - `Signup.tsx` - User registration
   - `Dashboard.tsx` - Dataset management
   - `Analyzer.tsx` - Main analysis interface

2. **Tab Components** (Feature-specific):
   - `OverviewTab.tsx` - Dataset overview and statistics
   - `DistributionsTab.tsx` - Distribution charts
   - `CorrelationsTab.tsx` - Correlation analysis and heatmaps
   - `OutliersTab.tsx` - Outlier detection with box plots
   - `DataQualityTab.tsx` - Data quality metrics
   - `PreprocessingTab.tsx` - Preprocessing controls
   - `PreviewTab.tsx` - Data preview table

3. **Shared Components**:
   - `FileUpload.tsx` - File upload interface
   - `Tabs.tsx` - Tab navigation
   - `AutomationWorkflow.tsx` - Automation pipeline UI
   - `SummarizerChat.tsx` - AI chat interface

## Automation Workflow

The automation workflow is now a dedicated component (`AutomationWorkflow.tsx`) that:
- Shows step-by-step progress
- Calls the `/api/datasets/:id/automate` endpoint
- Displays visual progress indicators
- Handles completion and error states

## AI Summarization

The AI summarization is handled by:
- `SummarizerChat.tsx` - Frontend chat interface
- `backend/src/utils/gemini.ts` - Gemini API integration
- Thread history stored in MongoDB
- Context-aware conversations

## Data Flow

1. **Upload**: User uploads file → Backend parses → Stores in MongoDB → Returns analysis
2. **Analysis**: Backend runs analysis → Returns statistics, correlations, quality metrics
3. **Preprocessing**: User selects options → Backend processes → Updates dataset → Returns results
4. **Automation**: User triggers → Backend runs full pipeline → Returns processed data + summary
5. **Summarization**: User asks questions → Backend queries Gemini → Returns AI response

## Environment Variables

### Backend (.env):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/data-analysis
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
```

### Frontend (.env):
```
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Backend:
```bash
cd backend
npm install
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Key Improvements Over Original App.jsx

1. **Separation of Concerns**: Each feature is in its own component
2. **Type Safety**: Full TypeScript implementation
3. **Backend Integration**: All data operations go through API
4. **State Management**: Context API for auth, local state for UI
5. **Error Handling**: Toast notifications for user feedback
6. **Loading States**: Proper loading indicators
7. **Responsive Design**: Mobile-first approach
8. **Animations**: Framer Motion for smooth transitions
9. **Code Reusability**: Shared components and utilities
10. **Maintainability**: Clear file structure and organization

