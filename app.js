const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Schema = mongoose.Schema;
require("dotenv").config();

const mongoDB = process.env.MONGO_URI;
mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

const UserSchema = new Schema({
  username: { required: true, type: String },
  email: { required: true, type: String },
  password: { required: true, type: String },
  role: { default: "basic", type: String },
  date: { type: Date, default: Date.now() },
});

const User = mongoose.model("User", UserSchema);

const MessageSchema = new Schema({
  date: { default: Date.now(), type: Date },
  text: { required: true, type: String },
  user: { required: true, type: Object },
});

MessageSchema.virtual("date_formated").get(function () {
  return this.date.toLocaleDateString("en-gb", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minutes: "2-digit",
  });
});

const Message = mongoose.model("Message", MessageSchema);

// PassportJS middleware Local Strategy
passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne({ username: username }, (err, user) => {
      console.log(user);
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { msg: "Incorrect username" });
      }
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          // passwords match! log user in
          return done(null, user);
        } else {
          // passwords do not match!
          return done(null, false, { msg: "Incorrect password" });
        }
      });
      return done(null, user);
    });
  })
);

//  create a cookie which is stored in the user’s browser
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Local user var
app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  const messages = await Message.find({}).sort({ date: "desc" });
  if (!messages) {
    throw new Error("messages not found");
  }

  console.log(req.user, messages);
  res.render("index", { user: req.user, messages: messages });
});

app.post("/", (req, res, next) => {
  console.log(app.locals.currentUser);
  const message = new Message({
    user: req.user,
    text: req.body.text,
  });
  message.save((err) => {
    if (err) {
      return next(err);
    }
    console.log(message);
    res.redirect("/");
  });
});

app.get("/log-in", (req, res) => res.render("log-in"));

app.post(
  "/log-in",
  passport.authenticate("local", {
    failureRedirect: "/log-in",
  }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/log-out", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/sign-up", (req, res) => res.render("sign-up"));

app.post(
  "/sign-up",
  body("username", "Empty name")
    .trim()
    .escape()
    .custom(async (username) => {
      const existingUsername = await User.findOne({ username: username });
      if (existingUsername) {
        throw new Error("Email already in use");
      }
    }),
  body("email", "Not an Email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Invalid email")
    .custom(async (email) => {
      const existingEmail = await User.findOne({ email: email });
      if (existingEmail) {
        throw new Error("Email already in use");
      }
    }),
  body("password").isLength(6).withMessage("Minimum length 6 characters"),
  body("confirm-password").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password");
    }
    // Indicates the success of this synchronous custom validator
    return true;
  }),
  (req, res) => {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("sign-up", {
        username: req.body.username,
        email: req.body.email,
        errors: errors.array(),
      });
      return;
    }

    const user = new User({
      username: req.body.username,
      email: req.body.email,
    });

    bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
      if (err) throw new Error(err);
      user.password = hashedPassword;
      user.save((err) => {
        if (err) {
          return next(err);
        }
        req.login(user, function (err) {
          if (err) {
            return next(err);
          }
          return res.redirect("/");
        });
      });
    });
  }
);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
