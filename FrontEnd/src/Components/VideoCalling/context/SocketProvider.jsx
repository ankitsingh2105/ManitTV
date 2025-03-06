import { createContext, useMemo, useContext } from "react"
import React from 'react'
import { io } from "socket.io-client"
const SocketContext = createContext(null);
const SocketContextForChat = createContext(null);

export const useSocket = () => {
    const socket = useContext(SocketContext);
    return socket;
}
// export const useSocketforChat = () => {
//     const socketForChat = useContext(SocketContextForChat);
//     return socketForChat;
// }
// http://192.168.0.118:5173/

export default function SocketProvider(props) {
    const socket = useMemo(() => io("http://localhost:8000"), []);
    // const socketForChat = useMemo(() => io("http://localhost:9000"), []);

    return (
        <SocketContext.Provider value={socket}>
            {/* <SocketContextForChat.Provider value={socketForChat}> */}
                {props.children}
            {/* </SocketContextForChat.Provider> */}
        </SocketContext.Provider>
    )
}
