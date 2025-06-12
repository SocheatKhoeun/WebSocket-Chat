import { toast } from "react-toastify"; // Add this import

const mongoose = require("mongoose");
const User = mongoose.model("User");
const sha256 = require("js-sha256");
const jwt = require("jsonwebtoken"); // changed from jwt-then

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  // Allow any email for easier testing
  // const emailRegex = /@gmail.com|@yahoo.com|@hotmail.com|@live.com/;
  const emailRegex = /.+@.+\..+/;

  if (!emailRegex.test(email)) throw "Email is not valid.";
  if (password.length < 6) throw "Password must be atleast 6 characters long.";

  const userExists = await User.findOne({
    email,
  });

  if (userExists) throw "User with same email already exits.";

  const user = new User({
    name,
    email,
    password: sha256(password + process.env.SALT),
  });

  await user.save();

  res.json({
    message: "User [" + name + "] registered successfully!",
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({
    email,
    password: sha256(password + process.env.SALT),
  });

  if (!user) throw "Email and Password did not match.";

  // updated to use jsonwebtoken's sign (returns token synchronously)
  const token = jwt.sign({ id: user.id }, process.env.SECRET);

  res.json({
    message: "User logged in successfully!",
    token,
  });
};

// Replace makeToast with toast
toast("Your message here"); // or toast.success("..."), toast.error("...")