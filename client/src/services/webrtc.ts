import { socketService, type SignalPayload } from './socket';

export type DataChannelMessageHandler = (peerId: string, data: unknown) => void;

interface PeerConnection {
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  pendingCandidates: RTCIceCandidate[];
  connected: boolean;
  /** True if we are currently making an offer (used for glare resolution) */
  makingOffer: boolean;
}

class WebRTCService {
  private peers: Map<string, PeerConnection> = new Map();
  private config: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };
  private _myId: string = '';
  private onMessageCallback: DataChannelMessageHandler | null = null;
  private onPeerConnectedCallback: ((peerId: string) => void) | null = null;
  private onPeerDisconnectedCallback: ((peerId: string) => void) | null = null;

  /** Expose myId so other services can use it for comparisons */
  get myId(): string {
    return this._myId;
  }

  async initialize(myId: string): Promise<void> {
    this._myId = myId;

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

  /**
   * Connect to a peer and return the DataChannel.
   * Includes stale connection cleanup and one automatic retry.
   */
  async connectToPeer(peerId: string): Promise<RTCDataChannel | null> {
    // If already connected with an open channel, reuse it
    const existing = this.peers.get(peerId);
    if (existing?.dataChannel?.readyState === 'open') {
      return existing.dataChannel;
    }

    // Clean up any stale/broken connection before creating a new one
    if (existing) {
      console.log(`[WebRTC] Cleaning up stale connection to ${peerId} (channel state: ${existing.dataChannel?.readyState ?? 'none'})`);
      try { existing.dataChannel?.close(); } catch (_) { /* ignore */ }
      try { existing.connection.close(); } catch (_) { /* ignore */ }
      this.peers.delete(peerId);
    }

    // First attempt
    const result = await this.attemptConnection(peerId);
    if (result) return result;

    // Retry once after a short delay
    console.log(`[WebRTC] First connection attempt to ${peerId} failed, retrying in 2s...`);
    await new Promise((r) => setTimeout(r, 2000));

    // Clean up failed attempt
    const failed = this.peers.get(peerId);
    if (failed) {
      try { failed.dataChannel?.close(); } catch (_) { /* ignore */ }
      try { failed.connection.close(); } catch (_) { /* ignore */ }
      this.peers.delete(peerId);
    }

    return this.attemptConnection(peerId);
  }

  /**
   * Single connection attempt to a peer.
   */
  private async attemptConnection(peerId: string): Promise<RTCDataChannel | null> {
    const pc = this.createPeerConnection(peerId);
    const dc = pc.createDataChannel('localdrop', {
      ordered: true,
    });

    this.setupDataChannel(dc, peerId);
    const peer = this.peers.get(peerId)!;
    peer.dataChannel = dc;
    peer.makingOffer = true;

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketService.sendSignal({
        from: this._myId,
        to: peerId,
        data: { type: 'offer', sdp: offer.sdp },
      });
    } catch (err) {
      console.error('[WebRTC] Failed to create/send offer:', err);
      peer.makingOffer = false;
      return null;
    }
    peer.makingOffer = false;

    // Wait for connection with a 10s timeout
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check both our created DC and any DC set by ondatachannel
        const currentPeer = this.peers.get(peerId);
        const currentDc = currentPeer?.dataChannel;
        if (currentDc?.readyState === 'open') {
          clearInterval(checkInterval);
          resolve(currentDc);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        const currentPeer = this.peers.get(peerId);
        const currentDc = currentPeer?.dataChannel;
        if (currentDc?.readyState !== 'open') {
          console.error('[WebRTC] Connection timeout for peer:', peerId);
          resolve(null);
        } else {
          resolve(currentDc);
        }
      }, 10000);
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
    this.peers.forEach((peer) => {
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
      makingOffer: false,
    };
    this.peers.set(peerId, peerState);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendSignal({
          from: this._myId,
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

  /**
   * Handle incoming signaling messages with glare/collision resolution.
   * Uses the "polite peer" pattern: the peer with the lower ID is "polite"
   * and will yield its own offer when a collision occurs.
   */
  private async handleSignal(signal: SignalPayload): Promise<void> {
    const { from, data } = signal;
    const signalData = data as { type: string; sdp?: string; candidate?: RTCIceCandidateInit };

    if (signalData.type === 'offer') {
      const existingPeer = this.peers.get(from);

      // Glare detection: we have an existing connection that's in the middle of negotiation
      const isCollision = existingPeer?.makingOffer ||
        (existingPeer?.connection.signalingState !== 'stable' && existingPeer?.connection.signalingState !== undefined);

      // The "polite" peer (lower ID) yields its own offer to accept the incoming one
      const isPolite = this._myId < from;

      if (isCollision && !isPolite) {
        // We are the impolite peer — ignore the incoming offer (our offer takes precedence)
        console.log(`[WebRTC] Glare detected with ${from}, ignoring incoming offer (we are impolite)`);
        return;
      }

      if (isCollision && isPolite) {
        // We are the polite peer — tear down our offer and accept theirs
        console.log(`[WebRTC] Glare detected with ${from}, yielding our offer (we are polite)`);
        if (existingPeer) {
          try { existingPeer.dataChannel?.close(); } catch (_) { /* ignore */ }
          try { existingPeer.connection.close(); } catch (_) { /* ignore */ }
          this.peers.delete(from);
        }
      }

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
        from: this._myId,
        to: from,
        data: { type: 'answer', sdp: answer.sdp },
      });
    } else if (signalData.type === 'answer') {
      const peer = this.peers.get(from);
      if (peer) {
        try {
          await peer.connection.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: signalData.sdp!,
          }));

          // Apply any pending candidates
          for (const candidate of peer.pendingCandidates) {
            await peer.connection.addIceCandidate(candidate);
          }
          peer.pendingCandidates = [];
        } catch (err) {
          console.error(`[WebRTC] Failed to set remote answer from ${from}:`, err);
        }
      }
    } else if (signalData.type === 'ice-candidate') {
      const peer = this.peers.get(from);
      if (!peer) {
        // No connection yet — buffer the candidate for when a connection is established
        return;
      }
      const candidate = new RTCIceCandidate(signalData.candidate!);
      try {
        if (peer.connection.remoteDescription) {
          await peer.connection.addIceCandidate(candidate);
        } else {
          peer.pendingCandidates.push(candidate);
        }
      } catch (err) {
        console.error(`[WebRTC] Failed to add ICE candidate from ${from}:`, err);
      }
    }
  }
}

export const webrtcService = new WebRTCService();
