# eSQLer Deployment Guide

eSQLer consists of two parts: a static frontend built with Vite/React, and a Node.js/Express backend.

## Frontend (Vercel)

The frontend is designed to be deployed statically to Vercel.

1.  **Connect Repository:** Connect your GitHub repository to Vercel.
2.  **Root Directory:** Set the root directory to `client`.
3.  **Build Command:** `npm run build`
4.  **Output Directory:** `dist`
5.  **Environment Variables:**
    *   `VITE_API_URL`: The URL of your Render backend (e.g., `https://esqler-backend.onrender.com`)

## Backend (Render)

The backend is a Node.js web service running Express and Socket.io.

1.  **Connect Repository:** Connect your GitHub repository to Render as a new "Web Service".
2.  **Root Directory:** Set the root directory to `server`.
3.  **Build Command:** `npm install && npm run build`
4.  **Start Command:** `npm start`
5.  **Environment Variables:**
    *   `PORT`: `3001` (or Render's default)
    *   `CORS_ORIGIN`: Your Vercel frontend URL (e.g., `https://esqler.vercel.app`)
    *   `MONGODB_URI`: Your MongoDB Atlas connection string.
    *   `JWT_SECRET`: A strong, randomly generated string.
    *   `DB_ENCRYPTION_KEY`: A 32-byte hex string (64 characters) used for AES-256-GCM encryption of user database credentials.
    *   `GROQ_API_KEY`: (Optional) Groq API key for LLM assist.
    *   `GEMINI_API_KEY`: (Optional) Gemini API key for LLM assist.

## Notes on CORS and WebSockets

- **Socket.io:** The frontend must connect to the backend URL via WebSocket. The backend's `CORS_ORIGIN` must exactly match the deployed Vercel frontend URL (no trailing slash).
- **Cookies:** If you choose to use HttpOnly cookies for JWTs in the future, ensure `withCredentials: true` is set on both Axios/Fetch in the frontend and CORS config in the backend, and that the Render service is not blocked by third-party cookie restrictions (using a custom domain helps).
