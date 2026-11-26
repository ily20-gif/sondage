import React, { useEffect, useRef, useState, useContext } from "react";
import { useSocket } from "../../context/SocketContext";
import { fetchChatMessages, sendChatMessage } from "../../services/poll.service";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../lib/errorHandler";
import LoadingState from "../admin/LoadingState";

export default function Chat({ pollId }) {
  const socket = useSocket();
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await fetchChatMessages(pollId);
        setMessages(data || []);
      } catch (err) {
        console.error(err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [pollId]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => setMessages((prev) => [...prev, msg]);
    socket.on("new-message", handleNewMessage);
    return () => socket.off("new-message", handleNewMessage);
  }, [socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!text.trim() || !user) return;
    try {
      await sendChatMessage(pollId, text);
      if (socket) {
        socket.emit("send-message", { pollId, message: text, userId: user.id, fullName: user.fullName });
      }
      setText("");
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="bg-white shadow rounded-xl flex flex-col h-[500px] overflow-hidden">
      <div className="bg-blue-500 p-4">
        <h3 className="text-white font-semibold flex items-center">💬 Chat en direct</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-10 text-sm">Aucun message pour le moment. Soyez le premier à discuter !</p>
        ) : (
          messages.map((m, i) => {
            const isCurrentUser = m.user_id === user?.id;
            return (
              <div key={i} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-lg p-3 shadow-sm ${isCurrentUser ? "bg-blue-600 text-white" : "bg-white text-gray-800"}`}>
                  {!isCurrentUser && (
                    <div className="font-semibold text-xs mb-1 opacity-75">
                      {m.fullName || m.User?.fullName || "Anonyme"}
                    </div>
                  )}
                  <div className="text-sm break-words">{m.message}</div>
                  <div className={`text-xs mt-1 ${isCurrentUser ? "text-blue-100" : "text-gray-400"}`}>
                    {new Date(m.created_at || m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        {user ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tapez un message..."
              maxLength={500}
            />
            <button
              onClick={handleSendMessage}
              disabled={!text.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Envoyer
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm">Veuillez vous connecter pour discuter</p>
        )}
      </div>
    </div>
  );
}
