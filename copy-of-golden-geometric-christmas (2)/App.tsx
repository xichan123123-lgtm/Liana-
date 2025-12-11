
import React, { useState, useEffect, useRef } from 'react';
import Scene from './components/Scene';
import { AppState } from './types';
import { MUSIC_URL, INTERACTION_SOUND_URL } from './constants';
import { Volume2, VolumeX } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.TREE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Ref to track interaction start for distinguishing click vs drag
  const dragStart = useRef({ x: 0, y: 0, time: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const interactionSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Background Music
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;

    // Interaction Sound
    interactionSoundRef.current = new Audio(INTERACTION_SOUND_URL);
    interactionSoundRef.current.volume = 0.6;
    
    // Attempt auto-play immediately on mount
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
        })
        .catch(error => {
          console.log("Auto-play prevented by browser policy. Waiting for user interaction.", error);
        });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (interactionSoundRef.current) {
        interactionSoundRef.current = null;
      }
    };
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
      setIsPlaying(true);
    }
  };

  const handleInteraction = () => {
    // Attempt auto-play on first interaction if it hasn't started yet
    if (!hasInteracted && audioRef.current) {
      setHasInteracted(true);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.warn("Autoplay blocked", e));
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const dt = Date.now() - dragStart.current.time;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Thresholds: Movement < 20px (relaxed) AND Duration < 400ms (relaxed) considered a click
    // This allows for slight movement while clicking and a more natural click speed
    if (dist < 20 && dt < 400) {
      handleSceneClick();
    }
  };

  const handleSceneClick = () => {
    handleInteraction();
    
    // Play magical chime sound
    if (interactionSoundRef.current) {
      interactionSoundRef.current.currentTime = 0;
      interactionSoundRef.current.play().catch(e => console.warn("Interaction sound blocked", e));
    }

    // Cycle through states: Tree -> Exploded -> Text -> Tree
    setAppState((prev) => {
      if (prev === AppState.TREE) return AppState.EXPLODED;
      if (prev === AppState.EXPLODED) return AppState.TEXT;
      return AppState.TREE;
    });
  };

  return (
    <div 
      className="w-full h-screen relative bg-black select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Overlay UI */}
      <div className="absolute top-0 left-0 w-full z-10 pointer-events-none p-8 flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl text-[#D4AF37] font-serif-custom tracking-widest drop-shadow-[0_2px_10px_rgba(212,175,55,0.5)] text-center animate-pulse">
          MERRY CHRISTMAS
        </h1>
        <p className="text-[#D4AF37] text-sm mt-4 opacity-70 font-serif-custom tracking-widest uppercase">
          {appState === AppState.TREE && "Click to Unwrap the Magic"}
          {appState === AppState.EXPLODED && "Click to Reveal the Message"}
          {appState === AppState.TEXT && "Click to Rebuild the Tree"}
        </p>
      </div>

      {/* Audio Control */}
      <button 
        onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
        onPointerDown={(e) => e.stopPropagation()} // Prevent triggering scene click
        className="absolute bottom-8 right-8 z-20 text-[#D4AF37] hover:text-white transition-colors bg-white/10 backdrop-blur-md p-3 rounded-full border border-[#D4AF37]/30 cursor-pointer pointer-events-auto"
      >
        {isPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>

      {/* 3D Scene */}
      <div className="w-full h-full cursor-pointer">
        <Scene appState={appState} />
      </div>

      {/* Initial Interaction Overlay (optional, just to ensure audio start) */}
      {!hasInteracted && !isPlaying && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="text-[#D4AF37] animate-bounce">
             Click anywhere to start
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
