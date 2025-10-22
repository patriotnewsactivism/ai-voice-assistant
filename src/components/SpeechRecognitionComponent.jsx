import React, { useEffect, useRef } from 'react';

const SpeechRecognitionComponent = ({
  isListening,
  setIsListening,
  setInterimTranscript,
  setFinalTranscript,
  setStatus,
  audioStreamRef,
  recognitionRef,
  activationKeyword,
  conversationHistory,
  setConversationHistory,
  isRespondingRef
}) => {
  const startButtonRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support the Web Speech API. Try Chrome or Edge.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    // Set up recognition event handlers
    recognitionRef.current.onstart = () => console.log('Speech recognition started.');
    
    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended.');
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
        setIsListening(false);
        setStatus({ text: 'Inactive', color: 'bg-red-500', pulse: false });
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
      
      setInterimTranscript(final_transcript + interim_transcript);

      // Handle final transcript
      if (final_transcript && final_transcript.length > 0) {
        // Add to conversation history
        setConversationHistory(prev => [...prev, final_transcript.trim()]);
        
        // Update final transcript display
        setFinalTranscript(prev => prev + (prev ? '\n' : '') + final_transcript.trim());
      }

      // Keyword detection
      const lowerCaseUtterance = (final_transcript + interim_transcript).toLowerCase();
      const keywordIndex = lowerCaseUtterance.lastIndexOf(activationKeyword);

      if (keywordIndex > -1 && !isRespondingRef.current) { 
        const command = (final_transcript + interim_transcript).substring(keywordIndex + activationKeyword.length).trim();
        if (command.length > 2) {
          isRespondingRef.current = true;
          // Here we would trigger the AI response
          // For now, we'll just update the status
          setStatus({ text: 'Keyword detected, thinking...', color: 'bg-cyan-500', pulse: true });
        }
      }
    };

    return () => {
      // Clean up recognition on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, activationKeyword]);

  const startListening = async () => {
    if (isListening || !recognitionRef.current) return;
    
    try {
      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      
      // Update UI
      if (startButtonRef.current) {
        startButtonRef.current.textContent = 'Stop Listening';
        startButtonRef.current.classList.replace('bg-blue-600', 'bg-red-600');
        startButtonRef.current.classList.replace('hover:bg-blue-700', 'hover:bg-red-700');
      }
      
      setStatus({ text: 'Listening for keyword...', color: 'bg-green-500', pulse: true });
      recognitionRef.current.start();
    } catch (err) {
      console.error("Error getting audio stream:", err);
      alert("Could not access the microphone. Please grant permission and try again.");
    }
  };

  const stopListening = () => {
    if (!isListening || !recognitionRef.current) return;
    
    setIsListening(false);
    
    // Stop recognition
    recognitionRef.current.stop();
    
    // Stop audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // Update UI
    if (startButtonRef.current) {
      startButtonRef.current.textContent = 'Start Listening';
      startButtonRef.current.classList.replace('bg-red-600', 'bg-blue-600');
      startButtonRef.current.classList.replace('hover:bg-red-700', 'hover:bg-blue-700');
    }
    
    setStatus({ text: 'Inactive', color: 'bg-red-500', pulse: false });
  };

  return (
    <button
      ref={startButtonRef}
      onClick={() => isListening ? stopListening() : startListening()}
      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg w-full"
    >
      {isListening ? 'Stop Listening' : 'Start Listening'}
    </button>
  );
};

export default SpeechRecognitionComponent;