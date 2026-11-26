import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext) || {};
  const [socket, setSocket] = useState(null);
  const userId = user?.id;

  // Le serveur authentifie la connexion avec le cookie JWT :
  // on ne se connecte donc que lorsque l'utilisateur est connecté.
  useEffect(() => {
    if (!userId) {
      setSocket(null);
      return;
    }

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.on("connect_error", (err) =>
      console.warn("Socket.IO connection refused:", err.message)
    );

    // Notification temps réel : clôture d'un sondage auquel on participe
    newSocket.on("poll-closed", (data) => {
      toast(`Le sondage « ${data.question} » est clôturé. Les résultats sont disponibles.`, {
        icon: "🔒",
        duration: 6000,
      });
    });

    newSocket.on("socket-error", (data) => {
      if (data?.message) toast.error(data.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
