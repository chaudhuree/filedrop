import { socketService, type SignalPayload } from './socket';

export type DataChannelMessageHandler = (peerId: string, data: unknown) => void;

interface PeerConnection {
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  pendingCandidates: RTCIceCandidate[];
  connected: boolean;
}

class WebRTCService {
  private peers: Map<string, PeerConnection> = new Map();
  private config: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };
  private myId: string = '';
  private onMessageCallback: DataChannelMessageHandler | null = null;
  private onPeerConnectedCallback: ((peerId: string) => void) | null = null;
  private onPeerDisconnectedCallback: ((peerId: string) => void) | null = null;

  async initialize(myId: string): Promise<void> {
    this.myId = myId;

    // Fetch ICE server config
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      const iceServers: RTCIceServer[] = [];

      if (config.stunServers?.length) {
        iceServers.push({ urls: config.stunServers });
      }

      if (config.turnServer) {
        iceServers.push({
          urls: config.turnServer,
          username: config.turnUsername || '',
          credential: config.turnPassword || '',
        });
      }

      if (iceServers.length > 0) {
        this.config.iceServers = iceServers;
      }
    } catch (err) {
      console.warn('[WebRTC] Failed to fetch ICE config, using defaults');
    }

    // Listen for signaling messages
    socketService.on('signal', (payload: unknown) => {
      const signal = payload as SignalPayload;
      this.handleSignal(signal);
    });
  }

  onMessage(handler: DataChannelMessageHandler): void {
    this.onMessageCallback = handler;
  }

  onPeerConnected(handler: (peerId: string) => void): void {
    this.onPeerConnectedCallback = handler;
  }

  onPeerDisconnected(handler: (peerId: string) => void): void {
    this.onPeerDisconnectedCallback = handler;
  }

  async connectToPeer(peerId: string): Promise<RTCDataChannel | null> {
    // If already connected, return existing channel
    const existing = this.peers.get(peerId);
    if (existing?.dataChannel?.readyState === 'open') {
      return existing.dataChannel;
    }

    const pc = this.createPeerConnection(peerId);
    const dc = pc.createDataChannel('localdrop', {
      ordered: true,
    });

    this.setupDataChannel(dc, peerId);
    const peer = this.peers.get(peerId)!;
    peer.dataChannel = dc;

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketService.sendSignal({
      from: this.myId,
      to: peerId,
      data: { type: 'offer', sdp: offer.sdp },
    });

    // Wait for connection
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (dc.readyState === 'open') {
          clearInterval(checkInterval);
          resolve(dc);
        }
      }, 100);

      // Timeout after 15 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (dc.readyState !== 'open') {
          console.error('[WebRTC] Connection timeout for peer:', peerId);
          resolve(null);
        }
      }, 15000);
    });
  }

  sendToPeer(peerId: string, data: unknown): boolean {
    const peer = this.peers.get(peerId);
    if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
      return false;
    }

    try {
      const message = JSON.stringify(data);
      peer.dataChannel.send(message);
      return true;
    } catch (err) {
      console.error('[WebRTC] Send error:', err);
      return false;
    }
  }

  sendBinaryToPeer(peerId: string, data: ArrayBuffer): boolean {
    const peer = this.peers.get(peerId);
    if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
      return false;
    }

    try {
      peer.dataChannel.send(data);
      return true;
    } catch (err) {
      console.error('[WebRTC] Binary send error:', err);
      return false;
    }
  }

  getBufferedAmount(peerId: string): number {
    const peer = this.peers.get(peerId);
    return peer?.dataChannel?.bufferedAmount ?? 0;
  }

  isPeerConnected(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    return peer?.dataChannel?.readyState === 'open';
  }

  disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.dataChannel?.close();
      peer.connection.close();
      this.peers.delete(peerId);
    }
  }

  destroy(): void {
    this.peers.forEach((peer, id) => {
      peer.dataChannel?.close();
      peer.connection.close();
    });
    this.peers.clear();
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config);

    const peerState: PeerConnection = {
      connection: pc,
      dataChannel: null,
      pendingCandidates: [],
      connected: false,
    };
    this.peers.set(peerId, peerState);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendSignal({
          from: this.myId,
          to: peerId,
          data: {
            type: 'ice-candidate',
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment,
            },
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state (${peerId}):`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        peerState.connected = true;
        this.onPeerConnectedCallback?.(peerId);
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        peerState.connected = false;
        this.onPeerDisconnectedCallback?.(peerId);
        if (pc.connectionState === 'failed') {
          this.peers.delete(peerId);
        }
      }
    };

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      this.setupDataChannel(dc, peerId);
      peerState.dataChannel = dc;
    };

    return pc;
  }

  private setupDataChannel(dc: RTCDataChannel, peerId: string): void {
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      console.log(`[WebRTC] DataChannel open with ${peerId}`);
    };

    dc.onclose = () => {
      console.log(`[WebRTC] DataChannel closed with ${peerId}`);
    };

    dc.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          this.onMessageCallback?.(peerId, parsed);
        } else {
          // Binary data (file chunks)
          this.onMessageCallback?.(peerId, event.data);
        }
      } catch (err) {
        console.error('[WebRTC] Message parse error:', err);
      }
    };

    dc.onerror = (err) => {
      console.error(`[WebRTC] DataChannel error with ${peerId}:`, err);
    };
  }

  private async handleSignal(signal: SignalPayload): Promise<void> {
    const { from, data } = signal;
    const signalData = data as { type: string; sdp?: string; candidate?: RTCIceCandidateInit };

    if (signalData.type === 'offer') {
      // Received offer — create peer connection and answer
      const pc = this.createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: signalData.sdp!,
      }));

      // Apply any pending candidates
      const peer = this.peers.get(from)!;
      for (const candidate of peer.pendingCandidates) {
        await pc.addIceCandidate(candidate);
      }
      peer.pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.sendSignal({
        from: this.myId,
        to: from,
        data: { type: 'answer', sdp: answer.sdp },
      });
    } else if (signalData.type === 'answer') {
      const peer = this.peers.get(from);
      if (peer) {
        await peer.connection.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: signalData.sdp!,
        }));

        // Apply any pending candidates
        for (const candidate of peer.pendingCandidates) {
          await peer.connection.addIceCandidate(candidate);
        }
        peer.pendingCandidates = [];
      }
    } else if (signalData.type === 'ice-candidate') {
      const peer = this.peers.get(from);
      const candidate = new RTCIceCandidate(signalData.candidate!);
      if (peer?.connection.remoteDescription) {
        await peer.connection.addIceCandidate(candidate);
      } else if (peer) {
        peer.pendingCandidates.push(candidate);
      }
    }
  }
}

export const webrtcService = new WebRTCService();
