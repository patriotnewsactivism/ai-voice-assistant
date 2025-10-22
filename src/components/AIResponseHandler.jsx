import React, { useState, useEffect } from 'react';

const AIResponseHandler = ({ conversationHistory, setAiResponse, isRespondingRef, setStatus }) => {
  const [voice, setVoice] = useState(null);
  
  // Configuration
  const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // API key from environment variables

  useEffect(() => {
    // Load and set voice for speech synthesis
    const loadVoice = () => {
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

    loadVoice();
    window.speechSynthesis.onvoiceschanged = loadVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Helper function for API calls with backoff
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

  // Function to get AI response
  const getAiResponse = async (userQuery) => {
    if (!API_KEY) {
      console.error("Gemini API key not found in environment variables");
      setAiResponse("API key not configured. Please set VITE_GEMINI_API_KEY in your environment variables.");
      isRespondingRef.current = false;
      return;
    }

    setStatus({ text: 'Keyword detected, thinking...', color: 'bg-cyan-500', pulse: true });
    
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
        // Add AI response to conversation history
        // This would typically be done in the parent component
      } else {
        throw new Error("Invalid response structure from API.");
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
      speakResponse("Sorry, I had trouble processing that. Please try again.");
    }
  };

  // Function to speak the AI response
  const speakResponse = (text) => {
    setAiResponse(text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    
    utterance.onstart = () => {
      setStatus({ text: 'Speaking...', color: 'bg-blue-500', pulse: false });
    };
    
    utterance.onend = () => {
      setTimeout(() => {
        isRespondingRef.current = false;
        setStatus({ text: 'Listening for keyword...', color: 'bg-green-500', pulse: true });
      }, 500);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  return null; // This is a utility component with no UI
};

export default AIResponseHandler;