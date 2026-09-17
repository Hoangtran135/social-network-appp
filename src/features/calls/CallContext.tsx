import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSocial } from '../../context/SocialContext';
import { getSocket, refreshSocketAuth } from '../../utils/socket';
import { api } from '../../utils/api';
import { User } from '../../types';

type CallType = 'audio' | 'video';
type CallStatus = 'idle' | 'ringing-outgoing' | 'ringing-incoming' | 'connected';

interface ActiveCall {
  status: CallStatus;
  callType: CallType;
  peerUser: User;
  conversationId?: string;
}

interface CallContextType {
  activeCall: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callError: string | null;
  clearCallError: () => void;
  startCall: (peer: User, callType: CallType, conversationId?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '2e2d8b2f37e372d05f59307b',
      credential: 'fzLddz+UNctp8USJ',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '2e2d8b2f37e372d05f59307b',
      credential: 'fzLddz+UNctp8USJ',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '2e2d8b2f37e372d05f59307b',
      credential: 'fzLddz+UNctp8USJ',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '2e2d8b2f37e372d05f59307b',
      credential: 'fzLddz+UNctp8USJ',
    },
  ],
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, allUsers } = useAuth();
  const { logCallMessage } = useSocial();

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const clearCallError = useCallback(() => setCallError(null), []);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<{ fromUserId: string; offer: RTCSessionDescriptionInit } | null>(null);
  const hasAcceptedRef = useRef(false);
  const activeCallRef = useRef<ActiveCall | null>(null);
  activeCallRef.current = activeCall;
  const connectedAtRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    hasAcceptedRef.current = false;
    connectedAtRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  // Only the side that actively triggers the end/reject logs the call — the other side
  // receives the resulting message live over the socket, so logging on both ends would
  // duplicate the "📞 Cuộc gọi..." entry in the chat.
  const logAndCleanup = useCallback(
    (status: 'completed' | 'missed' | 'rejected') => {
      const call = activeCallRef.current;
      if (call) {
        const durationSec = connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0;
        logCallMessage(call.peerUser.id, call.callType, status, durationSec);
      }
      cleanup();
    },
    [cleanup, logCallMessage]
  );

  const createPeerConnection = useCallback(
    (peerUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          getSocket().emit('call:ice-candidate', { toUserId: peerUserId, candidate: e.candidate });
        }
      };
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          cleanup();
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [cleanup]
  );

  const getLocalMedia = async (callType: CallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        window.isSecureContext
          ? 'Trình duyệt này không hỗ trợ gọi thoại/video.'
          : 'Không thể truy cập camera/micro vì kết nối không an toàn (HTTP). Vui lòng truy cập trang qua HTTPS.'
      );
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video:
        callType === 'video'
          ? { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 20 } }
          : false,
    });
    setLocalStream(stream);
    return stream;
  };

  const startCall = async (peer: User, callType: CallType, conversationId?: string) => {
    if (!currentUser || activeCallRef.current) return;
    setCallError(null);
    setActiveCall({ status: 'ringing-outgoing', callType, peerUser: peer, conversationId });
    try {
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(peer.id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      getSocket().emit('call:invite', { toUserId: peer.id, callType, conversationId });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket().emit('call:answer-offer', { toUserId: peer.id, offer });
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Không thể bắt đầu cuộc gọi.');
      cleanup();
    }
  };

  // Only send the WebRTC answer once BOTH the user has clicked "accept" AND the
  // offer has arrived over the socket — either can happen first, so both paths call this.
  const tryCompleteAnswer = useCallback(async () => {
    const pc = pcRef.current;
    const offerData = pendingOfferRef.current;
    if (!pc || !offerData || !hasAcceptedRef.current || pc.currentRemoteDescription) return;
    await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));
    for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c));
    pendingCandidatesRef.current = [];
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    getSocket().emit('call:answer', { toUserId: offerData.fromUserId, answer });
    connectedAtRef.current = Date.now();
    setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : prev));
  }, []);

  const acceptCall = async () => {
    const call = activeCallRef.current;
    if (!call || !currentUser) return;
    try {
      const stream = await getLocalMedia(call.callType);
      const pc = pcRef.current || createPeerConnection(call.peerUser.id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      hasAcceptedRef.current = true;
      await tryCompleteAnswer();
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Không thể tham gia cuộc gọi.');
      rejectCall();
    }
  };

  const rejectCall = () => {
    const call = activeCallRef.current;
    if (call) getSocket().emit('call:reject', { toUserId: call.peerUser.id });
    logAndCleanup(call?.status === 'ringing-incoming' ? 'missed' : 'rejected');
  };

  const endCall = () => {
    const call = activeCallRef.current;
    if (call) getSocket().emit('call:end', { toUserId: call.peerUser.id });
    logAndCleanup(connectedAtRef.current ? 'completed' : 'rejected');
  };

  const toggleMute = () => {
    if (!localStream) return;
    const next = !isMuted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setIsMuted(next);
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const next = !isCameraOff;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setIsCameraOff(next);
  };

  useEffect(() => {
    if (!currentUser) return;
    refreshSocketAuth();
    const socket = getSocket();

    const onIncoming = async (data: { fromUserId: string; callType: CallType; conversationId?: string }) => {
      if (activeCallRef.current) {
        // Already on a call — auto-reject.
        socket.emit('call:reject', { toUserId: data.fromUserId });
        return;
      }
      let peer = allUsers.find((u) => u.id === data.fromUserId);
      if (!peer) {
        // Not in our already-loaded user list (new account, stale cache) — fetch them
        // directly instead of just dropping the call, which used to leave the caller
        // stuck ringing forever with no rejection ever sent back.
        try {
          const res = await api.get<{ user: User }>(`/users/${data.fromUserId}`);
          peer = res.user;
        } catch {
          // fall through — still no peer, reject below
        }
      }
      if (!peer) {
        socket.emit('call:reject', { toUserId: data.fromUserId });
        return;
      }
      createPeerConnection(data.fromUserId);
      setActiveCall({
        status: 'ringing-incoming',
        callType: data.callType,
        peerUser: peer,
        conversationId: data.conversationId,
      });
    };

    const onOffer = async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      if (activeCallRef.current?.peerUser.id !== data.fromUserId) return;
      pendingOfferRef.current = data;
      await tryCompleteAnswer();
    };

    const onAnswer = async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc || activeCallRef.current?.peerUser.id !== data.fromUserId) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c));
      pendingCandidatesRef.current = [];
      connectedAtRef.current = Date.now();
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : prev));
    };

    const onIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc || activeCallRef.current?.peerUser.id !== data.fromUserId) return;
      if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      else pendingCandidatesRef.current.push(data.candidate);
    };

    const onRejected = (data: { fromUserId: string }) => {
      if (activeCallRef.current?.peerUser.id === data.fromUserId) cleanup();
    };

    const onEnded = (data: { fromUserId: string }) => {
      if (activeCallRef.current?.peerUser.id === data.fromUserId) cleanup();
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, allUsers]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        callError,
        clearCallError,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
};
