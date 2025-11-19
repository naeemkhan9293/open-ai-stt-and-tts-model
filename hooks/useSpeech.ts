import { useState, useRef, useCallback, useEffect } from 'react';

export const useSpeech = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check for MediaRecorder support
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsSupported(true);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        return reject("No media recorder found");
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, []);

  const playAudio = useCallback((audioBlob: Blob, onEnded?: () => void) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
      URL.revokeObjectURL(url); // Cleanup
    };

    audio.play().catch(err => console.error("Audio playback failed:", err));
  }, []);

  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  return {
    isSupported,
    isRecording,
    isPlaying,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio
  };
};