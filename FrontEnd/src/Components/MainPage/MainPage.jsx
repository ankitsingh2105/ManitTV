import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "../VideoCalling/context/SocketProvider";
import ReactPlayer from "react-player";
import peer from "../VideoCalling/service/peer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function MainPage() {
    const socket = useSocket();
    const [remoteSocketId, setRemoteSocketId] = useState(null);
    const [myStream, setMyStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [usersInRoom, setUsersInRoom] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [error, setError] = useState(null);
    const [mySocketId, setMySocketId] = useState(null); // Store local socket ID
    const [isCalling, setIsCalling] = useState(false); // Track ongoing calls to prevent duplicates

    useEffect(() => {
        const initializeStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                });
                setMyStream(stream);
                peer.createNewConnection(); // Create new peer connection
                peer.addStream(stream);
                console.log("Local stream initialized:", stream);
            } catch (error) {
                console.error("Error accessing media devices:", error);
                setError("Camera or microphone access failed. Audio-only mode enabled.");
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(audioStream => {
                        setMyStream(audioStream);
                        peer.createNewConnection();
                        peer.addStream(audioStream);
                        console.log("Audio-only stream initialized:", audioStream);
                    })
                    .catch(audioError => {
                        console.error("Error accessing audio devices:", audioError);
                        setError("Failed to access audio and video. Please check permissions or hardware.");
                    });
            }
        };
        initializeStream();
    }, []);

    useEffect(() => {
        socket.on("connect", () => {
            setMySocketId(socket.id); // Store local socket ID on connect
            console.log("Connected with socket ID:", socket.id);
        });

        socket.on("ice-candidate", ({ candidate }) => {
            peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(candidateError => console.error("Error adding ICE candidate:", candidateError));
        });
    }, [socket]);

    // Auto-join the default room on mount
    useEffect(() => {
        const room = "global_room";
        socket.emit("room:join", { room });

        socket.on("room:users", ({ users }) => {
            const filteredUsers = users.filter(id => id !== socket.id);
            setUsersInRoom(filteredUsers);
            console.log("Users in room:", filteredUsers);
            if (filteredUsers.length > 0 && !remoteSocketId && !isCalling) {
                const firstUser = filteredUsers[0];
                setRemoteSocketId(firstUser);
                setCurrentIndex(0);
                handleCall(firstUser);
            }
        });

        socket.on("user:left", ({ socketID }) => {
            console.log("User left:", socketID);
            const updatedUsers = usersInRoom.filter(id => id !== socketID);
            setUsersInRoom(updatedUsers);
            if (remoteSocketId === socketID) {
                setRemoteSocketId(null);
                setRemoteStream(null);
                setCurrentIndex(-1);
                setIsCalling(false);
                peer.createNewConnection(); // Reset peer connection
                if (updatedUsers.length > 0) {
                    const nextUser = updatedUsers[0];
                    setRemoteSocketId(nextUser);
                    setCurrentIndex(0);
                    handleCall(nextUser);
                    console.log("Switching to next user after disconnection:", nextUser);
                }
            }
        });

        socket.emit("get-room-users", { room: "global_room" });

        return () => {
            socket.off("room:users");
            socket.off("user:left");
        };
    }, [socket, remoteSocketId, isCalling]);

    const handleUserJoined = useCallback(({ socketID }) => {
        console.log("New user joined:", socketID);
        socket.emit("get-room-users", { room: "global_room" });
    }, []);

    const handleCall = useCallback(async (to) => {
        if (!to || to === socket.id || isCalling) {
            console.log("Cannot call: invalid target, self, or call in progress");
            return;
        }
        console.log("Calling...", to);
        setIsCalling(true);
        try {
            peer.createNewConnection(); // Ensure fresh connection
            if (myStream) peer.addStream(myStream); // Re-add stream to new connection
            const offer = await peer.getOffer();
            socket.emit("user:call", { to, offer });
        } catch (error) {
            console.error("Error initiating call:", error);
            setError("Failed to initiate call. Please try again.");
            setIsCalling(false);
        }
    }, [socket, myStream, isCalling]);

    const handleIncomingCall = useCallback(async ({ from, offer }) => {
        if (isCalling) {
            console.log("Ignoring incoming call: already in a call");
            return;
        }
        setRemoteSocketId(from);
        setIsCalling(true);
        console.log("Incoming call from:", from);
        try {
            peer.createNewConnection(); // Ensure fresh connection
            if (myStream) peer.addStream(myStream);
            const ans = await peer.getAnswer(offer);
            socket.emit("call:accepted", { to: from, ans });
        } catch (error) {
            console.error("Error handling incoming call:", error);
            setError("Failed to accept call. Please try again.");
            setIsCalling(false);
        }
    }, [socket, myStream, isCalling]);

    const handleAcceptCall = useCallback(({ from, ans }) => {
        console.log("Call accepted from", from);
        setRemoteSocketId(from);
        try {
            peer.setRemoteDescription(ans);

            peer.peerConnection.ontrack = (event) => {
                console.log("Remote stream received", event.streams[0]);
                setRemoteStream(event.streams[0]);
            };

            peer.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("ice-candidate", { to: from, candidate: event.candidate });
                }
            };
        } catch (error) {
            console.error("Error accepting call:", error);
            setError("Error setting up remote stream. Please try again.");
            setIsCalling(false);
        }
    }, [socket]);

    const handleNext = () => {
        if (usersInRoom.length > 0) {
            const nextIndex = (currentIndex + 1) % usersInRoom.length;
            setCurrentIndex(nextIndex);
            setRemoteSocketId(usersInRoom[nextIndex]);
            setRemoteStream(null);
            setIsCalling(false);
            handleCall(usersInRoom[nextIndex]);
            console.log("Switching to next user:", usersInRoom[nextIndex]);
        }
    };

    useEffect(() => {
        socket.on("user:joined", handleUserJoined);
        socket.on("incoming:call", handleIncomingCall);
        socket.on("call:accepted", handleAcceptCall);

        return () => {
            socket.off("user:joined", handleUserJoined);
            socket.off("incoming:call", handleIncomingCall);
            socket.off("call:accepted", handleAcceptCall);
        };
    }, [socket, handleUserJoined, handleIncomingCall, handleAcceptCall]);

    return (
        <center>
            <ToastContainer />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <h1>{remoteSocketId ? `Connected to ${remoteSocketId}` : "Waiting for users..."}</h1>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                <div>
                    {myStream ? (
                        <ReactPlayer playing url={myStream} width="500px" height="300px" />
                    ) : (
                        <div style={{ width: "500px", height: "300px", backgroundColor: "#ff8c00", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            No local stream
                        </div>
                    )}
                    <p>{mySocketId || "Loading..."}</p>
                </div>
                <div>
                    {remoteStream ? (
                        <ReactPlayer playing url={remoteStream} width="500px" height="300px" />
                    ) : (
                        <div style={{ width: "500px", height: "300px", backgroundColor: "#ff8c00", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            Waiting for connection...
                        </div>
                    )}
                    <p>Other User: {remoteSocketId || "None"}</p>
                </div>
            </div>
            <button onClick={handleNext} disabled={usersInRoom.length <= 0}>
                Next
            </button>
        </center>
    );
}