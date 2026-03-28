🧠 AI Quiz Maker
An AI-powered quiz generation app that creates custom quizzes from any topic or PDF document — with Google authentication, a live leaderboard, and a countdown timer.

🔗 Live Demo: quiz-maker-production-29c2.up.railway.app

✨ Features

AI Quiz Generation — Enter any topic or paste text and get a custom quiz generated instantly using Groq AI
PDF Upload — Upload a PDF and the app extracts the content to generate a quiz from it
Google Sign In — Secure authentication via Firebase
Leaderboard — Real-time leaderboard showing top scores across all users
Timer — Countdown timer per question to keep things competitive
Quiz History — View your past quiz attempts and scores


🛠️ Tech Stack
LayerTechnologyFrontendReact + ViteBackendNode.js + ExpressDatabase & AuthFirebase Firestore + Firebase AuthAIGroq API (LLaMA)DeploymentRailway

🚀 Getting Started
Prerequisites

Node.js installed
A Groq API key from console.groq.com
A Firebase project

Installation

Clone the repo

bashgit clone https://github.com/vinitvihol/quiz-maker.git
cd quiz-maker

Set up the backend

bashcd backend
npm install
Create a .env file in the backend folder:
GROQ_API_KEY=your_groq_api_key_here

Set up the frontend

bashcd ../frontend
npm install

Run the app

In one terminal (backend):
bashcd backend
node index.js
In another terminal (frontend):
bashcd frontend
npm run dev

📁 Project Structure
quiz-maker/
├── backend/          # Node.js + Express API
│   ├── index.js      # Main server file
│   └── .env          # API keys (not committed)
├── frontend/         # React + Vite app
│   └── src/
│       ├── App.jsx   # Main app component
│       ├── firebase.js
│       └── Login.jsx
└── README.md

👤 Author
Vinit Vihol — @vinitvihol

📄 License
This project is open source and available under the MIT License.
