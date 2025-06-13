import React from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import makeToast from "../Toaster";

const DashboardPage = (props) => {
  const [chatrooms, setChatrooms] = React.useState([]);
  const navigate = useNavigate();

  const getChatrooms = () => {
    axios
      .get("http://localhost:8000/chatroom", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("CC_Token"),
        },
      })
      .then((response) => {
        setChatrooms(response.data);
      })
      .catch((err) => {
        setTimeout(getChatrooms, 3000);
      });
  };

  React.useEffect(() => {
    getChatrooms();
    // eslint-disable-next-line
  }, []);
  
  const createChatroom = () => {
    const chatroomName = chatroomNameRef.current.value;

    axios
      .post("http://localhost:8000/chatroom", {
        name: chatroomName,
      }, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("CC_Token"),
        },
      })
      .then((response) => {
        makeToast("success", response.data.message);
        getChatrooms();
        chatroomNameRef.current.value = "";
      })
      .catch((err) => {
        // console.log(err);
        if (
          err &&
          err.response &&
          err.response.data &&
          err.response.data.message
        )
          makeToast("error", err.response.data.message);
      });
  };
  
  const chatroomNameRef = React.createRef();

  const handleLogout = () => {
    localStorage.removeItem("CC_Token");
    navigate("/login");
  };

  return (
    <div className="card">
      <div className="cardHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Rooms</span>
        <button onClick={handleLogout} 
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
        >Logout</button>
      </div>
      <div className="cardBody">
        <div className="inputGroup">
          <label htmlFor="chatroomName">Chatroom Name</label>
          <input
            type="text"
            name="chatroomName"
            id="chatroomName"
            ref={chatroomNameRef}
            placeholder="Name of the Chatroom"
          />
        </div>
      </div>
      <button onClick={createChatroom}>Create Chatroom</button>
      <div className="chatrooms">
        {chatrooms.map((chatroom) => (
          <div key={chatroom._id} className="chatroom">
            <div>{chatroom.name}</div>
            <Link to={"/chatroom/" + chatroom._id}>
              <div className="join">Join</div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
