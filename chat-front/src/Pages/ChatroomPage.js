import React from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const ChatroomPage = ({ socket }) => {
  const { id: chatroomId } = useParams();
  const [messages, setMessages] = React.useState([]);
  const messageRef = React.useRef();
  const [userId, setUserId] = React.useState("");
  const [chatroomName, setChatroomName] = React.useState(""); // Add state for chatroom name

  const sendMessage = () => {
    if (socket) {
      socket.emit("chatroomMessage", {
        chatroomId,
        message: messageRef.current.value,
      });

      messageRef.current.value = "";
    }
  };

  // Fetch chatroom name
  React.useEffect(() => {
    const fetchChatroomName = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/chatroom/${chatroomId}`,
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("CC_Token"),
            },
          }
        );
        setChatroomName(res.data.name);
      } catch (err) {
        setChatroomName(""); // fallback if error
      }
    };
    fetchChatroomName();
  }, [chatroomId]);

  // Fetch old messages when joining chatroom
  React.useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/chatroom/${chatroomId}/messages`
        );
        setMessages(res.data);
      } catch (err) {
        // handle error if needed
      }
    };
    fetchMessages();
  }, [chatroomId]);

  React.useEffect(() => {
    const token = localStorage.getItem("CC_Token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserId(payload.id);
    }
    if (socket) {
      // Listen for new messages
      const handleNewMessage = (message) => {
        setMessages((prev) => [...prev, message]);
      };
      // Listen for user joined
      const handleUserJoined = ({ name }) => {
        setMessages((prev) => [
          ...prev,
          {
            message: `${name} joined the chatroom.`,
            name: "", // No "System:" prefix
            userId: "system",
          },
        ]);
      };
      // Listen for user left
      const handleUserLeft = ({ name }) => {
        setMessages((prev) => [
          ...prev,
          {
            message: `${name} left the chatroom.`,
            name: "", // No "System:" prefix
            userId: "system",
          },
        ]);
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("userJoined", handleUserJoined);
      socket.on("userLeft", handleUserLeft);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("userJoined", handleUserJoined);
        socket.off("userLeft", handleUserLeft);
      };
    }
    //eslint-disable-next-line
  }, [socket]);

  React.useEffect(() => {
    if (socket) {
      socket.emit("joinRoom", {
        chatroomId,
      });
    }

    return () => {
      //Component Unmount
      if (socket) {
        socket.emit("leaveRoom", {
          chatroomId,
        });
      }
      setMessages([]); // Clear messages on leave
    };
    //eslint-disable-next-line
  }, [chatroomId, socket]);

  return (
    <div className="chatroomPage">
      <div className="chatroomSection">
        <div className="cardHeader">Chatroom {chatroomName}</div>
        <div className="chatroomContent">
          {messages.map((message, i) => (
            <div key={i} className="message">
              {message.userId === "system" ? (
                // Show the user's name if present in system messages
                <span className="otherMessage">
                  {message.name ? `${message.name}: ` : ""}
                  {message.message}
                </span>
              ) : (
                <>
                  <span
                    className={
                      userId === message.userId
                        ? "ownMessage"
                        : "otherMessage"
                    }
                  >
                    {message.name}:
                  </span>{" "}
                  {message.message}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="chatroomActions">
          <div>
            <input
              type="text"
              name="message"
              placeholder="Say something!"
              ref={messageRef}
            />
          </div>
          <div>
            <button className="join" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatroomPage;
