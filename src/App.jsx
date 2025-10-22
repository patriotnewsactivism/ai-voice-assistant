import React, { useState, useRef, useEffect } from 'react';
import SpeechRecognitionComponent from './components/SpeechRecognitionComponent';
import TranscriptPolisher from './components/TranscriptPolisher';
import AIResponseHandler from './components/AIResponseHandler';
import AudioRecorder from './components/AudioRecorder';

const App = () => {
  const [activationKeyword, setActivationKeyword] = useState('assistant');
  const [isListening, setIsListening] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [status, setStatus] = useState({ text: 'Inactive', color: 'bg-red-500', pulse: false });
  const [recordStatus, setRecordStatus] = useState({ text: 'Recording Inactive', color: 'bg-gray-500', pulse: false });
  
  const audioStreamRef = useRef(null);
  const isRespondingRef = useRef(false);
  const recognitionRef = useRef(null);

  return (
    <div className="bg-gray-900 text-white flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-3xl bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-400">Always-On AI Assistant</h1>
          <p className="text-gray-400 mt-2">Continuously listens and transcribes. Responds only to your keyword.</p>
        </div>

        {/* Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/50 p-4 rounded-lg">
          {/* Listening Controls */}
          <div className="flex flex-col items-center space-y-3">
            <h2 className="text-lg font-semibold text-blue-300">AI Assistant</h2>
            <div className="w-full">
              <label htmlFor="keywordInput" className="text-sm font-medium text-gray-400">Activation Keyword</label>
              <input 
                type="text" 
                id="keywordInput" 
                value={activationKeyword}
                onChange={(e) => setActivationKeyword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter activation keyword"
              />
            </div>
            <SpeechRecognitionComponent 
              isListening={isListening}
              setIsListening={setIsListening}
              setInterimTranscript={setInterimTranscript}
              setFinalTranscript={setFinalTranscript}
              setStatus={setStatus}
              audioStreamRef={audioStreamRef}
              recognitionRef={recognitionRef}
              activationKeyword={activationKeyword}
              conversationHistory={conversationHistory}
              setConversationHistory={setConversationHistory}
              isRespondingRef={isRespondingRef}
            />
            <div id="status" className="flex items-center justify-center space-x-3 h-8">
              <div 
                id="status-indicator" 
                className={`w-4 h-4 rounded-full transition-colors duration-500 ${status.color} ${status.pulse ? 'pulse' : ''}`}
              ></div>
              <span id="status-text" className="text-gray-300 font-medium">{status.text}</span>
            </div>
          </div>
          
          {/* Recording Controls */}
          <div className="flex flex-col items-center space-y-3">
            <h2 className="text-lg font-semibold text-green-300">Audio Recorder</h2>
            <p className="text-sm text-gray-400 text-center">Uses efficient 'Opus' codec for small, high-quality files.</p>
            <AudioRecorder 
              isListening={isListening}
              audioStreamRef={audioStreamRef}
              recordStatus={recordStatus}
              setRecordStatus={setRecordStatus}
            />
            <div id="record-status" className="flex items-center justify-center space-x-3 h-8">
              <div 
                id="record-indicator" 
                className={`w-4 h-4 rounded-full transition-colors duration-500 ${recordStatus.color} ${recordStatus.pulse ? 'recording-pulse' : ''}`}
              ></div>
              <span id="record-text" className="text-gray-300 font-medium">{recordStatus.text}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-400 mb-2">Currently Hearing...</h2>
            <div 
              id="interimTranscript" 
              className="w-full min-h-[3rem] bg-gray-900 rounded-lg p-4 border border-gray-700 text-gray-200 font-medium text-lg"
            >
              {interimTranscript}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">Conversation Log (AI-Polished)</h2>
            <div 
              id="transcript" 
              className="w-full h-48 bg-gray-900 rounded-lg p-4 overflow-y-auto border border-gray-700 text-gray-300"
            >
              {finalTranscript}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">AI Response</h2>
            <div 
              id="response" 
              className="w-full min-h-[6rem] bg-gray-900 rounded-lg p-4 border border-gray-700 text-gray-200"
            >
              {aiResponse}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;