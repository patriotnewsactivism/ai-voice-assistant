# Always-On AI Assistant v7 (React Implementation)

This is a React-based implementation of the Always-On AI Assistant with improved architecture and Vercel deployment support.

## Features

- Continuous speech recognition
- AI-powered transcription polishing
- Audio recording capabilities
- Conversational AI responses using Google's Gemini API
- Customizable activation keyword
- Visual status indicators

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Google Gemini API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to Vercel

1. Push your code to a GitHub repository
2. Create a Vercel account if you don't have one
3. Connect your GitHub repository to Vercel
4. Add your `VITE_GEMINI_API_KEY` as an environment variable in your Vercel project settings
5. Deploy!

## Components

- `App.jsx` - Main application component
- `SpeechRecognitionComponent.jsx` - Handles speech recognition functionality
- `AudioRecorder.jsx` - Manages audio recording
- `TranscriptPolisher.jsx` - Polishes transcriptions using AI
- `AIResponseHandler.jsx` - Handles AI responses and speech synthesis

## How It Works

1. Click "Start Listening" to activate the microphone
2. The assistant continuously listens for speech
3. When the activation keyword is detected, it processes the following speech as a command
4. The AI responds both visually and audibly
5. You can record conversations using the "Start Recording" button

## Customization

- Change the activation keyword in the input field
- Modify the UI by editing the Tailwind CSS classes
- Adjust AI behavior by modifying the prompts in `AIResponseHandler.jsx`

## Troubleshooting

- If the microphone isn't working, check your browser permissions
- If the AI isn't responding, verify your API key is correct
- For best results, use Chrome or Edge browsers