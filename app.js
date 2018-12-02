var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var passport = require("passport");
var session = require("express-session");
var flash = require("connect-flash");
var methodOverride = require("method-override");

var app = express();

// setup mongodb
var mongoose = require("mongoose");
mongoose.connect(
  "mongodb://localhost/cboard",
  {
    useNewUrlParser: true
  }
);
mongoose.Promise = global.Promise;

var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("mongoDB is connected successfully");
});

// session setup

app.use(
  session({
    secret: "session secret key",
    resave: false,
    saveUninitialized: true
  })
);

app.use(flash());

// passport setup
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session()); //로그인 세션 유지

// DELETE, UPDATE method 사용위한 미들웨어 추가
app.use(methodOverride("_method"));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
