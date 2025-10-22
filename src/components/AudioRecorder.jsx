import React, { useState, useRef, useEffect } from 'react';

const AudioRecorder = ({ isListening, audioStreamRef, recordStatus, setRecordStatus }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunksRef = useRef([]);

  const recordButtonRef = useRef(null);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (mediaRecorder) {
        mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
        mediaRecorder.removeEventListener('stop', handleStop);
      }
    };
  }, [mediaRecorder]);

  const handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      audioChunksRef.current.push(event.data);
    }
  };

  const handleStop = () => {
    const mimeType = mediaRecorder?.mimeType || 'audio/webm;codecs=opus';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
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
  };

  const startAudioRecording = () => {
    if (!isListening) {
      alert("Please start listening first to activate the microphone.");
      return;
    }

    if (!audioStreamRef.current) {
      alert("Audio stream not available. Please restart the listening process.");
      return;
    }

    setIsRecording(true);
    audioChunksRef.current = [];

    const options = { mimeType: 'audio/webm;codecs=opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'audio/webm';
    }

    const recorder = new MediaRecorder(audioStreamRef.current, options);
    recorder.addEventListener('dataavailable', handleDataAvailable);
    recorder.addEventListener('stop', handleStop);
    recorder.start();

    setMediaRecorder(recorder);

    // Update UI
    if (recordButtonRef.current) {
      recordButtonRef.current.textContent = "Stop Recording";
      recordButtonRef.current.classList.replace('bg-green-600', 'bg-red-600');
      recordButtonRef.current.classList.replace('hover:bg-green-700', 'hover:bg-red-700');
    }

    setRecordStatus({ text: "Recording...", color: "bg-red-500", pulse: true });
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);

      // Update UI
      if (recordButtonRef.current) {
        recordButtonRef.current.textContent = "Start Recording";
        recordButtonRef.current.classList.replace('bg-red-600', 'bg-green-600');
        recordButtonRef.current.classList.replace('hover:bg-red-700', 'hover:bg-green-700');
      }

      setRecordStatus({ text: "Recording Inactive", color: "bg-gray-500", pulse: false });
    }
  };

  return (
    <button
      ref={recordButtonRef}
      onClick={() => isRecording ? stopAudioRecording() : startAudioRecording()}
      disabled={!isListening}
      className={`px-8 py-3 ${isListening ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'} text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg w-full`}
    >
      Start Recording
    </button>
  );
};

export default AudioRecorder;