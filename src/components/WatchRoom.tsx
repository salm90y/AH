import { Youtube } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Share2, 
  Users, 
  LogOut, 
  Copy, 
  Check, 
  PlaySquare, 
  Play, 
  Pause, 
  Volume1,
  Volume2, 
  VolumeX, 
  Sliders,
  Send, 
  Search, 
  Maximize, 
  Minimize, 
  Upload, 
  Loader2, 
  Video, 
  Image, 
  Plus, 
  Trash2, 
  ListVideo, 
  X, 
  Radio, 
  Link2, 
  RotateCcw, 
  RotateCw, 
  Edit2, 
  Edit3,
  Globe, 
  ExternalLink, 
  Sparkles, 
  Film, 
  RefreshCw, 
  Zap, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  MessageSquare, 
  FlipHorizontal, 
  Eye, 
  EyeOff, 
  Shield,
  Crown,
  Settings,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Save,
  Smile,
  MoreVertical,
  PhoneCall,
  PhoneOff,
  Headphones,
  Speaker,
  UserX,
  Ban,
  MessageSquareOff,
  VolumeX as AudioMutedIcon,
  ShieldAlert,
  Award
} from 'lucide-react';
import { getItemSafe, setItemSafe } from '../utils/storage';
import { VideoPlayer } from './VideoPlayer';
import { WebBrowser } from './WebBrowser';
import { UserAccount } from '../types/user';
import { Room as LiveKitRoom, RoomEvent as LiveKitRoomEvent, Track as LiveKitTrack, RemoteParticipant } from 'livekit-client';

function LiveKitVideoTile({ track, identity, name }: { track: LiveKitTrack; identity: string; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && track) {
      const el = track.attach(videoRef.current);
      return () => {
        track.detach(el);
      };
    }
  }, [track]);

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-blue-500/50 shadow-md">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-md border border-white/20 font-bold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
        <span>{name || identity}</span>
      </div>
    </div>
  );
}

// Helper to create valid 44-byte WAV header for PCM Int16 samples
function createWavBuffer(pcmInt16: Int16Array, sampleRate = 16000): Uint8Array {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmInt16.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  const pcmBytes = new Uint8Array(pcmInt16.buffer, pcmInt16.byteOffset, pcmInt16.byteLength);
  wavBytes.set(pcmBytes, 44);

  return wavBytes;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkLength = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkLength) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunkLength) as unknown as number[]
    );
  }
  return window.btoa(binary);
}

interface WatchRoomProps {
  roomId: string;
  onLeave: () => void;
  currentUser?: UserAccount | null;
  isStealth?: boolean;
  onOpenAdmin?: () => void;
  onUserUpdated?: (user: UserAccount) => void;
}

