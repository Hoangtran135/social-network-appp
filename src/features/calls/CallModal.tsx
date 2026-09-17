import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { useCall } from './CallContext';

export const CallModal: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callError,
    clearCallError,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (!activeCall) {
    if (!callError) return null;
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-rose-600 text-white text-sm px-4 py-3 rounded-xl shadow-xl max-w-sm flex items-start gap-3">
        <span className="flex-1">{callError}</span>
        <button onClick={clearCallError} className="font-bold leading-none">
          ×
        </button>
      </div>
    );
  }

  const { status, callType, peerUser } = activeCall;
  const isVideo = callType === 'video';

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-6"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
    >
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${status === 'connected' ? '' : 'opacity-0'}`}
        />
      )}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Overlay content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
        <img
          src={peerUser.avatar}
          alt={peerUser.name}
          className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-2xl mb-4"
        />
        <h2 className="text-white text-xl font-bold">{peerUser.name}</h2>
        <p className="text-slate-300 text-sm mt-1">
          {status === 'ringing-outgoing' && 'Đang gọi...'}
          {status === 'ringing-incoming' && (isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến')}
          {status === 'connected' && 'Đang trong cuộc gọi'}
        </p>
      </div>

      {/* Local video preview (video calls only) */}
      {isVideo && localStream && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-6 right-6 sm:top-auto sm:bottom-28 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl object-cover border-2 border-white/30 shadow-xl z-10"
        />
      )}

      {/* Controls */}
      <div className="relative z-10 flex items-center gap-4">
        {status === 'ringing-incoming' ? (
          <>
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-colors"
              title="Từ chối"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition-colors animate-pulse"
              title="Trả lời"
            >
              <Phone className="w-6 h-6" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {isVideo && (
              <button
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isCameraOff ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={isCameraOff ? 'Bật camera' : 'Tắt camera'}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-colors"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
