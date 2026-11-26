import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Bell, X, Clock } from "lucide-react";
import { getErrorMessage } from "../lib/errorHandler";

export default function NotificationBell() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); 
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get("/notifications");
      const fetchedNotifications = response.data.notifications;
      setNotifications(fetchedNotifications);
      
      const lastChecked = localStorage.getItem('lastNotificationCheck');
      if (lastChecked && fetchedNotifications.length > 0) {
        const lastCheckedTime = new Date(lastChecked);
        const newCount = fetchedNotifications.filter(
          notif => new Date(notif.createdAt) > lastCheckedTime
        ).length;
        setNewNotificationsCount(newCount);
      } else {
        setNewNotificationsCount(fetchedNotifications.length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleNotificationClick = () => {
    if (!notificationsOpen) {
      localStorage.setItem('lastNotificationCheck', new Date().toISOString());
      setNewNotificationsCount(0);
      
      if (notifications.length === 0) {
        setLoadingNotifications(true);
        fetchNotifications().finally(() => setLoadingNotifications(false));
      }
    }
    setNotificationsOpen(!notificationsOpen);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (message) => {
    if (message.includes("⏰") || message.includes("close")) return "⏰";
    if (message.includes("🏆") || message.includes("Winner")) return "🏆";
    if (message.includes("📊") || message.includes("Results")) return "📊";
    return "📢";
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleNotificationClick}
          className="relative p-2 text-gray-700 hover:text-blue-600 transition-all duration-200 hover:bg-blue-50 rounded-full"
        >
          <Bell size={20} className={newNotificationsCount > 0 ? "animate-pulse" : ""} />
          {newNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-bounce">
              {newNotificationsCount > 9 ? "9+" : newNotificationsCount}
            </span>
          )}
        </button>

        {notificationsOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-[32rem] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Notifications</h3>
                {notifications.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-white p-2 rounded-full transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[28rem]">
              {loadingNotifications ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500 mt-3">Chargement des notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Bell size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Aucune notification pour le moment</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Vous verrez ici les mises à jour concernant les sondages sur lesquels vous avez voté
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif, index) => {
                    const isNew = localStorage.getItem('lastNotificationCheck') 
                      ? new Date(notif.createdAt) > new Date(localStorage.getItem('lastNotificationCheck'))
                      : false;
                    
                    return (
                      <div
                        key={notif.id}
                        className={`p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group ${
                          isNew ? 'bg-blue-50/50' : ''
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-lg group-hover:scale-110 transition-transform duration-200">
                              {getNotificationIcon(notif.message)}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium leading-relaxed mb-1">
                              {notif.message}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 truncate font-medium">
                                  📋 {notif.Poll?.question}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                                <Clock size={12} />
                                <span>{formatDate(notif.createdAt)}</span>
                              </div>
                            </div>
                            
                            {notif.Poll?.category && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {notif.Poll.category}
                              </span>
                            )}
                          </div>
                          
                          {isNew && (
                            <div className="flex-shrink-0">
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                <button 
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                >
                  Fermer les notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {notificationsOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setNotificationsOpen(false)}
        />
      )}
    </>
  );
}