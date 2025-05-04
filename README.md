# ChatGPT Interview Application

A real-time interview application that uses ChatGPT to conduct AI-powered interviews.

## Features

- Real-time chat interface
- AI-powered interview questions
- Conversation history management
- Modern Material-UI design
- Responsive layout

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Set up environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Add your OpenAI API key to `server/.env`

4. Start the application:
   ```bash
   npm start
   ```

The application will start with:
- Frontend running on http://localhost:3000
- Backend running on http://localhost:3001

## Usage

1. Open your browser and navigate to http://localhost:3000
2. Start the interview by typing your first message
3. The AI interviewer will respond with relevant questions
4. Continue the conversation naturally

## Project Structure

```
.
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js         # Main application component
│   │   └── App.css        # Styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   └── index.js       # Express server
│   └── package.json
└── package.json           # Root package.json
```

## Technologies Used

- Frontend:
  - React
  - Material-UI
  - UUID for session management

- Backend:
  - Node.js
  - Express
  - OpenAI API
  - CORS for cross-origin requests

## License

MIT 