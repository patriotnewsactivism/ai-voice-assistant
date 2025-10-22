import React, { useState, useRef, useEffect } from 'react';

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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const globalInterimTranscriptRef = useRef('');
  const lastFinalTranscriptRef = useRef('');

  // --- BROWSER SUPPORT CHECK ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Sorry, your browser doesn't support the Web Speech API. Try Chrome or Edge.");
  }

  // --- VOICE SELECTION LOGIC ---
  const [voice, setVoice] = useState(null);
  
  useEffect(() => {
    const loadAndSetVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      
      let femaleVoices = voices.filter(v => 
        v.lang.startsWith('en-US') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.includes('Google US English') || 
         v.name.includes('Zira'))
      );
      
      if (femaleVoices.length > 0) {
        const googleVoice = femaleVoices.find(v => v.name.includes('Google US English'));
        setVoice(googleVoice || femaleVoices[0]);
      } else {
        const usVoices = voices.filter(v => v.lang.startsWith('en-US'));
        setVoice(usVoices.length > 0 ? usVoices[0] : voices[0]);
      }
    };

    loadAndSetVoice();
    window.speechSynthesis.onvoiceschanged = loadAndSetVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // --- UI UPDATE FUNCTIONS ---
  const updateStatus = (text, color, pulse = false) => {
    setStatus({ text, color, pulse });
  };

  const updateRecordStatus = (text, color, pulse = false) => {
    setRecordStatus({ text, color, pulse });
  };

  // --- CORE LISTENING LOGIC ---
  const startListening = async () => {
    if (isListening || !SpeechRecognition) return;
    
    try {
      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      // Set up recognition event handlers
      recognitionRef.current.onstart = () => console.log('Speech recognition started.');
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended.');
        globalInterimTranscriptRef.current = '';
        lastFinalTranscriptRef.current = '';
        if (isListening) {
          console.log('Restarting recognition...');
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.error("Error restarting recognition:", err);
          }
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert("Microphone access was denied. Please allow microphone access in your browser settings and refresh the page.");
          stopListening();
        }
      };

      recognitionRef.current.onresult = (event) => {
        let interim_transcript = '';
        let final_transcript = '';
        
        for (let i = 0; i < event.results.length; ++i) {
          const transcript_chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final_transcript += transcript_chunk;
          } else {
            interim_transcript += transcript_chunk;
          }
        }
        
        globalInterimTranscriptRef.current = final_transcript + interim_transcript;
        setInterimTranscript(globalInterimTranscriptRef.current);

        if (final_transcript.length > lastFinalTranscriptRef.current.length) {
          const newFinalChunk = final_transcript.substring(lastFinalTranscriptRef.current.length).trim();
          if (newFinalChunk) {
            // Add to conversation history
            setConversationHistory(prev => [...prev, newFinalChunk]);
            
            // Update final transcript display
            setFinalTranscript(prev => prev + (prev ? '\n' : '') + newFinalChunk);
            
            lastFinalTranscriptRef.current = final_transcript;
          }
        }

        // Keyword detection
        const lowerCaseUtterance = globalInterimTranscriptRef.current.toLowerCase();
        const keywordIndex = lowerCaseUtterance.lastIndexOf(activationKeyword);

        if (keywordIndex > -1 && !isRespondingRef.current) { 
          const command = globalInterimTranscriptRef.current.substring(keywordIndex + activationKeyword.length).trim();
          if (command.length > 2 && (interim_transcript.length === 0 || final_transcript.includes(command))) {
            isRespondingRef.current = true;
            getAiResponse(command);
          }
        }
      };

      recognitionRef.current.start();
      updateStatus('Listening for keyword...', 'bg-green-500', true);
    } catch (err) {
      console.error("Error getting audio stream:", err);
      alert("Could not access the microphone. Please grant permission and try again.");
    }
  };
  
  const stopListening = () => {
    if (!isListening || !recognitionRef.current) return;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      stopAudioRecording();
    }
    
    setIsListening(false);
    
    // Stop recognition
    recognitionRef.current.stop();
    
    // Stop audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    updateStatus('Inactive', 'bg-red-500');
  };

  const speakResponse = (text) => {
    setAiResponse(text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    
    utterance.onstart = () => updateStatus('Speaking...', 'bg-blue-500');
    
    utterance.onend = () => {
      setTimeout(() => {
        isRespondingRef.current = false;
        if (isListening) {
          updateStatus('Listening for keyword...', 'bg-green-500', true);
        } else {
          updateStatus('Inactive', 'bg-red-500');
        }
      }, 500);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // --- GEMINI API CALL (Helper) ---
  const fetchWithBackoff = async (apiUrl, payload) => {
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) return response;
        
        if (response.status === 429 || response.status >= 500) {
          console.warn(`API Error ${response.status}. Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
        } else {
          throw new Error(`API Error: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Fetch error. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
    throw new Error(`API Error after retries`);
  };

  // --- AI RESPONSE FUNCTION ---
  const getAiResponse = async (userQuery) => {
    updateStatus('Keyword detected, thinking...', 'bg-cyan-500', true);
    
    const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error("Gemini API key not found in environment variables");
      speakResponse("API key not configured. Please set VITE_GEMINI_API_KEY in your environment variables.");
      isRespondingRef.current = false;
      return;
    }
    
    const systemPrompt = `You are a helpful AI assistant. You have been listening to a conversation. The user has just addressed you with a specific query. Provide a concise and relevant response based on the preceding conversation context and the user's query.`;
    const fullPrompt = `Conversation Context:\n${conversationHistory.slice(-10).join('\n')}\n\nUser Query: ${userQuery}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
    const payload = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    try {
      const response = await fetchWithBackoff(apiUrl, payload);
      const result = await response.json();
      const candidate = result.candidates?.[0];
      
      if (candidate && candidate.content?.parts?.[0]?.text) {
        const aiText = candidate.content.parts[0].text;
        speakResponse(aiText);
        setConversationHistory(prev => [...prev, `AI: ${aiText}`]);
      } else {
        throw new Error("Invalid response structure from API.");
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
      speakResponse("Sorry, I had trouble processing that. Please try again.");
      isRespondingRef.current = false;
    }
  };

  // --- AUDIO RECORDING LOGIC ---
  const startAudioRecording = () => {
    if (!audioStreamRef.current) {
      alert("Please start listening first to activate the microphone.");
      return;
    }
    
    audioChunksRef.current = [];
    const options = { mimeType: 'audio/webm;codecs=opus' };
    
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'audio/webm';
    }
    
    mediaRecorderRef.current = new MediaRecorder(audioStreamRef.current, options);
    
    mediaRecorderRef.current.addEventListener('dataavailable', event => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    });
    
    mediaRecorderRef.current.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = audioUrl;
      
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      a.download = `recording-${timestamp}.webm`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(audioUrl);
      document.body.removeChild(a);
      
      // Reset chunks
      audioChunksRef.current = [];
    });
    
    mediaRecorderRef.current.start();
    updateRecordStatus("Recording...", "bg-red-500", true);
  };
  
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      updateRecordStatus("Recording Inactive", "bg-gray-500");
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      stopAudioRecording();
    } else {
      startAudioRecording();
    }
  };

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
                onChange={(e) => setActivationKeyword(e.target.value.trim().toLowerCase() || "assistant")}
                disabled={isListening}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Enter activation keyword"
              />
            </div>
            <button
              onClick={() => isListening ? stopListening() : startListening()}
              className={`px-8 py-3 ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg w-full`}
            >
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
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
            <button
              onClick={toggleRecording}
              disabled={!isListening}
              className={`px-8 py-3 ${isListening ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'} text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg w-full disabled:opacity-50`}
            >
              {mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' ? 'Stop Recording' : 'Start Recording'}
            </button>
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
            <h2 className="text-lg font-semibold text-blue-300 mb-2">Conversation Log</h2>
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