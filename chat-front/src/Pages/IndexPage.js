import React from "react";
import { useNavigate } from "react-router-dom";

const IndexPage = (props) => {
  const navigate = useNavigate();
  React.useEffect(() => {
    const token = localStorage.getItem("CC_Token");
    console.log(token);
    if (!token) {
      navigate("/login");
    } else {
      navigate("/register");
    }
    // eslint-disable-next-line
  }, [0]);
  return <div></div>;
};

export default IndexPage;
