require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("cookie-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
/* const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate"); 
*/

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret: process.env.APP_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_CONNECT, {useNewUrlParser: true, useUnifiedTopology: true});
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
  secrets: [String],
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/* passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "https://secrets-prince.herokuapp.com/auth/google/secrets-prince"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://secrets-prince.herokuapp.com/auth/facebook/secrets-prince"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
*/

app.get("/", (req,res)=>{
  res.render("home");
});

app.get("/register", (req, res)=>{
  res.render("register");
});

app.get("/login", (req, res)=>{
  res.render("login");
});


app.get("/secrets", (req, res)=>{
  User.find({ secrets: { $exists: true, $not: {$size: 0} } }, (err, foundUsers)=>{
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", {usersWithSecret: foundUsers});
      }
    }
  });
});

app.get("/submit", (req, res)=>{
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.get("/logout", (req, res)=>{
  req.logout();
  res.redirect("/");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }
));

app.get("/auth/google/secrets-prince",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  }
);

app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets-prince",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.post("/submit", (req, res)=>{
  const secret = req.body.secret;
  User.findById(req.user.id, (err, foundUser)=>{
    if(err){
      conosle.log(err);
    }else{
      if(foundUser){
        foundUser.secrets.push(secret);
        foundUser.save(()=>{
          res.redirect("/secrets");
        });
      }
    }
  });
});
app.post("/register", (req, res)=>{
  User.register({username:req.body.username}, req.body.password, (err, user)=>{
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, ()=>{
        res.redirect("/secrets");
      });
    }
  });
});


app.post("/login", (req, res)=>{
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, (err)=>{
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, ()=>{
        res.redirect("/secrets");
      });
    }
  })
});

app.listen(3000 || process.env.PORT, ()=>{
  console.log("Server started at port 3000");
});
