class PeerService {
    constructor() {
        this.createNewConnection(); // Initialize on first use
    }

    createNewConnection() {
        if (this.peerConnection) {
            this.peerConnection.close(); // Close existing connection
        }
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
            ],
        });

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("New ICE candidate:", event.candidate);
            }
        };

        this.peerConnection.ontrack = (event) => {
            console.log("Remote track added:", event.streams[0]);
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log("Connection state:", this.peerConnection.connectionState);
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            console.log("ICE connection state:", this.peerConnection.iceConnectionState);
        };

        this.peerConnection.onerror = (error) => {
            console.error("Peer connection error:", error);
        };
    }

    addStream(stream) {
        if (stream) {
            stream.getTracks().forEach((track) => {
                try {
                    this.peerConnection.addTrack(track, stream);
                    console.log("Track added to peer connection:", track.kind);
                } catch (error) {
                    console.error("Error adding track to peer connection:", error);
                }
            });
            console.log("Stream added to peer connection");
        } else {
            console.error("No stream provided to addStream");
        }
    }

    async getOffer() {
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(new RTCSessionDescription(offer));
            console.log("Offer created:", offer);
            return offer;
        } catch (error) {
            console.error("Error creating offer:", error);
            throw error;
        }
    }

    async getAnswer(offer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const ans = await this.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(new RTCSessionDescription(ans));
            console.log("Answer created:", ans);
            return ans;
        } catch (error) {
            console.error("Error creating answer:", error);
            throw error;
        }
    }

    async setRemoteDescription(ans) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(ans));
            console.log("Remote description set:", ans);
        } catch (error) {
            console.error("Error setting remote description:", error);
            throw error;
        }
    }
}

export default new PeerService();