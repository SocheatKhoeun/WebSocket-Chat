import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ChatroomPage = ({ socket }) => {
  const { id: chatroomId } = useParams();
  const [messages, setMessages] = React.useState([]);
  const messageRef = React.useRef();
  const [userId, setUserId] = React.useState("");
  const [chatroomName, setChatroomName] = React.useState(""); // Add state for chatroom name
  const [typingUsers, setTypingUsers] = React.useState([]); // Track users typing
  const navigate = useNavigate(); // Add useNavigate for navigation

  const sendMessage = () => {
    if (socket) {
      socket.emit("chatroomMessage", {
        chatroomId,
        message: messageRef.current.value,
      });

      messageRef.current.value = "";
    }
  };

  // Typing event handlers
  const handleInputChange = () => {
    if (socket) {
      socket.emit("typing", { chatroomId });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socket.emit("stopTyping", { chatroomId });
      }, 1000);
    }
  };

  const typingTimeout = React.useRef();

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
      // Listen for user joined (other users)
      const handleUserJoined = ({ userId: joinedUserId, name, message }) => {
        // Only show if the joined user is not the current user
        if (joinedUserId !== userId) {
          setMessages((prev) => [
            ...prev,
            {
              message,
              name: name === "Unknown" ? "" : name,
              userId: "system",
            },
          ]);
        }
      };
      // Listen for user joined self (current user)
      const handleUserJoinedSelf = ({ userId: joinedUserId, name, message }) => {
        // Only show if the joined user is the current user
        if (joinedUserId === userId) {
          setMessages((prev) => [
            ...prev,
            {
              message,
              name: "", // Always blank for self
              userId: "system",
            },
          ]);
        }
      };
      // Listen for user left
      const handleUserLeft = ({ userId: leftUserId, name }) => {
        // Only show if the left user is not the current user
        if (leftUserId !== userId) {
          setMessages((prev) => [
            ...prev,
            {
              message: `${name} left the chatroom.`,
              name: "", // No "System:" prefix
              userId: "system",
            },
          ]);
        }
      };

      // Typing status listeners
      const handleTyping = ({ userId: typingUserId, name }) => {
        if (typingUserId !== userId) {
          setTypingUsers((prev) => {
            if (!prev.some((u) => u.userId === typingUserId)) {
              return [...prev, { userId: typingUserId, name }];
            }
            return prev;
          });
        }
      };
      const handleStopTyping = ({ userId: typingUserId }) => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== typingUserId));
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("userJoined", handleUserJoined);
      socket.on("userJoinedSelf", handleUserJoinedSelf);
      socket.on("userLeft", handleUserLeft);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("userJoined", handleUserJoined);
        socket.off("userJoinedSelf", handleUserJoinedSelf);
        socket.off("userLeft", handleUserLeft);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
      };
    }
    //eslint-disable-next-line
  }, [socket, userId]);

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

  // Leave chatroom handler
  const handleLeaveChatroom = () => {
    if (socket) {
      socket.emit("leaveRoom", {
        chatroomId,
      });
    }
    setMessages([]); // Clear messages
    navigate("/dashboard");
  };

  return (
    <div className="chatroomPage">
      <div className="chatroomSection">
        <div className="cardHeader" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{chatroomName}</span>
          <button
            style={{
              marginLeft: "1rem",
              background: "#e74c3c",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              padding: "0.25rem 0.75rem",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
            onClick={handleLeaveChatroom}
          >
            Leave
          </button>
        </div>
        <div className="chatroomContent">
          {/* Filter out consecutive duplicate system messages */}
          {messages.reduce((acc, message, i, arr) => {
            if (
              message.userId === "system" &&
              i > 0 &&
              arr[i - 1].userId === "system" &&
              arr[i - 1].message === message.message
            ) {
              return acc; // skip duplicate
            }
            acc.push(message);
            return acc;
          }, []).map((message, i) => (
            <div key={i} className="message">
              {message.userId === "system" ? (
                // Only show the system message, do NOT prefix with name
                <span className="otherMessage">
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
          {/* Typing status */}
          {typingUsers.length > 0 && (
            <div style={{ fontStyle: "italic", color: "#888", marginBottom: "0.5rem" }}>
              {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}
        </div>
        <div className="chatroomActions">
          <div>
            <input
              type="text"
              name="message"
              placeholder="Say something!"
              ref={messageRef}
              onChange={handleInputChange}
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
