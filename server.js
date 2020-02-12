require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const env = process.env.NODE_ENV;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

let sess = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {}
};

if (env === "production") {
  sess.cookie.secure = true;
}

app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const usersSchema = new Schema(
  {
    email: String,
    password: String,
    googleID: String,
    active: Boolean
  },
  { timestamps: true }
);

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);

const User = mongoose.model("User", usersSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleID: profile.id, active: true }, function(
        err,
        user
      ) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  const username = req.body.username;
  if (req.isAuthenticated()) {
    res.render("secrets", {
      username: username
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  req.session.destroy(err => {
    if (!err) {
      res
        .status(200)
        .clearCookie("connect.sid", { path: "/" })
        .redirect("/");
    } else {
      console.log(err);
    }
  });
});

app.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  User.register({ username: username, active: true }, password, err => {
    if (err) {
      console.log(err);
      alert(
        "There was an error in the application. Please attempt to register again."
      );
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", passport.authenticate("local"), (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const user = new User({
    username: username,
    password: password
  });
  req.login(user, err => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/secrets");
    }
  });
});

app.listen(process.env.PORT || 3000, () => {
  let port = process.env.PORT || 3000;
  console.log("Server started on port " + port);
});