export default function WatchRoom({ roomId, onLeave, currentUser, isStealth = false, onOpenAdmin, onUserUpdated }: WatchRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [videoId, setVideoId] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [creatorName, setCreatorName] = useState('');
  const [isRoomPublic, setIsRoomPublic] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageName, setManageName] = useState('');
  const [managePassword, setManagePassword] = useState('');
  const [manageIsPublic, setManageIsPublic] = useState(true);
  const [isSavingManage, setIsSavingManage] = useState(false);
  const [manageError, setManageError] = useState('');
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isStealthMode] = useState<boolean>(!!isStealth);
  const [isMutedAudioByMod, setIsMutedAudioByMod] = useState<boolean>(false);
  const [isMutedTextByMod, setIsMutedTextByMod] = useState<boolean>(false);
  const [roomModerators, setRoomModerators] = useState<string[]>([]);
  const [moderationToast, setModerationToast] = useState<{ message: string; type: string } | null>(null);
  const [activeModMemberMenu, setActiveModMemberMenu] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [showM3u, setShowM3u] = useState(false);
  const [m3uPlaylist, setM3uPlaylist] = useState<any[]>([]);
  const [m3uSearch, setM3uSearch] = useState('');

  // M3U8 Direct Link Modal State
  const [showM3u8Modal, setShowM3u8Modal] = useState(false);
  const [m3u8InputUrl, setM3u8InputUrl] = useState('');
  const [m3u8Title, setM3u8Title] = useState('');
  const [m3u8SaveToList, setM3u8SaveToList] = useState(true);
  const [m3u8Error, setM3u8Error] = useState('');

  // Web Video Extractor / Browser Modal State
  const [showWebExtractorModal, setShowWebExtractorModal] = useState(false);
  const [webExtractUrl, setWebExtractUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractedResult, setExtractedResult] = useState<{
    title: string;
    pageUrl: string;
    siteName: string;
    thumbnail?: string;
    streams: Array<{ url: string; type: string; label: string; quality?: string }>;
  } | null>(null);
  const [webActiveTab, setWebActiveTab] = useState<'browser' | 'extract'>('browser');
  const [browserIframeUrl, setBrowserIframeUrl] = useState('');
  const [iframeProxyMode, setIframeProxyMode] = useState<'proxy' | 'direct'>('proxy');
  const [iframeReloadCount, setIframeReloadCount] = useState(0);
  const [detectedLiveVideo, setDetectedLiveVideo] = useState<{ url: string; title: string } | null>(null);
  const [copiedStreamUrl, setCopiedStreamUrl] = useState<string | null>(null);
  const [savedStreamUrl, setSavedStreamUrl] = useState<string | null>(null);

  // Edit M3U Channel State
  const [showEditM3uModal, setShowEditM3uModal] = useState(false);
  const [editingChannelIndex, setEditingChannelIndex] = useState<number | null>(null);
  const [editChannelTitle, setEditChannelTitle] = useState('');
  const [editChannelUrl, setEditChannelUrl] = useState('');
  const [editChannelError, setEditChannelError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const roomM3uFileInputRef = useRef<HTMLInputElement>(null);
  
  const roomStorageKey = `roomM3uPlaylist_${roomId}`;

  const updateAndSavePlaylist = useCallback((newList: any[]) => {
    setM3uPlaylist(newList);
    setItemSafe(roomStorageKey, newList).catch(() => {});
    socket?.emit('playlist-update', { roomId, playlist: newList });
  }, [roomId, roomStorageKey, socket]);

  useEffect(() => {
    getItemSafe<any[]>(roomStorageKey, []).then(stored => {
      if (Array.isArray(stored) && stored.length > 0) {
        setM3uPlaylist(stored);
      }
    });
  }, [roomStorageKey]);
  const [chatInput, setChatInput] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    getItemSafe<any[]>('visitedRooms', []).then(history => {
      if (Array.isArray(history)) {
        const room = history.find((r: any) => r.id === roomId);
        if (room && room.isCreator) setIsCreator(true);
      }
    });
  }, [roomId]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [userName] = useState(() => currentUser?.fullName || currentUser?.username || ('ضيف-' + Math.floor(Math.random() * 10000)));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Special Action Bar & Media States (Exclusive Panel: Chat, Walkie-Talkie Voice, Camera, Members)
  const [activePanel, setActivePanel] = useState<'chat' | 'voice' | 'camera' | 'members' | 'none'>('chat');
  const [isWalkieTalking, setIsWalkieTalking] = useState(false);
  const [isLocalVoiceSpeaking, setIsLocalVoiceSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isLocalSpeakingRef = useRef(false);

  const [activeSpeaker, setActiveSpeaker] = useState<{ 
    sender: string; 
    fullName?: string; 
    avatar?: string; 
    timestamp: number 
  } | null>(null);
  const activeSpeakerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dedicated Voice Chat Volume & Mute States (Independent from video player volume)
  const [voiceVolume, setVoiceVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('room_voice_vol');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 1;
    } catch {
      return 1;
    }
  });
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('room_voice_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [showVoiceOverlay, setShowVoiceOverlay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('room_show_voice_overlay');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [activeVoicePopup, setActiveVoicePopup] = useState<'volume' | 'settings' | null>(null);
  const [audioOutputMode, setAudioOutputMode] = useState<'speaker' | 'earpiece'>(() => {
    try {
      return (localStorage.getItem('room_audio_output_mode') as 'speaker' | 'earpiece') || 'speaker';
    } catch {
      return 'speaker';
    }
  });
  const [audioBoosterLevel, setAudioBoosterLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('room_audio_boost');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const voiceVolumeRef = useRef(voiceVolume);
  const isVoiceMutedRef = useRef(isVoiceMuted);
  const audioOutputModeRef = useRef(audioOutputMode);
  const audioBoosterLevelRef = useRef(audioBoosterLevel);

  const applyAudioSettings = useCallback((vol: number, muted: boolean, mode: 'speaker' | 'earpiece', boost: number) => {
    audioOutputModeRef.current = mode;
    audioBoosterLevelRef.current = boost;
    const effectiveVol = muted ? 0 : Math.min(1, Math.max(0, vol * (boost >= 1 ? 1 : boost)));

    const allAudios = document.querySelectorAll<HTMLAudioElement>('audio[id^="lk-audio-"], audio.voice-player');
    allAudios.forEach(async (el) => {
      el.volume = effectiveVol;
      if ('setSinkId' in el && typeof (el as any).setSinkId === 'function') {
        try {
          if (mode === 'speaker') {
            await (el as any).setSinkId('');
          } else {
            const devices = await navigator.mediaDevices?.enumerateDevices?.().catch(() => []);
            const earpiece = devices?.find(d => 
              d.kind === 'audiooutput' && 
              (d.label.toLowerCase().includes('earpiece') || 
               d.label.toLowerCase().includes('headphone') || 
               d.label.toLowerCase().includes('headset') || 
               d.label.toLowerCase().includes('internal'))
            );
            if (earpiece && earpiece.deviceId) {
              await (el as any).setSinkId(earpiece.deviceId);
            }
          }
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    voiceVolumeRef.current = voiceVolume;
    try { localStorage.setItem('room_voice_vol', String(voiceVolume)); } catch {}
    applyAudioSettings(voiceVolume, isVoiceMuted, audioOutputMode, audioBoosterLevel);
  }, [voiceVolume, isVoiceMuted, audioOutputMode, audioBoosterLevel, applyAudioSettings]);

  useEffect(() => {
    isVoiceMutedRef.current = isVoiceMuted;
    try { localStorage.setItem('room_voice_muted', String(isVoiceMuted)); } catch {}
    applyAudioSettings(voiceVolume, isVoiceMuted, audioOutputMode, audioBoosterLevel);
  }, [isVoiceMuted, voiceVolume, audioOutputMode, audioBoosterLevel, applyAudioSettings]);

  useEffect(() => {
    audioOutputModeRef.current = audioOutputMode;
    try { localStorage.setItem('room_audio_output_mode', audioOutputMode); } catch {}
    applyAudioSettings(voiceVolume, isVoiceMuted, audioOutputMode, audioBoosterLevel);
  }, [audioOutputMode, voiceVolume, isVoiceMuted, audioBoosterLevel, applyAudioSettings]);

  useEffect(() => {
    audioBoosterLevelRef.current = audioBoosterLevel;
    try { localStorage.setItem('room_audio_boost', String(audioBoosterLevel)); } catch {}
    applyAudioSettings(voiceVolume, isVoiceMuted, audioOutputMode, audioBoosterLevel);
  }, [audioBoosterLevel, voiceVolume, isVoiceMuted, audioOutputMode, applyAudioSettings]);

  useEffect(() => {
    try { localStorage.setItem('room_show_voice_overlay', String(showVoiceOverlay)); } catch {}
  }, [showVoiceOverlay]);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [peerCameras, setPeerCameras] = useState<Record<string, { sender: string; frame: string; lastUpdated: number }>>({});
  
  // LiveKit State & Ref
  const [isLiveKitConnected, setIsLiveKitConnected] = useState<boolean>(false);
  const [isLiveKitConnecting, setIsLiveKitConnecting] = useState<boolean>(false);
  const [isContinuousCallActive, setIsContinuousCallActive] = useState<boolean>(false);
  const [isLiveKitMicMuted, setIsLiveKitMicMuted] = useState<boolean>(false);
  const [liveKitParticipantsCount, setLiveKitParticipantsCount] = useState<number>(0);
  const [liveKitError, setLiveKitError] = useState<string | null>(null);
  const [remoteLiveKitTracks, setRemoteLiveKitTracks] = useState<Record<string, { identity: string; name: string; track: LiveKitTrack }>>({});
  const liveKitRoomRef = useRef<LiveKitRoom | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const voiceAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const voicePlaybackAudioCtxRef = useRef<AudioContext | null>(null);
  const voiceNextPlayTimeRef = useRef<number>(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const isSeeking = useRef(false);
  const seekReleaseTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isHandlingRemote = useRef(false);
  const remoteTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTime = useRef(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const webIframeRef = useRef<HTMLIFrameElement>(null);

  // FIFO Temporary Chat Notifications (5s per toast over video)
  const [currentToast, setCurrentToast] = useState<{ id: string; sender: string; text: string; imageUrl?: string; time?: number } | null>(null);
  const toastQueueRef = useRef<Array<{ id: string; sender: string; text: string; imageUrl?: string; time?: number }>>([]);
  const isProcessingToastRef = useRef<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);

  // Speech to Text (Arabic / Iraqi Dialect ar-IQ)
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);
  const [speechTranscript, setSpeechTranscript] = useState<string>('');
  const speechRecognitionRef = useRef<any>(null);
  const isExplicitStopRef = useRef<boolean>(false);
  const accumulatedSpeechRef = useRef<string>('');

  const stopAndSendSpeech = useCallback(() => {
    isExplicitStopRef.current = true;
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
    }
    setIsListeningSpeech(false);

    const textToSend = accumulatedSpeechRef.current.trim();
    if (textToSend && socket && roomId) {
      const msgObj = {
        id: `stt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sender: userName,
        text: textToSend,
        time: Date.now()
      };
      socket.emit('chat-message', { roomId, message: msgObj });
    }
    setSpeechTranscript('');
    accumulatedSpeechRef.current = '';
  }, [socket, roomId, userName]);

  const toggleSpeechToText = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("متصفحك لا يدعم خاصية تحويل الصوت إلى كتابة. يرجى تجربة متصفح Google Chrome أو Edge.");
      return;
    }

    if (isListeningSpeech) {
      stopAndSendSpeech();
      return;
    }

    try {
      isExplicitStopRef.current = false;
      accumulatedSpeechRef.current = '';
      setSpeechTranscript('');

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-IQ'; // Arabic - Iraqi dialect
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListeningSpeech(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalStr = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalStr += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        const fullText = (finalStr + interim).trim();
        accumulatedSpeechRef.current = fullText;
        setSpeechTranscript(fullText);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListeningSpeech(false);
          isExplicitStopRef.current = true;
        }
      };

      recognition.onend = () => {
        if (!isExplicitStopRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListeningSpeech(false);
          }
        } else {
          setIsListeningSpeech(false);
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListeningSpeech(false);
    }
  }, [isListeningSpeech, stopAndSendSpeech]);

  const processNextToast = useCallback(() => {
    if (toastQueueRef.current.length === 0) {
      setCurrentToast(null);
      isProcessingToastRef.current = false;
      return;
    }

    isProcessingToastRef.current = true;
    const nextMsg = toastQueueRef.current.shift()!;
    setCurrentToast(nextMsg);

    setTimeout(() => {
      setCurrentToast(null);
      setTimeout(() => {
        processNextToast();
      }, 200);
    }, 5000); // 5.0 seconds duration
  }, []);

  const enqueueToastMessage = useCallback((msg: { id: string; sender: string; text: string; imageUrl?: string; time?: number }) => {
    toastQueueRef.current.push(msg);
    if (!isProcessingToastRef.current) {
      processNextToast();
    }
  }, [processNextToast]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!socket || !roomId) return;
    socket.emit('delete-message', { roomId, messageId });
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setActiveMsgMenuId(null);
  }, [socket, roomId]);

  const handleClearChat = useCallback(() => {
    if (!socket || !roomId) return;
    if (window.confirm("هل أنت تأكد من مسح جميع رسائل الدردشة؟")) {
      socket.emit('clear-chat', { roomId });
      setMessages([]);
    }
  }, [socket, roomId]);

  const canDeleteMessage = useCallback((msgSender: string) => {
    const isSelf = msgSender === userName;
    const isRoomOwner = isOwner || isCreator || (creatorName && userName.toLowerCase() === creatorName.toLowerCase());
    const isAdmin = currentUser?.role === 'admin';
    return isSelf || isRoomOwner || isAdmin;
  }, [userName, isOwner, isCreator, creatorName, currentUser]);

  const handleForceBypassModals = () => {
    try {
      webIframeRef.current?.contentWindow?.postMessage({ type: 'AUTO_BYPASS_MODALS' }, '*');
      webIframeRef.current?.contentWindow?.postMessage({ type: 'FORCE_UNLOCK' }, '*');
    } catch (e) {
      console.warn("Could not post message to iframe:", e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TRANSFERRED_VIDEO_DETECTED' && event.data?.videoUrl) {
        const videoUrl = event.data.videoUrl;
        const title = event.data.title || 'فيديو تم تشغيله من صفحة الويب';
        setDetectedLiveVideo({ url: videoUrl, title });
        
        // Immediately transfer directly to the watch room player box!
        setVideoId(videoUrl);
        setIsPlaying(true);
        socket?.emit('video-change', { roomId, videoId: videoUrl });
        setShowWebExtractorModal(false);
      } else if (event.data?.type === 'NAVIGATE_TO' && event.data?.url) {
        let cleanUrl = event.data.url;
        if (cleanUrl.includes('/api/proxy-web-page?url=')) {
          try {
            const u = new URL(cleanUrl, window.location.origin);
            cleanUrl = u.searchParams.get('url') || cleanUrl;
          } catch(e) {}
        }
        setBrowserIframeUrl(cleanUrl);
        setWebExtractUrl(cleanUrl);
      }
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [socket, roomId]);

  useEffect(() => {
    const unlockAudioCtx = () => {
      if (voicePlaybackAudioCtxRef.current && voicePlaybackAudioCtxRef.current.state === 'suspended') {
        voicePlaybackAudioCtxRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudioCtx, { capture: true });
    window.addEventListener('touchstart', unlockAudioCtx, { capture: true });
    return () => {
      window.removeEventListener('click', unlockAudioCtx, { capture: true });
      window.removeEventListener('touchstart', unlockAudioCtx, { capture: true });
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (fullscreenContainerRef.current?.requestFullscreen) {
        fullscreenContainerRef.current.requestFullscreen().catch(err => {
          console.warn(`Native fullscreen failed, using custom fullscreen: ${err.message}`);
          setIsFullscreen(true);
        });
      } else if ((fullscreenContainerRef.current as any)?.webkitRequestFullscreen) {
        (fullscreenContainerRef.current as any).webkitRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const isUrl = inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be');
      if (inputUrl.trim() && !isUrl && inputUrl.length >= 2) {
        setIsSearching(true);
        fetch(`/api/search?q=${encodeURIComponent(inputUrl)}`)
          .then(async res => {
            if (!res.ok) return { videos: [] };
            const ct = res.headers.get('content-type');
            if (ct && ct.includes('application/json')) {
              return await res.json();
            }
            return { videos: [] };
          })
          .then(data => {
            if (Array.isArray(data)) {
              setSearchResults(data);
              setHasMoreSearch(false);
              setSearchId('');
            } else if (data && Array.isArray(data.videos)) {
              setSearchResults(data.videos);
              setSearchId(data.searchId || '');
              setHasMoreSearch(!!data.hasMore);
            }
          })
          .catch(err => {
            console.warn("Debounce search error:", err);
            setSearchResults([]);
          })
          .finally(() => setIsSearching(false));
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [inputUrl]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io();
    
    newSocket.on('connect', () => {
      newSocket.emit('join-room', {
        roomId,
        user: currentUser ? {
          id: currentUser.id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          avatar: currentUser.avatar,
          role: currentUser.role,
          isStealth: isStealthMode
        } : {
          username: userName,
          fullName: userName,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'user'
        }
      });
    });

    newSocket.on('room-error', (errorMsg: string) => {
      alert(errorMsg);
      onLeave();
    });

    newSocket.on('room-state', (state: any) => {
      if (state.name) {
        setRoomName(state.name);
        setManageName(state.name);
        // Save the room name to history for better UI
        getItemSafe<any[]>('visitedRooms', []).then(history => {
          if (Array.isArray(history)) {
            const existing = history.find((r: any) => r.id === roomId);
            if (existing && existing.name !== state.name) {
              existing.name = state.name;
              setItemSafe('visitedRooms', history).catch(() => {});
            }
          }
        }).catch(() => {});
      }
      if (state.creatorName) setCreatorName(state.creatorName);
      if (state.isPublic !== undefined) {
        setIsRoomPublic(state.isPublic);
        setManageIsPublic(state.isPublic);
      }
      if (Array.isArray(state.moderators)) {
        setRoomModerators(state.moderators);
      }
      
      const userIsCreator = (currentUser && (
        currentUser.role === 'admin' ||
        (state.creatorId && currentUser.id === state.creatorId) ||
        (state.creatorUsername && currentUser.username?.toLowerCase() === state.creatorUsername.toLowerCase())
      )) || isCreator;
      setIsOwner(!!userIsCreator);

      if (state.messages) setMessages(state.messages);
      if (Array.isArray(state.m3uPlaylist) && state.m3uPlaylist.length > 0) {
        setM3uPlaylist(state.m3uPlaylist);
        setItemSafe(roomStorageKey, state.m3uPlaylist).catch(() => {});
      }
      if (state.videoId) {
        setVideoId(state.videoId);
      }
      setIsPlaying(state.isPlaying);
      if (state.currentTime > 0) {
        isHandlingRemote.current = true;
        if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
        if (playerRef.current) playerRef.current.currentTime = state.currentTime;
        remoteTimeout.current = setTimeout(() => isHandlingRemote.current = false, 2000);
      }
    });

    newSocket.on('kicked-from-room', (data: { reason?: string; operator?: string }) => {
      alert(`⚠️ ${data?.reason || 'تم طردك من الغرفة بواسطة إدارة الغرفة'}`);
      onLeave();
    });

    newSocket.on('banned-from-room', (data: { reason?: string; operator?: string }) => {
      alert(`🚫 ${data?.reason || 'تم حظرك من هذه الغرفة نهائياً بواسطة الإدارة'}`);
      onLeave();
    });

    newSocket.on('audio-muted-by-mod', (data: { isMuted: boolean }) => {
      setIsMutedAudioByMod(data.isMuted);
      if (data.isMuted) {
        setIsWalkieTalking(false);
        setIsContinuousCallActive(false);
        if (liveKitRoomRef.current) {
          liveKitRoomRef.current.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        }
      }
    });

    newSocket.on('text-muted-by-mod', (data: { isMuted: boolean }) => {
      setIsMutedTextByMod(data.isMuted);
    });

    newSocket.on('moderation-toast', (data: { type: string; message: string }) => {
      setModerationToast(data);
      setTimeout(() => setModerationToast(null), 4000);
    });

    newSocket.on('room-members', (members: any[]) => {
      if (Array.isArray(members)) {
        setRoomMembers(members);
        setUserCount(members.length);
      }
    });

    newSocket.on('room-updated', (updated: any) => {
      if (updated.name) {
        setRoomName(updated.name);
        setManageName(updated.name);
      }
      if (updated.isPublic !== undefined) {
        setIsRoomPublic(updated.isPublic);
        setManageIsPublic(updated.isPublic);
      }
    });

    newSocket.on('room-deleted', () => {
      alert('تم حذف هذه الغرفة من قبل صاحب الغرفة أو إدارة المنصة.');
      onLeave();
    });

    newSocket.on('user-count', (count: number) => {
      setUserCount(count);
    });

    newSocket.on('chat-message', (msg: any) => {
      setMessages(prev => [...prev, msg].slice(-50));
      enqueueToastMessage(msg);
    });

    newSocket.on('message-deleted', (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    newSocket.on('chat-cleared', () => {
      setMessages([]);
    });

    newSocket.on('video-change', (newVideoId: string) => {
      setVideoId(newVideoId);
      setIsPlaying(true);
    });

    newSocket.on('play', (time: number) => {
      isHandlingRemote.current = true;
      setIsPlaying(true);
      // Only seek if we're out of sync by more than 2 seconds
      const currentTime = playerRef.current?.currentTime || 0;
      if (Math.abs(currentTime - time) > 2) {
        if (playerRef.current) playerRef.current.currentTime = time;
      }
      if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
      remoteTimeout.current = setTimeout(() => isHandlingRemote.current = false, 2000);
    });

    newSocket.on('pause', (time: number) => {
      isHandlingRemote.current = true;
      setIsPlaying(false);
      if (playerRef.current) playerRef.current.currentTime = time;
      if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
      remoteTimeout.current = setTimeout(() => isHandlingRemote.current = false, 2000);
    });

    newSocket.on('seek', (time: number) => {
      isHandlingRemote.current = true;
      if (playerRef.current) playerRef.current.currentTime = time;
      if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
      remoteTimeout.current = setTimeout(() => isHandlingRemote.current = false, 2000);
    });

    newSocket.on('playlist-update', (playlist: any[]) => {
      if (Array.isArray(playlist)) {
        setM3uPlaylist(playlist);
        setItemSafe(roomStorageKey, playlist).catch(() => {});
      }
    });

    // Real-time Voice Chat / Walkie-Talkie Audio Streaming
    newSocket.on('voice-status', (data: { sender: string, fullName?: string, avatar?: string, isTalking: boolean }) => {
      if (data && data.sender !== userName) {
        if (data.isTalking) {
          setActiveSpeaker({ 
            sender: data.sender, 
            fullName: data.fullName || data.sender,
            avatar: data.avatar,
            timestamp: Date.now() 
          });
          if (activeSpeakerTimeoutRef.current) clearTimeout(activeSpeakerTimeoutRef.current);
          activeSpeakerTimeoutRef.current = setTimeout(() => {
            setActiveSpeaker(null);
          }, 3500);
        } else {
          setActiveSpeaker(prev => (prev?.sender === data.sender ? null : prev));
          if (activeSpeakerTimeoutRef.current) clearTimeout(activeSpeakerTimeoutRef.current);
        }
      }
    });

    newSocket.on('voice-chunk', (data: { sender: string, fullName?: string, avatar?: string, chunk: string, format?: string }) => {
      if (data && data.sender !== userName && data.chunk) {
        try {
          const binaryString = window.atob(data.chunk);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!voicePlaybackAudioCtxRef.current || voicePlaybackAudioCtxRef.current.state === 'closed') {
            voicePlaybackAudioCtxRef.current = new AudioCtx();
          }
          const ctx = voicePlaybackAudioCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }

          ctx.decodeAudioData(bytes.buffer.slice(0), (buffer) => {
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            source.buffer = buffer;

            const vol = isVoiceMutedRef.current ? 0 : (voiceVolumeRef.current !== undefined ? voiceVolumeRef.current : 1);
            gainNode.gain.value = vol;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            const now = ctx.currentTime;
            let startTime = voiceNextPlayTimeRef.current;
            if (startTime < now || startTime > now + 3) {
              startTime = now;
            }
            source.start(startTime);
            voiceNextPlayTimeRef.current = startTime + buffer.duration;
          }, () => {
            try {
              const blob = new Blob([bytes], { type: data.format || 'audio/wav' });
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audio.volume = isVoiceMutedRef.current ? 0 : (voiceVolumeRef.current !== undefined ? voiceVolumeRef.current : 1);
              audio.play().then(() => {
                setTimeout(() => URL.revokeObjectURL(url), 4000);
              }).catch(() => {});
            } catch(e) {}
          });

          setActiveSpeaker({ 
            sender: data.sender, 
            fullName: data.fullName || data.sender,
            avatar: data.avatar,
            timestamp: Date.now() 
          });

          if (activeSpeakerTimeoutRef.current) clearTimeout(activeSpeakerTimeoutRef.current);
          activeSpeakerTimeoutRef.current = setTimeout(() => {
            setActiveSpeaker(null);
          }, 3500);
        } catch (e) {
          console.warn("Voice chunk playback error:", e);
        }
      }
    });

    // Real-time Camera Video Status & Frames
    newSocket.on('camera-status', (data: { sender: string, isCameraOn: boolean }) => {
      if (data && data.sender !== userName) {
        if (!data.isCameraOn) {
          setPeerCameras(prev => {
            const next = { ...prev };
            delete next[data.sender];
            return next;
          });
        }
      }
    });

    newSocket.on('camera-frame', (data: { sender: string, frame: string }) => {
      if (data && data.sender !== userName && data.frame) {
        setPeerCameras(prev => ({
          ...prev,
          [data.sender]: {
            sender: data.sender,
            frame: data.frame,
            lastUpdated: Date.now()
          }
        }));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (cameraIntervalRef.current) {
        clearInterval(cameraIntervalRef.current);
      }
    };
  }, [roomId]);

  // Sync periodically just to be sure we're not drifting
  useEffect(() => {
    if (!socket || !isPlaying) return;
    
    const interval = setInterval(() => {
      if (!isHandlingRemote.current) {
        // We just periodically request sync if we feel like it, but for a simple watch party, 
        // relying on play/pause/seek events is usually enough. Let's keep it simple.
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [socket, isPlaying]);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const data = await res.json();
        if (data.url) {
          setVideoId(data.url);
          setIsPlaying(true);
          socket?.emit('video-change', { roomId, videoId: data.url });
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setShowDropdown(true);
    setSearchId('');
    setHasMoreSearch(false);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setSearchResults([]);
        return;
      }
      const ct = res.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) {
        setSearchResults([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
        setHasMoreSearch(false);
        setSearchId('');
      } else if (data && Array.isArray(data.videos)) {
        setSearchResults(data.videos);
        setSearchId(data.searchId || '');
        setHasMoreSearch(!!data.hasMore);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.warn("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!searchId || isLoadingMore || !hasMoreSearch) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/search/more?searchId=${encodeURIComponent(searchId)}`);
      if (!res.ok) {
        setHasMoreSearch(false);
        return;
      }
      const ct = res.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) {
        setHasMoreSearch(false);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.videos) && data.videos.length > 0) {
        setSearchResults(prev => {
          // avoid duplicates
          const existingIds = new Set(prev.map((v: any) => v.videoId));
          const newVideos = data.videos.filter((v: any) => !existingIds.has(v.videoId));
          return [...prev, ...newVideos];
        });
        setHasMoreSearch(!!data.hasMore);
        if (data.searchId) setSearchId(data.searchId);
      } else {
        setHasMoreSearch(false);
      }
    } catch (err) {
      console.warn("Error loading more results:", err);
      setHasMoreSearch(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePlayM3u8Directly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let url = m3u8InputUrl.trim();
    if (!url) {
      setM3u8Error('يرجى إدخال رابط M3U8 / TS أو رابط البث المباشر');
      return;
    }

    // Automatically prepend http:// if no protocol is specified
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('blob:')) {
      url = 'http://' + url;
    }

    setM3u8Error('');

    setVideoId(url);
    setIsPlaying(true);
    socket?.emit('video-change', { roomId, videoId: url });

    if (m3u8SaveToList) {
      const channelTitle = m3u8Title.trim() || `بث مباشر ${m3uPlaylist.length + 1}`;
      const newChannel = {
        title: channelTitle,
        url: url,
        logo: ''
      };
      const updatedList = [newChannel, ...m3uPlaylist.filter(c => c.url !== url)];
      updateAndSavePlaylist(updatedList);
    }

    setM3u8InputUrl('');
    setM3u8Title('');
    setShowM3u8Modal(false);
  };

  const handleOpenEditChannel = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const channel = m3uPlaylist[index];
    if (!channel) return;
    setEditingChannelIndex(index);
    setEditChannelTitle(channel.title || '');
    setEditChannelUrl(channel.url || '');
    setEditChannelError('');
    setShowEditM3uModal(true);
  };

  const handleSaveEditChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChannelIndex === null) return;
    let url = editChannelUrl.trim();
    const title = editChannelTitle.trim() || `قناة ${editingChannelIndex + 1}`;
    if (!url) {
      setEditChannelError('يرجى إدخال رابط القناة');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('blob:')) {
      url = 'http://' + url;
    }
    const updatedList = [...m3uPlaylist];
    updatedList[editingChannelIndex] = {
      ...updatedList[editingChannelIndex],
      title,
      url
    };
    updateAndSavePlaylist(updatedList);
    setShowEditM3uModal(false);
    setEditingChannelIndex(null);
  };

  const handleDeleteChannel = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = m3uPlaylist.filter((_, idx) => idx !== index);
    updateAndSavePlaylist(updatedList);
  };

  const handleClearAllChannels = () => {
    updateAndSavePlaylist([]);
    setShowClearConfirm(false);
  };

  const handleRoomM3uFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const lines = content.split('\n');
        const playlist: Array<{ title: string, logo?: string, url: string }> = [];
        let currentItem: { title?: string, logo?: string, url?: string } = {};
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
            const titleMatch = line.split(',');
            currentItem.title = titleMatch[1] || 'قناة غير معروفة';
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            if (logoMatch) currentItem.logo = logoMatch[1];
          } else if (line && !line.startsWith('#')) {
            currentItem.url = line;
            if (currentItem.title && currentItem.url) {
              playlist.push({
                title: currentItem.title,
                logo: currentItem.logo,
                url: currentItem.url
              });
            }
            currentItem = {};
          }
        }
        if (playlist.length > 0) {
          const combined = [...playlist, ...m3uPlaylist.filter(c => !playlist.some(p => p.url === c.url))];
          updateAndSavePlaylist(combined);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExtractWebVideo = async (targetUrl?: string, autoPlay: boolean = false) => {
    let urlToExtract = (targetUrl || webExtractUrl).trim();
    if (!urlToExtract) {
      setExtractError('يرجى إدخال رابط الموقع أو صفحة الفيديو');
      return;
    }
    if (!urlToExtract.startsWith('http://') && !urlToExtract.startsWith('https://')) {
      urlToExtract = 'https://' + urlToExtract;
      setWebExtractUrl(urlToExtract);
    }
    setBrowserIframeUrl(urlToExtract);
    setIsExtracting(true);
    setExtractError('');
    setExtractedResult(null);

    try {
      const res = await fetch('/api/extract-web-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToExtract })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل سحب الفيديوهات من الرابط المحدد');
      }
      setExtractedResult(data);
      if (!data.streams || data.streams.length === 0) {
        setExtractError('لم يتم العثور على روابط وسائط مباشرة تلقائياً. يمكنك تجربة فحص مشغل الفيديو أو فتح الصفحة عبر مستعرض الويب.');
      } else if (autoPlay && data.streams.length > 0) {
        // Auto play the first discovered stream
        const first = data.streams[0];
        handlePlayExtractedStream(first.url);
      }
    } catch (err: any) {
      console.error('Web extract error:', err);
      setExtractError(err?.message || 'حدث خطأ أثناء محاولة الاتصال بالموقع وسحب الفيديو');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePlayExtractedStream = (streamUrl: string) => {
    if (!streamUrl) return;
    setVideoId(streamUrl);
    setIsPlaying(true);
    socket?.emit('video-change', { roomId, videoId: streamUrl });
    setShowWebExtractorModal(false);
  };

  const handleSaveExtractedToRoomM3u = (streamUrl: string, streamLabel: string) => {
    const title = streamLabel || extractedResult?.title || 'فيديو موقع ويب';
    const newChannel = {
      title,
      url: streamUrl,
      logo: extractedResult?.thumbnail || ''
    };
    const updatedList = [newChannel, ...m3uPlaylist.filter(c => c.url !== streamUrl)];
    updateAndSavePlaylist(updatedList);
    setSavedStreamUrl(streamUrl);
    setTimeout(() => setSavedStreamUrl(null), 2500);
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = inputUrl.trim();
    if (!trimmed) return;

    // Automatically prepend http:// if it looks like a direct link but has no protocol
    if (
      !trimmed.startsWith('http://') && 
      !trimmed.startsWith('https://') && 
      !trimmed.startsWith('/') && 
      (trimmed.includes('.m3u8') || trimmed.includes('.ts') || trimmed.includes('.mp4') || trimmed.includes('.mkv') || trimmed.includes('.webm') || trimmed.includes('format='))
    ) {
      trimmed = 'http://' + trimmed;
    }

    const extractedId = extractVideoId(trimmed);
    
    if (extractedId) {
      setVideoId(extractedId);
      setIsPlaying(true);
      socket?.emit('video-change', { roomId, videoId: extractedId });
      setInputUrl('');
    } else if (
      trimmed.startsWith('/') || 
      trimmed.includes('.m3u8') ||
      trimmed.includes('.ts') ||
      trimmed.includes('.mp4') ||
      trimmed.includes('.mkv') ||
      trimmed.includes('.webm') ||
      trimmed.includes('format=ts') ||
      trimmed.includes('format=m3u8')
    ) {
      // Direct stream media file
      setVideoId(trimmed);
      setIsPlaying(true);
      socket?.emit('video-change', { roomId, videoId: trimmed });
      setInputUrl('');
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // Rave-style extraction: Extract video from website URL or open web sniffer
      setInputUrl('');
      setWebExtractUrl(trimmed);
      setBrowserIframeUrl(trimmed);
      setShowWebExtractorModal(true);
      setWebActiveTab('browser');
      handleExtractWebVideo(trimmed, true);
    } else {
      // If it's not a direct URL, perform search and open modal
      performSearch(trimmed);
    }
  };

  const handlePlay = () => {
    if (isHandlingRemote.current) return;
    setIsPlaying(true);
    socket?.emit('play', { 
      roomId, 
      currentTime: playerRef.current?.currentTime || 0 
    });
  };

  const handlePause = () => {
    if (isHandlingRemote.current) return;
    setIsPlaying(false);
    socket?.emit('pause', { 
      roomId, 
      currentTime: playerRef.current?.currentTime || 0 
    });
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isSeeking.current) {
      setPlayedSeconds(e.currentTarget.currentTime || 0);
    }
    const d = e.currentTarget.duration;
    if (d && !isNaN(d) && isFinite(d) && d !== duration) {
      setDuration(d);
    }
  };

  const performSeek = (targetTime: number) => {
    if (isNaN(targetTime) || targetTime < 0) return;
    isSeeking.current = true;
    setPlayedSeconds(targetTime);

    if (playerRef.current) {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(targetTime);
      } else {
        playerRef.current.currentTime = targetTime;
      }
    }

    isHandlingRemote.current = true;
    socket?.emit('seek', { roomId, currentTime: targetTime });

    if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
    remoteTimeout.current = setTimeout(() => {
      isHandlingRemote.current = false;
    }, 2000);

    if (seekReleaseTimeout.current) clearTimeout(seekReleaseTimeout.current);
    seekReleaseTimeout.current = setTimeout(() => {
      isSeeking.current = false;
    }, 1500);
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration || 99999, playedSeconds + seconds));
    performSeek(newTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time)) {
      setPlayedSeconds(time);
    }
  };
  
  const handleSeekMouseDown = () => {
    isSeeking.current = true;
  };
  
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);
    if (!isNaN(time)) {
      performSeek(time);
    }
  };
  
  const togglePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setIsMuted(false);
      const restored = prevVolume > 0 ? prevVolume : 1;
      setVolume(restored);
    } else {
      setPrevVolume(volume > 0 ? volume : 1);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleRoomModAction = (action: 'kick' | 'ban' | 'mute_audio' | 'unmute_audio' | 'mute_text' | 'unmute_text' | 'promote_mod' | 'demote_mod', targetMember: any) => {
    if (!socket) return;
    socket.emit('room-mod-action', {
      roomId,
      action,
      targetSocketId: targetMember.socketId,
      targetUserId: targetMember.userId || targetMember.id,
      targetUsername: targetMember.username,
      operatorUserId: currentUser?.id,
      operatorUsername: currentUser?.username || userName,
      operatorRole: currentUser?.role || (isOwner ? 'admin' : 'user')
    });
    setActiveModMemberMenu(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isMutedTextByMod) {
      alert("⚠️ تم كتم قدرتك على إرسال الوسائط والرسائل في هذه الغرفة من قبل الإدارة.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Image upload failed');
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const data = await res.json();
        if (data.url) {
          socket?.emit('chat-message', { roomId, text: '', sender: userName, imageUrl: data.url });
        }
      }
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (isMutedTextByMod) {
      alert("⚠️ تم كتم قدرتك على إرسال الرسائل في هذه الغرفة من قبل إدارة الغرفة.");
      return;
    }
    socket?.emit('chat-message', { roomId, text: chatInput.trim(), sender: userName });
    setChatInput('');
  };

  // Helper to connect to LiveKit WebRTC Audio Engine
  const connectLiveKitRoom = async (enableMicInitially: boolean = false): Promise<LiveKitRoom | null> => {
    if (liveKitRoomRef.current && liveKitRoomRef.current.state === 'connected') {
      return liveKitRoomRef.current;
    }

    try {
      setIsLiveKitConnecting(true);
      setLiveKitError(null);

      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomId,
          identity: userName,
          name: currentUser?.fullName || userName
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل الاتصال بخدمة LiveKit الصوتية');
      }

      const { token, url } = await res.json();

      const lkRoom = new LiveKitRoom({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16,
        },
        publishDefaults: {
          simulcast: false,
          dtx: false,
          audioPreset: {
            maxBitrate: 128000,
          },
        },
      });

      liveKitRoomRef.current = lkRoom;

      lkRoom.on(LiveKitRoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === LiveKitTrack.Kind.Audio) {
          const element = track.attach();
          element.id = `lk-audio-${participant.identity}`;
          element.volume = isVoiceMutedRef.current ? 0 : Math.min(1, voiceVolumeRef.current);
          if (audioOutputModeRef.current === 'earpiece' && 'setSinkId' in element) {
            navigator.mediaDevices?.enumerateDevices?.().then(devices => {
              const earpiece = devices.find(d => 
                d.kind === 'audiooutput' && 
                (d.label.toLowerCase().includes('earpiece') || 
                 d.label.toLowerCase().includes('headphone') || 
                 d.label.toLowerCase().includes('headset') || 
                 d.label.toLowerCase().includes('internal'))
              );
              if (earpiece && earpiece.deviceId) {
                (element as any).setSinkId(earpiece.deviceId).catch(() => {});
              }
            }).catch(() => {});
          }
          document.body.appendChild(element);
        } else if (track.kind === LiveKitTrack.Kind.Video) {
          setRemoteLiveKitTracks(prev => ({
            ...prev,
            [participant.identity]: {
              identity: participant.identity,
              name: participant.name || participant.identity,
              track,
            }
          }));
        }
      });

      lkRoom.on(LiveKitRoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
        if (track.kind === LiveKitTrack.Kind.Audio) {
          track.detach().forEach(el => el.remove());
        } else if (track.kind === LiveKitTrack.Kind.Video) {
          track.detach().forEach(el => el.remove());
          setRemoteLiveKitTracks(prev => {
            const copy = { ...prev };
            delete copy[participant.identity];
            return copy;
          });
        }
      });

      lkRoom.on(LiveKitRoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers && speakers.length > 0) {
          const speaker = speakers[0];
          const speakerName = speaker.name || speaker.identity;
          if (speaker.identity !== userName) {
            setActiveSpeaker({
              sender: speakerName,
              fullName: speakerName,
              timestamp: Date.now()
            });
          }
        }
      });

      lkRoom.on(LiveKitRoomEvent.ParticipantConnected, () => {
        setLiveKitParticipantsCount((lkRoom.remoteParticipants?.size || 0) + 1);
      });

      lkRoom.on(LiveKitRoomEvent.ParticipantDisconnected, () => {
        setLiveKitParticipantsCount((lkRoom.remoteParticipants?.size || 0) + 1);
      });

      lkRoom.on(LiveKitRoomEvent.Disconnected, () => {
        setIsLiveKitConnected(false);
        setIsContinuousCallActive(false);
        setIsLiveKitConnecting(false);
        setIsLiveKitMicMuted(false);
        setLiveKitParticipantsCount(0);
        setRemoteLiveKitTracks({});
        liveKitRoomRef.current = null;
      });

      await lkRoom.connect(url, token);

      if (enableMicInitially) {
        try {
          await lkRoom.localParticipant.setMicrophoneEnabled(true);
        } catch (micErr) {
          console.warn("Could not enable mic automatically:", micErr);
        }
      } else {
        try {
          await lkRoom.localParticipant.setMicrophoneEnabled(false);
        } catch (micErr) {}
      }

      setIsLiveKitConnected(true);
      setIsLiveKitConnecting(false);
      setLiveKitParticipantsCount((lkRoom.remoteParticipants?.size || 0) + 1);
      return lkRoom;
    } catch (err: any) {
      console.error("LiveKit connection error:", err);
      if (liveKitRoomRef.current) {
        try {
          await liveKitRoomRef.current.disconnect();
        } catch (e) {}
        liveKitRoomRef.current = null;
      }
      setLiveKitError(err.message || 'تعذر الاتصال بخدمة LiveKit');
      setIsLiveKitConnecting(false);
      setIsLiveKitConnected(false);
      setIsContinuousCallActive(false);
      return null;
    }
  };

  // Walkie-Talkie Voice Toggle (High-Definition LiveKit Audio + Push-To-Talk + Mutual Exclusion)
  const toggleWalkieTalkie = async () => {
    if (isMutedAudioByMod) {
      alert("⚠️ تم كتم صوتك في هذه الغرفة من قبل إدارة الغرفة.");
      return;
    }

    // Mutual Exclusion: If Continuous Call is active, block Walkie-Talkie
    if (isContinuousCallActive) {
      return;
    }

    if (isWalkieTalking) {
      // Turn OFF Walkie-Talkie
      if (liveKitRoomRef.current && isLiveKitConnected) {
        try {
          await liveKitRoomRef.current.localParticipant.setMicrophoneEnabled(false);
        } catch (e) {
          console.error("LiveKit mic disable error:", e);
        }
      }
      setIsWalkieTalking(false);
      isLocalSpeakingRef.current = false;
      setIsLocalVoiceSpeaking(false);
      socket?.emit('voice-status', { 
        roomId, 
        sender: userName, 
        fullName: currentUser?.fullName || userName,
        avatar: currentUser?.avatar,
        isTalking: false 
      });
    } else {
      // Turn ON Walkie-Talkie
      try {
        let room = liveKitRoomRef.current;
        if (!room || !isLiveKitConnected) {
          room = await connectLiveKitRoom(false);
        }

        if (room) {
          await room.localParticipant.setMicrophoneEnabled(true, {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2,
          });
          room.localParticipant.audioTrackPublications.forEach((pub) => {
            if (pub.track?.mediaStreamTrack) {
              try { pub.track.mediaStreamTrack.contentHint = 'speech'; } catch {}
            }
          });
        }

        setIsWalkieTalking(true);
        isLocalSpeakingRef.current = true;
        setIsLocalVoiceSpeaking(true);
        socket?.emit('voice-status', { 
          roomId, 
          sender: userName, 
          fullName: currentUser?.fullName || userName,
          avatar: currentUser?.avatar,
          isTalking: true 
        });
      } catch (err: any) {
        console.error("Walkie-Talkie microphone activation error:", err);
      }
    }
  };

  // Continuous LiveKit Call Handler (مكالمة مستمرة بجودة فائقة + حظر تشغيل اللاسلكي أثناء المكالمة)
  const toggleLiveKitCall = async () => {
    if (isMutedAudioByMod) {
      alert("⚠️ تم كتم صوتك في هذه الغرفة من قبل إدارة الغرفة.");
      return;
    }

    // Mutual Exclusion: If Walkie-Talkie is active, block Continuous Call
    if (isWalkieTalking) {
      return;
    }

    if (isContinuousCallActive) {
      // End Continuous Call
      if (liveKitRoomRef.current) {
        try {
          await liveKitRoomRef.current.localParticipant.setMicrophoneEnabled(false);
          await liveKitRoomRef.current.disconnect();
        } catch (e) {
          console.error("LiveKit disconnect error:", e);
        }
        liveKitRoomRef.current = null;
      }
      setIsContinuousCallActive(false);
      setIsLiveKitConnected(false);
      setIsLiveKitConnecting(false);
      setIsLiveKitMicMuted(false);
      setLiveKitParticipantsCount(0);
      setRemoteLiveKitTracks({});
      return;
    }

    // Start Continuous Call
    try {
      let room = liveKitRoomRef.current;
      if (!room || !isLiveKitConnected) {
        room = await connectLiveKitRoom(true);
      } else {
        await room.localParticipant.setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2,
        });
        room.localParticipant.audioTrackPublications.forEach((pub) => {
          if (pub.track?.mediaStreamTrack) {
            try { pub.track.mediaStreamTrack.contentHint = 'speech'; } catch {}
          }
        });
      }

      if (room) {
        setIsContinuousCallActive(true);
        setIsLiveKitConnected(true);
        setIsLiveKitMicMuted(false);
      }
    } catch (err: any) {
      console.error("Continuous Call connection error:", err);
    }
  };

  const toggleLiveKitMic = async () => {
    if (!liveKitRoomRef.current || !isLiveKitConnected) return;
    try {
      const nextMute = !isLiveKitMicMuted;
      await liveKitRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMute);
      setIsLiveKitMicMuted(nextMute);
    } catch (err) {
      console.error("Error toggling LiveKit mic:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (liveKitRoomRef.current) {
        liveKitRoomRef.current.disconnect();
        liveKitRoomRef.current = null;
      }
    };
  }, []);

  // Camera Toggle (Isolated)
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (cameraIntervalRef.current) {
        clearInterval(cameraIntervalRef.current);
        cameraIntervalRef.current = null;
      }
      setIsCameraActive(false);
      socket?.emit('camera-status', { roomId, sender: userName, isCameraOn: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: cameraFacingMode
          },
          audio: false
        });
        cameraStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
        socket?.emit('camera-status', { roomId, sender: userName, isCameraOn: true });

        // Periodically broadcast camera frame preview to room peers
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');

        const interval = setInterval(() => {
          if (localVideoRef.current && localVideoRef.current.readyState >= 2 && ctx) {
            ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL('image/jpeg', 0.4);
            socket?.emit('camera-frame', { roomId, sender: userName, frame });
          }
        }, 600);

        cameraIntervalRef.current = interval;
      } catch (err: any) {
        console.error("Camera error:", err);
        alert("تعذر الوصول إلى الكاميرا. يرجى السماح بصلاحية الكاميرا لتشغيل الفيديو المباشر.");
      }
    }
  };

  const switchCameraFacing = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    if (isCameraActive) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: nextMode },
          audio: false
        });
        cameraStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.warn("Switch camera error:", e);
      }
    }
  };

  const formatTime = (sec: number) => {
    if (sec === undefined || sec === null || isNaN(sec) || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveManageRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageName.trim()) {
      setManageError('اسم الغرفة مطلوب');
      return;
    }
    setIsSavingManage(true);
    setManageError('');

    try {
      const res = await fetch('/api/rooms/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          name: manageName.trim(),
          password: managePassword.trim() || undefined,
          isPublic: manageIsPublic,
          userId: currentUser?.id,
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setManageError(data.error || 'تعذر تعديل بيانات الغرفة');
        return;
      }

      setRoomName(manageName.trim());
      setIsRoomPublic(manageIsPublic);
      setShowManageModal(false);
      
      // Update local storage
      getItemSafe<any[]>('visitedRooms', []).then(hist => {
        if (Array.isArray(hist)) {
          const item = hist.find((r: any) => r.id === roomId);
          if (item) {
            item.name = manageName.trim();
            setItemSafe('visitedRooms', hist).catch(() => {});
          }
        }
      });
    } catch (e: any) {
      setManageError('حدث خطأ أثناء تعديل الغرفة');
    } finally {
      setIsSavingManage(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه الغرفة نهائياً من الخادم؟ سيتم إغلاق الغرفة أمام الجميع.')) {
      return;
    }

    setIsDeletingRoom(true);
    setManageError('');

    try {
      const res = await fetch('/api/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: currentUser?.id,
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setManageError(data.error || 'تعذر حذف الغرفة');
        setIsDeletingRoom(false);
        return;
      }

      setShowManageModal(false);
      onLeave();
    } catch (e: any) {
      setManageError('حدث خطأ أثناء حذف الغرفة');
      setIsDeletingRoom(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl px-3 sm:px-4 h-14 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 p-[1px] shadow-sm">
            <div className="w-full h-full bg-[#0b0f19] rounded-lg flex items-center justify-center">
              <span className="text-xs font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                AH
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 border-r border-white/10 pr-2.5">
            <div className="bg-white/10 border border-white/10 px-2 py-0.5 rounded-md text-white font-bold text-xs flex items-center gap-1.5 max-w-[110px] sm:max-w-[180px] truncate" title={roomName || 'غرفة المشاهدة'}>
              {roomName || 'غرفة المشاهدة'}
            </div>
            <div className="bg-black/40 border border-white/10 px-1.5 py-0.5 rounded-md text-gray-300 font-mono tracking-wider text-[11px] flex items-center gap-1">
              #{roomId}
            </div>
            <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
              isRoomPublic 
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' 
                : 'bg-purple-600/20 text-purple-300 border-purple-500/30'
            }`}>
              {isRoomPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{isRoomPublic ? 'عامة' : 'خاصة'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-2 py-1 rounded-lg">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-md object-cover border border-purple-500/40"
              />
              <span className="text-xs font-medium text-slate-200">{currentUser.fullName}</span>
            </div>
          )}

          {(isOwner || currentUser?.role === 'admin') && (
            <button
              onClick={() => {
                setManageName(roomName);
                setManageIsPublic(isRoomPublic);
                setManagePassword('');
                setManageError('');
                setShowManageModal(true);
              }}
              className="flex items-center gap-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="إدارة وتعديل الغرفة (أنت صاحب الغرفة)"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">إدارة الغرفة</span>
            </button>
          )}

          {currentUser?.role === 'admin' && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
              title="لوحة تحكم المنصة (خاص بالأدمن فقط)"
            >
              <Shield className="w-3 h-3 text-indigo-400" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          )}

          <button
            onClick={() => setActivePanel(prev => prev === 'members' ? 'none' : 'members')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer ${
              activePanel === 'members'
                ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50'
                : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/10'
            }`}
            title="المتواجدون في الغرفة"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold font-mono">{userCount}</span>
          </button>
          
          <button
            onClick={onLeave}
            className="flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-100 font-medium px-2 py-1 rounded-md transition-colors text-xs border border-red-500/30 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>مغادرة</span>
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 max-w-6xl mx-auto w-full gap-4 sm:gap-6 h-[calc(100vh-3.5rem)] lg:h-auto overflow-hidden lg:overflow-visible">

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:items-start min-h-0 overflow-hidden lg:overflow-visible">
        {/* Video Player Column: Sticky and Fixed on mobile and desktop */}
        <div className="flex-none lg:flex-1 w-full flex flex-col gap-2.5 sm:gap-4 sticky top-0 z-30 bg-[#0f172a] pt-1 pb-2 sm:pb-3 border-b border-white/10 lg:border-none shadow-2xl lg:shadow-none">
          <form onSubmit={handleUrlSubmit} className="flex gap-2 relative z-10">
            <button
              type="button"
              onClick={() => setShowM3u(true)}
              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 p-2 sm:p-3 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-blue-500/30 backdrop-blur-md cursor-pointer"
              title="قائمة M3U"
            >
              <ListVideo className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Small Web Video Extractor / Browser Button (Icon only) */}
            <button
              type="button"
              onClick={() => {
                setExtractError('');
                if (!browserIframeUrl) {
                  setBrowserIframeUrl('https://www.google.com');
                  setWebExtractUrl('https://www.google.com');
                }
                setShowWebExtractorModal(true);
              }}
              className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 p-2 sm:p-3 rounded-xl transition-all flex items-center justify-center shrink-0 backdrop-blur-md cursor-pointer active:scale-95 shadow-sm"
              title="سحب واستخراج فيديو من أي موقع ويب أو صفحة أفلام (MP4 / M3U8 / TS)"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </button>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*,audio/*,.ts,.m3u8,.mp4,.mkv" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white p-2 sm:p-3 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-white/10 backdrop-blur-md cursor-pointer"
              title="رفع مقطع من الجهاز"
            >
              {isUploading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Upload className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <div className="relative flex-1" ref={searchContainerRef}>
              <input
                type="text"
                value={inputUrl || ""}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="ابحث في يوتيوب أو ضع رابط مباشر (MP4 / M3U8 / TS)..."
                className="w-full bg-black/30 border border-white/15 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-red-500/50 backdrop-blur-sm transition-all text-right"
                dir="rtl"
              />
              {isSearching && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white p-2 sm:p-3 rounded-xl transition-colors flex items-center justify-center shrink-0 backdrop-blur-md shadow-lg shadow-red-600/20 cursor-pointer"
              title="بحث أو تشغيل"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </form>

          <div 
            ref={fullscreenContainerRef} 
            className={`relative w-full overflow-hidden bg-black/60 backdrop-blur-sm border border-white/10 shadow-2xl flex flex-col items-center justify-center group transition-all ${
              isFullscreen 
                ? 'fixed inset-0 z-[99999] bg-black rounded-none h-screen w-screen flex flex-col justify-between' 
                : 'aspect-video rounded-2xl'
            }`}
          >
            {videoId ? (
              <div className="relative w-full h-full flex-1">
                <VideoPlayer
                  ref={playerRef}
                  src={videoId}
                  playing={isPlaying}
                  volume={volume}
                  muted={isMuted}
                  onPlay={() => { if (!isHandlingRemote.current) handlePlay(); }}
                  onPause={() => { if (!isHandlingRemote.current) handlePause(); }}
                  onTimeUpdate={handleTimeUpdate}
                  onReady={() => {
                    setIsReady(true);
                    if (playerRef.current && !isNaN(playerRef.current.duration)) {
                      setDuration(playerRef.current.duration || 0);
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (d && !isNaN(d) && isFinite(d)) setDuration(d);
                  }}
                  onClick={togglePlayPause}
                  onSelectSample={(sampleUrl) => {
                    setVideoId(sampleUrl);
                    setIsPlaying(true);
                    socket?.emit('video-change', { roomId, videoId: sampleUrl });
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-400 gap-3 relative z-10 p-8 text-center">
                <Youtube className="w-14 h-14 text-red-500/70" />
                <p className="text-base font-medium text-gray-300">في انتظار اختيار أو تشغيل فيديو للمشاهدة...</p>
                <p className="text-xs text-gray-500 max-w-sm">ابحث في شريط البحث بالأعلى أو الصق رابط يوتيوب / M3U8 / TS أو ارفع مقطعاً مباشرة</p>
              </div>
            )}

            {/* Ultra-Small Micro Floating Speaker Indicator (Only visible when active voice/speaking is detected and overlay is enabled) */}
            {(() => {
              if (!showVoiceOverlay) return null;

              const activeVoiceUser = activeSpeaker 
                ? { 
                    sender: activeSpeaker.sender, 
                    avatar: activeSpeaker.avatar, 
                    fullName: activeSpeaker.fullName || activeSpeaker.sender 
                  }
                : (isWalkieTalking && isLocalVoiceSpeaking) 
                ? { 
                    sender: userName, 
                    avatar: currentUser?.avatar, 
                    fullName: currentUser?.fullName || userName 
                  }
                : null;

              if (!activeVoiceUser) return null;

              return (
                <div 
                  className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-40 flex items-center gap-1.5 bg-black/35 backdrop-blur-xs opacity-60 hover:opacity-100 px-2.5 py-1 rounded-full shadow-md text-right select-none animate-fadeIn transition-all"
                  dir="rtl"
                >
                  <div className="relative shrink-0 flex items-center">
                    <img
                      src={activeVoiceUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt="avatar"
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                    <span className="absolute -bottom-0.5 -left-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-300 truncate max-w-[90px] sm:max-w-[120px]">
                    @{activeVoiceUser.sender}
                  </span>

                  <div className="flex items-center gap-0.5 h-3 shrink-0 mr-0.5">
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-1.5" />
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-3" />
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-2" />
                  </div>
                </div>
              );
            })()}

            {/* In-Fullscreen Bottom Controls */}
            {isFullscreen && videoId && (
              <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex flex-col gap-3 z-40" dir="ltr">
                <div className="flex items-center gap-3 w-full">
                  <span className="text-xs font-mono text-gray-300 w-10 text-right">{formatTime(playedSeconds)}</span>
                  <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    step={0.1}
                    value={playedSeconds || 0}
                    onChange={handleSeekChange}
                    onMouseDown={handleSeekMouseDown}
                    onMouseUp={handleSeekMouseUp}
                    onTouchStart={handleSeekMouseDown}
                    onTouchEnd={handleSeekMouseUp}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                  />
                  <span className="text-xs font-mono text-gray-300 w-10">{formatTime(duration)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button 
                      type="button"
                      onClick={() => handleSkip(-10)} 
                      className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                      title="تأخير 10 ثوانٍ"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>10s</span>
                    </button>

                    <button onClick={togglePlayPause} className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors shadow-lg shadow-red-600/30 cursor-pointer">
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleSkip(10)} 
                      className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                      title="تقديم 10 ثوانٍ"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>10s</span>
                    </button>
                    
                    <div className="flex items-center gap-3 mr-2">
                      <button 
                        type="button"
                        onClick={toggleMute} 
                        className="text-gray-300 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
                        title={isMuted || volume === 0 ? "إلغاء كتم الصوت" : "كتم الصوت"}
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input 
                        type="range" 
                        min={0} 
                        max={1} 
                        step={0.01}
                        value={isMuted ? 0 : (volume ?? 1)}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-24 h-1.5 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={toggleFullscreen} 
                    className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/15 text-xs cursor-pointer"
                    title="تصغير الشاشة"
                  >
                    <Minimize className="w-4 h-4 text-red-400" />
                    <span>تصغير</span>
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Live Speech Text Overlay over Video Stage while Recording */}
            {isListeningSpeech && (
              <div 
                className="absolute bottom-10 right-4 sm:bottom-14 sm:right-6 z-50 pointer-events-none max-w-sm sm:max-w-md text-right animate-fadeIn transition-all"
                dir="rtl"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  <span className="text-amber-300 font-extrabold tracking-wide filter drop-shadow">
                    @{userName}:
                  </span>
                  <span className="text-white font-semibold filter drop-shadow">
                    {speechTranscript || "..."}
                  </span>
                </div>
              </div>
            )}

            {/* Floating Background-less 5-Second Chat Subtitle Overlay over Video Stage */}
            {!isListeningSpeech && currentToast && (
              <div 
                className="absolute bottom-10 right-4 sm:bottom-14 sm:right-6 z-50 pointer-events-none max-w-sm sm:max-w-md text-right animate-fadeIn transition-all"
                dir="rtl"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  <span className="text-amber-300 font-extrabold tracking-wide filter drop-shadow">
                    @{currentToast.sender}:
                  </span>
                  <span className="text-white font-semibold filter drop-shadow">
                    {currentToast.text}
                    {currentToast.imageUrl && !currentToast.text && ' 📷 صورة مرفقة'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Standard Mode External Controls Box */}
          {!isFullscreen && videoId && (
            <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 p-3.5 sm:p-4 flex flex-col gap-3.5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 w-full" dir="ltr">
                <span className="text-xs font-mono text-gray-400 w-10 text-right">{formatTime(playedSeconds)}</span>
                <input 
                  type="range" 
                  min={0} 
                  max={duration || 100} 
                  step={0.1}
                  value={playedSeconds || 0}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekMouseDown}
                  onMouseUp={handleSeekMouseUp}
                  onTouchStart={handleSeekMouseDown}
                  onTouchEnd={handleSeekMouseUp}
                  className="flex-1 h-2 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                />
                <span className="text-xs font-mono text-gray-400 w-10">{formatTime(duration)}</span>
              </div>
              
              <div className="flex items-center justify-between" dir="ltr">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    type="button"
                    onClick={() => handleSkip(-10)} 
                    className="p-1.5 sm:p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-0.5 sm:gap-1 text-xs cursor-pointer"
                    title="تأخير 10 ثوانٍ"
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs">10s</span>
                  </button>

                  <button onClick={togglePlayPause} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors shadow-lg shadow-red-600/20 cursor-pointer">
                    {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />}
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleSkip(10)} 
                    className="p-1.5 sm:p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-0.5 sm:gap-1 text-xs cursor-pointer"
                    title="تقديم 10 ثوانٍ"
                  >
                    <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs">10s</span>
                  </button>
                  
                  <div className="flex items-center gap-1.5 sm:gap-2 ml-1">
                    <button 
                      type="button"
                      onClick={toggleMute} 
                      className="text-gray-300 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
                      title={isMuted || volume === 0 ? "إلغاء كتم الصوت" : "كتم الصوت"}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range" 
                      min={0} 
                      max={1} 
                      step={0.01}
                      value={isMuted ? 0 : (volume ?? 1)}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-16 sm:w-24 h-1.5 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={toggleFullscreen} 
                  className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/10 cursor-pointer text-xs"
                  title="تكبير لملء الشاشة"
                >
                  <Maximize className="w-4 h-4" />
                  <span className="hidden sm:inline">ملء الشاشة</span>
                </button>
              </div>
            </div>
          )}

          {/* Special Compact Action Bar below Seek / Video Controls */}
          {!isFullscreen && (
            <div className="w-full bg-[#0f172a]/95 backdrop-blur-md border border-white/15 px-3 py-2 rounded-2xl shadow-xl flex items-center justify-between gap-2">
              {/* Four compact side-by-side icon buttons */}
              <div className="flex items-center gap-2">
                {/* 1. Chat Toggle Icon Button */}
                <button
                  type="button"
                  onClick={() => setActivePanel(prev => prev === 'chat' ? 'none' : 'chat')}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 shadow-sm relative ${
                    activePanel === 'chat'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-blue-600/30'
                      : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                  }`}
                  title={activePanel === 'chat' ? "إخفاء الدردشة الحية" : "عرض الدردشة الحية فقط"}
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
                  {messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-mono border border-black/50">
                      {messages.length > 99 ? '99+' : messages.length}
                    </span>
                  )}
                </button>

                {/* 1.2 Continuous Call Button (زر مكالمة مستمرة عبر LiveKit عالي الدقة مع الحظر المتبادل) */}
                <button
                  type="button"
                  onClick={toggleLiveKitCall}
                  disabled={isLiveKitConnecting || isWalkieTalking}
                  className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 transition-all border cursor-pointer active:scale-95 shadow-md relative font-bold text-xs ${
                    isWalkieTalking
                      ? 'opacity-40 cursor-not-allowed bg-slate-800 text-gray-500 border-gray-700'
                      : isContinuousCallActive
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-400 ring-2 ring-rose-400/50 animate-pulse'
                      : isLiveKitConnecting
                      ? 'bg-indigo-600/50 text-white border-indigo-400 animate-pulse'
                      : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white border-indigo-400 shadow-indigo-600/30'
                  }`}
                  title={
                    isWalkieTalking
                      ? "اللاسلكي قيد التشغيل حالياً - أوقف اللاسلكي لبدء مكالمة مستمرة"
                      : isContinuousCallActive
                      ? "إنهاء المكالمة المستمرة"
                      : "بدء مكالمة صوتية مستمرة عالية الجودة (LiveKit)"
                  }
                >
                  {isLiveKitConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : isContinuousCallActive ? (
                    <PhoneOff className="w-4 h-4 text-white animate-bounce" />
                  ) : (
                    <PhoneCall className="w-4 h-4 text-indigo-200" />
                  )}
                  <span className="hidden xs:inline sm:inline">
                    {isLiveKitConnecting ? "جاري الاتصال..." : isContinuousCallActive ? "إنهاء المكالمة" : "مكالمة مستمرة"}
                  </span>
                  {isContinuousCallActive && liveKitParticipantsCount > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono border border-black/50 font-bold">
                      {liveKitParticipantsCount}
                    </span>
                  )}
                </button>

                {/* 1.5. Speech-to-Text Button (تحويل الصوت إلى كتابة) */}
                <button
                  type="button"
                  onClick={toggleSpeechToText}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 shadow-sm relative ${
                    isListeningSpeech
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-600/50 ring-2 ring-rose-400/50 animate-pulse'
                      : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border-indigo-500/40'
                  }`}
                  title={isListeningSpeech ? "جاري الاستماع... اضغط للإيقاف" : "تحويل الصوت إلى كتابة (اللهجة العراقية)"}
                >
                  <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${isListeningSpeech ? 'animate-spin text-white' : 'text-indigo-300'}`} />
                  <span className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white text-[8px] px-1 rounded font-bold">
                    ع
                  </span>
                </button>

                {/* 2. Walkie-Talkie / Voice Chat Icon Button */}
                <button
                  type="button"
                  onClick={() => setActivePanel(prev => prev === 'voice' ? 'none' : 'voice')}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 shadow-md relative ${
                    activePanel === 'voice'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/40 ring-2 ring-emerald-400/50 animate-pulse'
                      : isWalkieTalking
                      ? 'bg-emerald-600/60 hover:bg-emerald-600/80 text-white border-emerald-400 animate-pulse'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                  }`}
                  title={activePanel === 'voice' ? "إخفاء الدردشة الصوتية" : "عرض الدردشة الصوتية فقط (الهوك توك)"}
                >
                  {isWalkieTalking ? (
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-bounce" />
                  ) : (
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  )}
                </button>

                {/* 3. Camera Icon Button */}
                <button
                  type="button"
                  onClick={() => setActivePanel(prev => prev === 'camera' ? 'none' : 'camera')}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 shadow-sm ${
                    activePanel === 'camera'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-amber-600/40'
                      : isCameraActive
                      ? 'bg-amber-600/60 hover:bg-amber-600/80 text-white border-amber-400'
                      : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/40'
                  }`}
                  title={activePanel === 'camera' ? "إخفاء الكاميرات" : "عرض الكاميرات المباشرة فقط"}
                >
                  {isCameraActive ? (
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  ) : (
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  )}
                </button>

                {/* 4. Active Members List Icon Button */}
                <button
                  type="button"
                  onClick={() => setActivePanel(prev => prev === 'members' ? 'none' : 'members')}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 shadow-sm relative ${
                    activePanel === 'members'
                      ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-purple-600/30'
                      : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                  }`}
                  title={activePanel === 'members' ? "إخفاء المتواجدين" : "عرض قائمة المتواجدين الآن"}
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-mono border border-black/50">
                    {userCount}
                  </span>
                </button>
              </div>

              {/* Status and Active Indicators */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {isWalkieTalking && (
                  <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                    <span className="hidden sm:inline">أنت تتحدث</span>
                  </span>
                )}
                {activeSpeaker && !isWalkieTalking && (
                  <span className="text-emerald-400 text-xs font-medium flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                    🎙️ {activeSpeaker.sender}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* EXCLUSIVE PANEL 1: Compact Professional Walkie-Talkie Voice Chat */}
          {!isFullscreen && activePanel === 'voice' && (
            <div className="w-full bg-[#0a1424]/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-2xl animate-fadeIn relative">
              {/* Compact Header & Status Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 px-1">
                {/* Title & Active Status */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-white tracking-wide truncate">
                    Walkie-Talkie
                  </span>
                </div>

                {/* Status Indicator (Compact Status Badge) */}
                <div className="flex items-center gap-2 min-w-0">
                  {isContinuousCallActive ? (
                    <div className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-full text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
                      <span className="text-[11px] font-bold">المكالمة المستمرة نشطة</span>
                    </div>
                  ) : isWalkieTalking ? (
                    <div className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-full text-xs font-medium animate-pulse">
                      <img 
                        src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                        alt="avatar" 
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover shrink-0 border border-rose-400"
                      />
                      <span className="truncate max-w-[110px] sm:max-w-[160px] text-[11px] font-bold">
                        أنت تتحدث الآن...
                      </span>
                      <div className="flex items-center gap-0.5 h-3 shrink-0">
                        <span className="w-0.5 bg-rose-400 h-2.5 animate-bounce" />
                        <span className="w-0.5 bg-rose-400 h-3.5 animate-pulse" />
                        <span className="w-0.5 bg-rose-400 h-2 animate-bounce" />
                      </div>
                    </div>
                  ) : activeSpeaker ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-xs font-medium">
                      <img 
                        src={activeSpeaker.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                        alt="avatar" 
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover shrink-0 border border-emerald-400"
                      />
                      <span className="truncate max-w-[110px] sm:max-w-[160px] text-[11px] font-semibold">
                        {activeSpeaker.fullName || activeSpeaker.sender}
                      </span>
                      <div className="flex items-center gap-0.5 h-3 shrink-0">
                        <span className="w-0.5 bg-emerald-400 h-2.5 animate-bounce" />
                        <span className="w-0.5 bg-emerald-400 h-3.5 animate-pulse" />
                        <span className="w-0.5 bg-emerald-400 h-2 animate-bounce" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 shrink-0" />
                      <span>الغرفة هادئة</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Compact Floating Popups (Volume, Boost, Speaker & Settings) */}
              {activeVoicePopup === 'volume' && (
                <div className="bg-slate-900/98 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 animate-fadeIn border-white/15 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>التحكم في الصوت والدقة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>HD 48kHz</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveVoicePopup(null)}
                        className="text-gray-400 hover:text-white p-1 rounded-md cursor-pointer shrink-0"
                        title="إغلاق التحكم في الصوت"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider & Mute Toggle */}
                  <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isVoiceMuted;
                        setIsVoiceMuted(next);
                        isVoiceMutedRef.current = next;
                        try { localStorage.setItem('room_voice_muted', String(next)); } catch {}
                      }}
                      className={`p-2 rounded-lg transition-all shrink-0 cursor-pointer ${
                        isVoiceMuted || voiceVolume === 0
                          ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                      title={isVoiceMuted ? "إلغاء الكتم" : "كتم الصوت"}
                    >
                      {isVoiceMuted || voiceVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : voiceVolume < 0.5 ? (
                        <Volume1 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-300">درجة الصوت الأساسية</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {Math.round((isVoiceMuted ? 0 : voiceVolume) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isVoiceMuted ? 0 : voiceVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setVoiceVolume(val);
                          voiceVolumeRef.current = val;
                          if (val > 0 && isVoiceMuted) {
                            setIsVoiceMuted(false);
                            isVoiceMutedRef.current = false;
                            try { localStorage.setItem('room_voice_muted', 'false'); } catch {}
                          }
                          try { localStorage.setItem('room_voice_vol', String(val)); } catch {}
                        }}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Audio Booster (تضخيم الصوت العالي) */}
                  <div className="flex flex-col gap-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>مضخم الصوت فائق القوة</span>
                      </span>
                      <span className="font-mono font-bold text-amber-300">
                        {Math.round(audioBoosterLevel * 100)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: '100% عادي', value: 1.0 },
                        { label: '150% قوي', value: 1.5 },
                        { label: '200% مضخم', value: 2.0 },
                      ].map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setAudioBoosterLevel(preset.value)}
                          className={`py-1 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer border ${
                            audioBoosterLevel === preset.value
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio Output Route (صوت خارجي سبيكر vs صوت داخلي سماعة) */}
                  <div className="flex items-center justify-between gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <span className="text-gray-300 text-[11px] font-medium">مخرج الصوت:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAudioOutputMode('speaker')}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          audioOutputMode === 'speaker'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
                        }`}
                        title="تشغيل عبر مكبر الصوت الخارجي (Speaker)"
                      >
                        <Speaker className="w-3.5 h-3.5" />
                        <span>خارجي (سبيكر)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAudioOutputMode('earpiece')}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          audioOutputMode === 'earpiece'
                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
                        }`}
                        title="تشغيل عبر سماعة الأذن / الرأس الداخلية (Earpiece/Headphones)"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>داخلي (سماعة)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeVoicePopup === 'settings' && (
                <div className="bg-slate-900/95 border border-white/15 rounded-xl p-3 shadow-xl flex flex-col gap-2 animate-fadeIn text-xs text-gray-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="font-bold text-white">إعدادات الصوت والمشاهدة</span>
                    <button
                      type="button"
                      onClick={() => setActiveVoicePopup(null)}
                      className="text-gray-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toggle On-screen Overlay */}
                  <label className="flex items-center justify-between gap-3 cursor-pointer select-none py-1">
                    <span className="text-gray-300">إظهار مؤشر المتحدث على الفيديو</span>
                    <input
                      type="checkbox"
                      checked={showVoiceOverlay}
                      onChange={(e) => setShowVoiceOverlay(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500 bg-slate-800 border-white/20 cursor-pointer"
                    />
                  </label>

                  {/* Toggle Camera facing if camera active */}
                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={switchCameraFacing}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-amber-300 cursor-pointer mt-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>تبديل الكاميرا (أمامية / خلفية)</span>
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Compact Toolbar (Horizontal) with all requested audio controls */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 bg-slate-950/85 p-2 sm:p-2.5 rounded-2xl border border-white/10 shadow-inner">
                {/* 1. Microphone Push-To-Talk Button (SINGLE & COMPACT with Mutual Exclusion) */}
                <button
                  type="button"
                  onClick={toggleWalkieTalkie}
                  disabled={isContinuousCallActive}
                  className={`relative p-3 sm:p-3.5 rounded-full flex items-center justify-center transition-all transform active:scale-90 cursor-pointer shadow-lg ${
                    isContinuousCallActive
                      ? 'opacity-40 cursor-not-allowed bg-slate-800 text-gray-500 ring-0 shadow-none'
                      : isWalkieTalking
                      ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white ring-4 ring-rose-500/40 animate-pulse'
                      : 'bg-emerald-600/90 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/30'
                  }`}
                  title={
                    isContinuousCallActive
                      ? "المكالمة المستمرة قيد التشغيل - أوقف المكالمة أولاً لاستخدام اللاسلكي"
                      : isWalkieTalking
                      ? "إنهاء التحدث باللاسلكي (الميكروفون مفتوح)"
                      : "اضغط للتحدث باللاسلكي عالي الدقة"
                  }
                >
                  <Mic className={`w-5 h-5 sm:w-6 sm:h-6 ${isWalkieTalking ? 'animate-bounce' : ''}`} />
                  {isWalkieTalking && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-400 rounded-full animate-ping" />
                  )}
                </button>

                {/* 2. Direct Mute/Unmute Mini-Button */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isVoiceMuted;
                    setIsVoiceMuted(next);
                    isVoiceMutedRef.current = next;
                    try { localStorage.setItem('room_voice_muted', String(next)); } catch {}
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 ${
                    isVoiceMuted || voiceVolume === 0
                      ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-md shadow-red-500/20'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                  }`}
                  title={isVoiceMuted ? "الصوت مكتوم - اضغط لإلغاء الكتم" : "كتم الصوت فوراً"}
                >
                  {isVoiceMuted || voiceVolume === 0 ? (
                    <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                  )}
                </button>

                {/* 3. Speaker / Earpiece Direct Toggle (خارجي / داخلي) */}
                <button
                  type="button"
                  onClick={() => setAudioOutputMode(prev => prev === 'speaker' ? 'earpiece' : 'speaker')}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                    audioOutputMode === 'speaker'
                      ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/40'
                      : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/40'
                  }`}
                  title={audioOutputMode === 'speaker' ? "الصوت خارجي (مكبر الصوت Speaker) - اضغط للتحويل لسماعة الأذن" : "الصوت داخلي (سماعة الأذن Headphones) - اضغط للتحويل لمكبر الصوت"}
                >
                  {audioOutputMode === 'speaker' ? (
                    <Speaker className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
                  ) : (
                    <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                  )}
                </button>

                {/* 4. Voice Volume & Booster Settings Popup Trigger */}
                <button
                  type="button"
                  onClick={() => setActiveVoicePopup(prev => prev === 'volume' ? null : 'volume')}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                    activeVoicePopup === 'volume'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-amber-600/30'
                      : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                  }`}
                  title={`ضبط مستوى الصوت والمضخم (${Math.round(voiceVolume * 100)}% - مضخم ${Math.round(audioBoosterLevel * 100)}%)`}
                >
                  <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                  <span className="hidden sm:inline text-[11px] font-mono font-bold text-amber-300">
                    {Math.round((isVoiceMuted ? 0 : voiceVolume) * 100)}%
                  </span>
                </button>

                {/* 5. Members List Toggle */}
                <button
                  type="button"
                  onClick={() => setActivePanel(prev => prev === 'members' ? 'none' : 'members')}
                  className="relative p-2.5 sm:p-3 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 bg-white/10 hover:bg-white/20 text-gray-200 border-white/15"
                  title="المتواجدون الآن"
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                  <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-mono border border-black/50 font-bold">
                    {userCount}
                  </span>
                </button>

                {/* 4. Live Camera Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCameraActive) {
                      toggleCamera();
                    } else {
                      setActivePanel('camera');
                    }
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 ${
                    isCameraActive
                      ? 'bg-amber-600 text-white border-amber-400 shadow-amber-600/30'
                      : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                  }`}
                  title={isCameraActive ? "إيقاف الكاميرا" : "عرض/تشغيل الكاميرات المباشرة"}
                >
                  {isCameraActive ? (
                    <Camera className="w-5 h-5 text-white" />
                  ) : (
                    <CameraOff className="w-5 h-5 text-amber-300" />
                  )}
                </button>

                {/* 5. Voice & Room Settings */}
                <button
                  type="button"
                  onClick={() => setActiveVoicePopup(prev => prev === 'settings' ? null : 'settings')}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 ${
                    activeVoicePopup === 'settings'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                  }`}
                  title="إعدادات الصوت والمشاهدة"
                >
                  <Settings className="w-5 h-5 text-gray-300" />
                </button>

                {/* 6. Close / Exit Voice Panel */}
                <button
                  type="button"
                  onClick={() => setActivePanel('none')}
                  className="p-2.5 sm:p-3 rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95 bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-gray-400 border-white/10 hover:border-red-500/30"
                  title="إغلاق القائمة"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* EXCLUSIVE PANEL 2: Live Cameras ONLY */}
          {!isFullscreen && activePanel === 'camera' && (
            <div className="w-full bg-[#0a0f1d]/95 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl backdrop-blur-md animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">الكاميرات المباشرة</h3>
                    <p className="text-[11px] text-amber-300/70">
                      { (isCameraActive ? 1 : 0) + Object.keys(peerCameras).length } كاميرا نشطة في الغرفة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      isCameraActive
                        ? 'bg-red-600/80 hover:bg-red-600 text-white border-red-500'
                        : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-md'
                    }`}
                  >
                    {isCameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>{isCameraActive ? "إيقاف كاميرتي" : "تشغيل كاميرتي"}</span>
                  </button>

                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={switchCameraFacing}
                      className="bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 p-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      title="تبديل الكاميرا (أمامية / خلفية)"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActivePanel('none')}
                    className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors border border-white/10 cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>

              {/* Camera Feeds Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-h-[160px]">
                {/* Local Camera Tile */}
                {isCameraActive ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-amber-500/50 shadow-md">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-[10px] text-amber-300 px-2 py-0.5 rounded-md font-medium border border-amber-500/30">
                      أنت ({userName})
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={toggleCamera}
                    className="relative aspect-video rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-amber-400/50 transition-colors flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center text-amber-400 transition-colors">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-gray-300 group-hover:text-white">اضغط لتشغيل كاميرتك</span>
                  </div>
                )}

                {/* Remote LiveKit WebRTC Camera Tiles */}
                {Object.values(remoteLiveKitTracks).map((item) => (
                  <LiveKitVideoTile
                    key={item.identity}
                    track={item.track}
                    identity={item.identity}
                    name={item.name}
                  />
                ))}

                {/* Fallback Socket.IO Peer Cameras Tiles */}
                {Object.values(peerCameras).filter(p => !remoteLiveKitTracks[p.sender]).map((peer) => (
                  <div key={peer.sender} className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/20 shadow-md">
                    {peer.frame ? (
                      <img src={peer.frame} alt={peer.sender} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                        كاميرا نشطة
                      </div>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded-md font-medium border border-white/10">
                      {peer.sender}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXCLUSIVE PANEL 3: Live Chat ONLY */}
          {!isFullscreen && activePanel === 'chat' && (
            <div className="w-full h-80 sm:h-96 flex flex-col bg-white/5 backdrop-blur-md border border-blue-500/30 rounded-2xl overflow-hidden shadow-2xl min-h-0 animate-fadeIn" dir="rtl">
              <div className="p-3 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">الدردشة الحية</span>
                  <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-mono">{userCount} متصل</span>
                </div>
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg transition-colors border border-red-500/20 flex items-center gap-1 cursor-pointer"
                      title="مسح جميع رسائل الدردشة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الدردشة</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActivePanel('none')}
                    className="text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-colors border border-white/10 cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-white/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                    <MessageSquare className="w-8 h-8 text-blue-400/40 mb-2" />
                    <p className="text-xs">لا توجد رسائل بعد</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">كن أول من يكتب في الدردشة المباشرة!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.sender === userName;
                    const userCanDelete = canDeleteMessage(msg.sender);
                    const isMenuOpen = activeMsgMenuId === msg.id;

                    return (
                      <div key={msg.id} className={`group relative flex flex-col max-w-[85%] ${isSelf ? 'self-start items-start' : 'self-end items-end'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5 px-1">
                          <span className={`text-[10px] font-bold ${isSelf ? 'text-red-400' : 'text-blue-300'}`}>
                            {msg.sender}
                          </span>
                          {msg.time && (
                            <span className="text-[9px] text-gray-400 font-mono">
                              {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div className="relative flex items-center gap-1 group/msg">
                          <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-sm ${isSelf ? 'bg-gradient-to-r from-red-600/90 to-red-500/90 text-white rounded-tr-xs' : 'bg-white/10 backdrop-blur-md text-gray-100 rounded-tl-xs border border-white/10'}`}>
                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                            {msg.imageUrl && (
                              <img src={msg.imageUrl} alt="مرفق" className="mt-1.5 rounded-xl max-w-full h-auto max-h-44 object-cover cursor-pointer hover:opacity-90 transition-opacity border border-white/20" onClick={() => window.open(msg.imageUrl, '_blank')} />
                            )}
                          </div>

                          {/* Delete Message Option */}
                          {userCanDelete && (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMsgMenuId(isMenuOpen ? null : msg.id);
                                }}
                                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 opacity-0 group-hover/msg:opacity-100 transition-opacity cursor-pointer"
                                title="خيارات الرسالة"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {isMenuOpen && (
                                <div 
                                  className="absolute bottom-full mb-1 right-0 z-50 bg-slate-900 border border-white/15 rounded-xl p-1 shadow-2xl min-w-[110px] animate-fadeIn"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>حذف الرسالة</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Emoji Picker */}
              {showEmojiPicker && (
                <div className="p-2 border-t border-white/10 bg-slate-900/95 backdrop-blur-md grid grid-cols-8 gap-1 shrink-0 animate-fadeIn">
                  {['😂', '❤️', '👍', '👏', '😍', '🔥', '🎉', '👋', '🥳', '😎', '💯', '✨', '🤩', '🙌', '🍿', '🎬'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setChatInput(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="hover:bg-white/15 p-1 rounded-lg text-base transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-[#0a101f]/95 backdrop-blur-md flex items-center gap-1.5 shrink-0">
                <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${showEmojiPicker ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                  title="إضافة إيموجي"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  title="إرفاق صورة"
                >
                  {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> : <Image className="w-5 h-5" />}
                </button>
                <input 
                  type="text"
                  value={chatInput || ""}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="اكتب رسالة في الدردشة المباشرة..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/60 transition-colors text-right min-w-0"
                  dir="rtl"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 p-2.5 rounded-xl text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-blue-600/30"
                  title="إرسال"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* EXCLUSIVE PANEL 4: Connected Members List ONLY */}
          {!isFullscreen && activePanel === 'members' && (
            <div className="w-full bg-[#0d1322]/95 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/40 text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">المتواجدون في الغرفة الآن</h3>
                    <p className="text-[11px] text-purple-300/70">
                      {roomMembers.length || userCount} أعضاء متصلين حالياً بالمزامنة المباشرة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePanel('none')}
                  className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors border border-white/10 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              {/* Moderation Toast Notification */}
              {moderationToast && (
                <div className="bg-indigo-950/90 border border-indigo-500/50 text-white text-xs px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg animate-fadeIn">
                  <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{moderationToast.message}</span>
                </div>
              )}

              {/* Members List Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto p-1">
                {roomMembers.length > 0 ? (
                  roomMembers.map((member) => {
                    const isSelf = member.username === userName || (currentUser && member.userId === currentUser.id);
                    const isMemberOwner = member.role === 'admin' || (member.username && member.username === creatorName);
                    const isMemberMod = roomModerators.some(m => m.toLowerCase() === (member.username || '').toLowerCase());
                    const isSpeaking = activeSpeaker?.sender === member.username || (isSelf && isWalkieTalking);
                    const hasCamera = peerCameras[member.username] || (isSelf && isCameraActive);
                    const memberKey = member.socketId || member.userId || member.username;
                    const canModThisUser = (currentUser?.role === 'admin' || isOwner || roomModerators.some(m => m.toLowerCase() === (currentUser?.username || '').toLowerCase())) && !isSelf && member.role !== 'admin';

                    return (
                      <div
                        key={memberKey}
                        className={`relative flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isSelf
                            ? 'bg-purple-950/40 border-purple-500/40 shadow-sm'
                            : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={member.fullName || member.username}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover border border-white/20"
                            />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0d1322] absolute -bottom-0.5 -right-0.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate max-w-[110px]">
                                {member.fullName || member.username}
                              </span>
                              {isSelf && (
                                <span className="bg-purple-600/40 text-purple-200 text-[10px] px-1.5 py-0.2 rounded font-medium border border-purple-500/30">
                                  أنت
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 truncate block">
                              @{member.username}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {member.isMutedAudio && (
                            <span className="p-1 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400" title="الصوت مكتوم من الإدارة">
                              <AudioMutedIcon className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {member.isMutedText && (
                            <span className="p-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400" title="الدردشة مكتومة من الإدارة">
                              <MessageSquareOff className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {isSpeaking && (
                            <span className="p-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 animate-pulse" title="يتحدث الآن">
                              <Mic className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {hasCamera && (
                            <span className="p-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400" title="الكاميرا مفعلة">
                              <Camera className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {member.role === 'admin' ? (
                            <span className="flex items-center gap-0.5 bg-indigo-600/30 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">
                              <Shield className="w-3 h-3" />
                              <span>أدمن</span>
                            </span>
                          ) : isMemberOwner ? (
                            <span className="flex items-center gap-0.5 bg-amber-600/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span>المنشئ</span>
                            </span>
                          ) : isMemberMod ? (
                            <span className="flex items-center gap-0.5 bg-emerald-600/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                              <Award className="w-3 h-3 text-emerald-400" />
                              <span>مشرف</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                              عضو
                            </span>
                          )}

                          {/* Moderation Dropdown Trigger */}
                          {canModThisUser && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveModMemberMenu(prev => prev === memberKey ? null : memberKey)}
                                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="خيارات الإشراف والإدارة"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeModMemberMenu === memberKey && (
                                <div className="absolute left-0 bottom-full mb-1 z-50 w-44 bg-slate-900 border border-white/20 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 text-xs text-right animate-fadeIn">
                                  <div className="text-[10px] font-bold text-gray-400 px-2 py-1 border-b border-white/10 truncate">
                                    إدارة: {member.fullName || member.username}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRoomModAction(member.isMutedAudio ? 'unmute_audio' : 'mute_audio', member)}
                                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <span>{member.isMutedAudio ? 'إلغاء كتم الصوت' : 'كتم الصوت'}</span>
                                    <AudioMutedIcon className="w-3.5 h-3.5 text-amber-400" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRoomModAction(member.isMutedText ? 'unmute_text' : 'mute_text', member)}
                                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <span>{member.isMutedText ? 'إلغاء كتم الشات' : 'كتم الدردشة'}</span>
                                    <MessageSquareOff className="w-3.5 h-3.5 text-blue-400" />
                                  </button>

                                  {(isOwner || currentUser?.role === 'admin') && (
                                    <button
                                      type="button"
                                      onClick={() => handleRoomModAction(isMemberMod ? 'demote_mod' : 'promote_mod', member)}
                                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
                                    >
                                      <span>{isMemberMod ? 'سحب الإشراف' : 'ترقية لمشرف'}</span>
                                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`هل أنت متأكد من طرد ${member.fullName || member.username} من الغرفة؟`)) {
                                        handleRoomModAction('kick', member);
                                      }
                                    }}
                                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer border-t border-white/10 mt-1"
                                  >
                                    <span>طرد من الغرفة</span>
                                    <UserX className="w-3.5 h-3.5 text-rose-400" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`هل أنت متأكد من حظر ${member.fullName || member.username} نهائياً من دخول هذه الغرفة؟`)) {
                                        handleRoomModAction('ban', member);
                                      }
                                    }}
                                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-bold"
                                  >
                                    <span>حظر دائم من الغرفة</span>
                                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-4 text-center text-xs text-gray-400">
                    جاري مزامنة قائمة المتواجدين...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Room Settings / Manage Modal (For Owner and Admin) */}
    {showManageModal && (
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={() => setShowManageModal(false)}
      >
        <div 
          className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-purple-950/40">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">إدارة وتعديل الغرفة</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowManageModal(false)}
              className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveManageRoom} className="p-5 flex flex-col gap-4">
            {manageError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <span>{manageError}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300">اسم الغرفة:</label>
              <input
                type="text"
                value={manageName}
                onChange={e => setManageName(e.target.value)}
                placeholder="أدخل اسم الغرفة..."
                required
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-right"
                dir="rtl"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-300">نوع وخصوصية الغرفة:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManageIsPublic(true)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    manageIsPublic
                      ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>غرفة عامة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManageIsPublic(false)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !manageIsPublic
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>غرفة خاصة</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300">
                تغيير كلمة المرور (اختياري - اترك فارغاً للإبقاء على السابقة):
              </label>
              <input
                type="password"
                value={managePassword}
                onChange={e => setManagePassword(e.target.value)}
                placeholder="كلمة مرور جديدة (اختياري)"
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-right"
                dir="rtl"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={handleDeleteRoom}
                disabled={isDeletingRoom}
                className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-200 border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>حذف الغرفة نهائياً</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingManage}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingManage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* YouTube Search Modal */}
    {showDropdown && (
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md" 
        onClick={() => setShowDropdown(false)}
      >
        <div 
          className="bg-[#0f172a] border border-white/20 rounded-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl z-[100000]" 
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 bg-black/30">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <button 
                onClick={() => setShowDropdown(false)} 
                className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-gray-300 hover:text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">نتائج البحث في يوتيوب</span>
                {searchResults.length > 0 && (
                  <span className="text-xs bg-red-600/30 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-mono">
                    {searchResults.length} نتيجة
                  </span>
                )}
              </div>
            </div>

            {/* In-Modal Search Box */}
            <form 
              onSubmit={(e) => { e.preventDefault(); performSearch(inputUrl); }} 
              className="flex items-center gap-2 w-full sm:w-80"
            >
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="ابحث عن مقطع آخر..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 text-right"
                dir="rtl"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white p-2 rounded-xl transition-colors shrink-0"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px]">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <p className="text-sm">جاري البحث في يوتيوب...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
                <Search className="w-10 h-10 text-gray-600" />
                <p className="text-base font-medium text-gray-300">لم يتم العثور على نتائج</p>
                <p className="text-xs text-gray-500">جرب كتابة كلمات بحث أخرى في المربع أعلاه</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {searchResults.map((video, idx) => (
                  <div 
                    key={`${video.videoId}-${idx}`}
                    onClick={() => {
                      setVideoId(video.videoId);
                      setIsPlaying(true);
                      socket?.emit('video-change', { roomId, videoId: video.videoId });
                      setInputUrl('');
                      setShowDropdown(false);
                    }} 
                    className="flex flex-col bg-white/5 hover:bg-white/10 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-red-500/40 transition-all group shadow-md"
                  >
                    <div className="relative aspect-video overflow-hidden bg-black/60">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/85 text-white text-xs px-2 py-0.5 rounded font-mono shadow">
                          {video.duration}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 text-right flex flex-col justify-between flex-1">
                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug mb-1 group-hover:text-red-400 transition-colors" title={video.title} dir="rtl">
                        {video.title}
                      </h4>
                      <div className="text-xs text-gray-400 line-clamp-1 mt-1">{video.author}</div>
                    </div>
                  </div>
                ))}

                {hasMoreSearch && (
                  <div className="col-span-full flex flex-col items-center justify-center pt-4 pb-6 gap-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium text-sm rounded-xl border border-red-500/40 shadow-lg hover:shadow-red-600/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري جلب 20 نتيجة أخرى...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>تكملة البحث وعرض المزيد (+20 نتيجة)</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs text-gray-400">
                      تم عرض {searchResults.length} مقطع حتى الآن
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* M3U Playlist Modal */}
    {showM3u && (
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md" 
        onClick={() => setShowM3u(false)}
      >
        <div 
          className="bg-[#0f172a] border border-white/20 rounded-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl z-[100000]" 
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between bg-black/30 gap-3">
            <button 
              onClick={() => setShowM3u(false)} 
              className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-gray-300 hover:text-white transition-colors shrink-0 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              placeholder="ابحث في قنوات M3U لهذه الغرفة..." 
              value={m3uSearch}
              onChange={e => setM3uSearch(e.target.value)}
              className="flex-1 min-w-[150px] bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-blue-500/50"
              dir="rtl"
            />
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input 
                type="file" 
                ref={roomM3uFileInputRef}
                onChange={handleRoomM3uFileUpload}
                accept=".m3u,.m3u8" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => roomM3uFileInputRef.current?.click()}
                className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-all cursor-pointer"
                title="استيراد ملف M3U لهذه الغرفة فقط"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد ملف</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowM3u(false);
                  setM3u8Error('');
                  setShowM3u8Modal(true);
                }}
                className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-all cursor-pointer"
                title="إضافة رابط M3U8 يدوياً"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>رابط جديد</span>
              </button>
              {m3uPlaylist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-all cursor-pointer"
                  title="حذف جميع قنوات هذه الغرفة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح الكل</span>
                </button>
              )}
              <h3 className="text-base font-bold text-white">قائمة M3U</h3>
              <span className="text-xs bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                {m3uPlaylist.length} قناة
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 custom-scrollbar">
            {m3uPlaylist.length === 0 ? (
              <div className="col-span-full py-16 text-center text-gray-400 flex flex-col items-center gap-3">
                <p>لم تقم بإضافة قنوات M3U لهذه الغرفة بعد.</p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowM3u(false);
                      setM3u8Error('');
                      setShowM3u8Modal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة رابط بث M3U8 مباشرة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => roomM3uFileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>استيراد ملف M3U</span>
                  </button>
                </div>
              </div>
            ) : (
              m3uPlaylist.filter(c => !m3uSearch || c.title.toLowerCase().includes(m3uSearch.toLowerCase())).map((channel, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setVideoId(channel.url);
                    setIsPlaying(true);
                    socket?.emit('video-change', { roomId, videoId: channel.url });
                    setShowM3u(false);
                  }} 
                  className="group relative flex flex-col items-center text-center p-3 bg-white/5 hover:bg-blue-600/20 rounded-xl cursor-pointer border border-white/5 hover:border-blue-500/40 transition-all gap-2"
                >
                  {/* Action Buttons: Edit and Delete */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditChannel(idx, e)}
                      className="p-1.5 bg-black/80 hover:bg-blue-600 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-colors shadow-sm cursor-pointer"
                      title="تعديل القناة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteChannel(idx, e)}
                      className="p-1.5 bg-black/80 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-colors shadow-sm cursor-pointer"
                      title="حذف القناة"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-white" />
                    </button>
                  </div>

                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.title} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-contain bg-white/10 rounded p-1" 
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center text-white/50">
                      <Video className="w-6 h-6" />
                    </div>
                  )}
                  <h4 className="text-xs font-bold text-white line-clamp-2" title={channel.title}>{channel.title}</h4>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    {/* Clear All Confirmation Modal */}
    {showClearConfirm && (
      <div 
        className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={() => setShowClearConfirm(false)}
      >
        <div 
          className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-right"
          onClick={e => e.stopPropagation()}
          dir="rtl"
        >
          <div className="flex items-center gap-3 mb-3 text-red-400">
            <Trash2 className="w-6 h-6" />
            <h3 className="text-base font-bold text-white">مسح جميع القنوات؟</h3>
          </div>
          <p className="text-xs text-gray-300 mb-5 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف جميع قنوات M3U المحفوظة لهذه الغرفة؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleClearAllChannels}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-red-600/30"
            >
              نعم، مسح الكل
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Edit M3U Channel Modal */}
    {showEditM3uModal && (
      <div 
        className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={() => setShowEditM3uModal(false)}
      >
        <div 
          className="bg-[#0f172a] border border-blue-500/30 rounded-2xl overflow-hidden w-full max-w-lg flex flex-col shadow-2xl text-right"
          onClick={e => e.stopPropagation()}
          dir="rtl"
        >
          {/* Modal Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تعديل القناة المحفوظة</h3>
                <p className="text-xs text-gray-400">تعديل اسم أو رابط البث المباشر للقناة</p>
              </div>
            </div>
            <button 
              onClick={() => setShowEditM3uModal(false)} 
              className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handleSaveEditChannel} className="p-5 flex flex-col gap-4">
            {editChannelError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <span>{editChannelError}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300">
                اسم القناة:
              </label>
              <input
                type="text"
                value={editChannelTitle}
                onChange={e => setEditChannelTitle(e.target.value)}
                placeholder="اسم القناة"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all text-right"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>رابط البث المباشر (M3U8 / TS / MP4):</span>
                <span className="text-[11px] text-blue-400 font-mono">.m3u8 / .mp4 / .ts</span>
              </label>
              <input
                type="text"
                value={editChannelUrl}
                onChange={e => {
                  setEditChannelUrl(e.target.value);
                  if (editChannelError) setEditChannelError('');
                }}
                placeholder="example.com/live/stream.m3u8 أو http://..."
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all font-mono text-left"
                dir="ltr"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditM3uModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* M3U8 / Live Stream Direct Link Modal */}
    {showM3u8Modal && (
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={() => setShowM3u8Modal(false)}
      >
        <div 
          className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl overflow-hidden w-full max-w-lg flex flex-col shadow-2xl z-[100000] text-right"
          onClick={e => e.stopPropagation()}
          dir="rtl"
        >
          {/* Modal Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إضافة رابط M3U8 / TS / بث مباشر</h3>
                <p className="text-xs text-gray-400">تشغيل روابط البث المباشر (HLS / M3U8 / TS / MP4)</p>
              </div>
            </div>
            <button 
              onClick={() => setShowM3u8Modal(false)} 
              className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-gray-300 hover:text-white transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handlePlayM3u8Directly} className="p-5 flex flex-col gap-4">
            {m3u8Error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <span>{m3u8Error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>رابط البث المباشر (M3U8 أو فيديو مباشر):</span>
                <span className="text-[11px] text-emerald-400 font-mono">.m3u8 / .mp4 / .ts</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={m3u8InputUrl}
                  onChange={e => {
                    setM3u8InputUrl(e.target.value);
                    if (m3u8Error) setM3u8Error('');
                  }}
                  placeholder="example.com/live/stream.m3u8 أو http://..."
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-all font-mono text-left"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300">
                اسم القناة أو البث (اختياري):
              </label>
              <input
                type="text"
                value={m3u8Title}
                onChange={e => setM3u8Title(e.target.value)}
                placeholder="مثال: قناة الأخبار / البث الرياضي"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-all text-right"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <input
                type="checkbox"
                checked={m3u8SaveToList}
                onChange={e => setM3u8SaveToList(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-black/40 cursor-pointer"
              />
              <span className="text-xs text-gray-300">
                حفظ الرابط في قائمة قنوات M3U للوصول إليه مستقبلاً في أي وقت
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowM3u8Modal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>تشغيل في الغرفة</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Full-Featured Real Web Browser with Sandboxing, Proxy & Rave Extraction */}
    <WebBrowser
      isOpen={showWebExtractorModal}
      initialUrl={browserIframeUrl || webExtractUrl || 'https://www.google.com'}
      onClose={() => setShowWebExtractorModal(false)}
      onPlayInRoom={(streamUrl, title) => {
        handlePlayExtractedStream(streamUrl);
        setShowWebExtractorModal(false);
      }}
      onSaveToPlaylist={(streamUrl, title) => {
        handleSaveExtractedToRoomM3u(streamUrl, title || 'فيديو موقع ويب');
      }}
    />
    </div>
  );
}
