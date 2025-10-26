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
  isRespondingRef,
  onTriggerAi
}) => {
  const startButtonRef = useRef(null);

  const fullTranscriptRef = useRef('');

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
    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started.');
      fullTranscriptRef.current = '';
    };
    
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
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript_chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final_transcript += transcript_chunk;
        } else {
          interim_transcript += transcript_chunk;
        }
      }
      
      // Build the full utterance for display
      const currentUtterance = fullTranscriptRef.current + final_transcript + interim_transcript;
      setInterimTranscript(currentUtterance);

      // Handle final transcript
      if (final_transcript && final_transcript.length > 0) {
        fullTranscriptRef.current += final_transcript;
        
        // Add to conversation history
        setConversationHistory(prev => [...prev, final_transcript.trim()]);
        
        // Update final transcript display
        setFinalTranscript(prev => prev + (prev ? '\n' : '') + final_transcript.trim());
      }

      // Keyword detection - check the full accumulated transcript
      const lowerCaseUtterance = currentUtterance.toLowerCase();
      const lowerKeyword = activationKeyword.toLowerCase();
      const keywordIndex = lowerCaseUtterance.lastIndexOf(lowerKeyword);

      if (keywordIndex > -1 && !isRespondingRef.current) {
        // Extract everything after the keyword
        const afterKeyword = currentUtterance.substring(keywordIndex + activationKeyword.length).trim();
        
        console.log('Keyword detected! After keyword:', afterKeyword);
        
        // Only trigger if there's meaningful content after the keyword or if final transcript detected
        if (afterKeyword.length > 0 || final_transcript) {
          // Wait a moment for more speech if this is interim
          if (interim_transcript && !final_transcript) {
            // Don't trigger yet, wait for final transcript
            return;
          }
          
          const command = afterKeyword || "help"; // Default to "help" if no command given
          
          isRespondingRef.current = true;
          fullTranscriptRef.current = ''; // Reset for next interaction
          setStatus({ text: 'Keyword detected, thinking...', color: 'bg-cyan-500', pulse: true });
          
          // Trigger the AI response handler in the parent if provided
          if (typeof onTriggerAi === 'function') {
            try {
              console.log('Triggering AI with command:', command);
              onTriggerAi(command);
            } catch (err) {
              console.error('Error calling onTriggerAi:', err);
              isRespondingRef.current = false;
              setStatus({ text: 'Listening for keyword...', color: 'bg-green-500', pulse: true });
            }
          }
        }
      }
    };

    return () => {
      // Clean up recognition on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, activationKeyword, setInterimTranscript, setFinalTranscript, setStatus, setConversationHistory, isRespondingRef, onTriggerAi]);

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