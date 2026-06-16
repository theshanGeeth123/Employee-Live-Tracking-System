import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      return;
    }

    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.log("Socket connect error:", error.message);
      setConnected(false);
    });

    newSocket.on("presence:connected", (data) => {
      console.log("Presence connected:", data);
    });

    newSocket.on("presence:admin_connected", (data) => {
      console.log("Admin socket connected:", data);
    });

    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit("presence:heartbeat");
      }
    }, 20000);

    setSocket(newSocket);

    return () => {
      clearInterval(heartbeatInterval);
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated, token, user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};