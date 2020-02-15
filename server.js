require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "production") {
  session.cookie.secure = true;
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {}
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@saber:27017/secretsDB?authSource=secretsDB`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);
mongoose.set("useCreateIndex", true);

const usersSchema = new Schema(
  {
    username: String,
    password: String,
    displayname: String,
    googleID: {
      type: String,
      require: true,
      index: true,
      unique: true,
      sparse: true
    },
    facebookId: {
      type: String,
      require: true,
      index: true,
      unique: true,
      sparse: true
    },
    active: Boolean
  },
  { timestamps: true }
);

const secretsSchema = new Schema(
  {
    secret: String,
    user: String,
    deleted: Boolean
  },
  { timestamps: true }
);

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);
secretsSchema.plugin(findOrCreate);

const User = mongoose.model("User", usersSchema);
const Secret = mongoose.model("Secret", secretsSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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
      User.findOrCreate(
        {
          googleID: profile.id,
          username: profile.id,
          displayname: profile.displayName,
          active: true
        },
        function(err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate(
        {
          facebookId: profile.id,
          username: profile.id,
          displayname: profile.displayName,
          active: true
        },
        function(err, user) {
          return cb(err, user);
        }
      );
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

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
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
  if (req.isAuthenticated()) {
    Secret.find({}, (err, foundSecrets) => {
      if (err) {
        console.log(err);
      } else {
        if (foundSecrets) {
          res.render("secrets", {
            displaySecrets: foundSecrets,
            displayname: req.user.displayname
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit", {
      displayname: req.user.displayname
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;
  const user = req.user.id;
  const secret = new Secret({
    secret: submittedSecret,
    user: user,
    deleted: false
  });
  secret.save();
  res.redirect("/secrets");
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
  const displayname = req.body.username;
  User.register(
    { username: username, displayname: displayname, active: true },
    password,
    err => {
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
    }
  );
});

app.post("/login", passport.authenticate("local"), (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const user = new User({
    username: username,
    displayname: username,
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
