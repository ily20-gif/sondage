import { useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function VideoConferencePage() {
  const { id } = useParams(); // poll id = room id
  const { user } = useContext(AuthContext);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/@zegocloud/zego-uikit-prebuilt/zego-uikit-prebuilt.js";
    script.async = true;

    script.onload = () => {
      const appID = 1971821026;
      const serverSecret = "90ac5ea092e9c223deadb1bc3edc6f19";

      const userID = user?.id?.toString() || Math.random().toString();
      const userName = user?.fullName || "Guest";

      const kitToken = window.ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        id, // ✅ room = poll id
        userID,
        userName,
      );

      const zp = window.ZegoUIKitPrebuilt.create(kitToken);

      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: window.ZegoUIKitPrebuilt.VideoConference,
        },
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
        showUserList: true,
        showScreenSharingButton: true,
        showTextChat: true,
        maxUsers: 50,
        layout: "Grid",
      });
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [id, user]);

  return (
    <div className="relative w-screen h-screen bg-black">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => navigate(`/vote/${id}`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Retour au sondage
        </button>

        <button
          onClick={() => navigate("/")}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Accueil
        </button>
      </div>
    </div>
  );
}
