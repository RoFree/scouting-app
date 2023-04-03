//CONFIG
const { frcapi, myteam, season, scoutteama, scoutteamb, leadscout, drive, pit, clientId, clientSec, redirectURI, teamServerID, baseURLNoPcl, anotherServerID, currentComp, serverSecret } = require('./config.json');

//SETUP OAUTH
const DiscordOauth2 = require("discord-oauth2");
const getOauthData = new DiscordOauth2;
const passport = require('passport')
const Strategy = require('passport-discord').Strategy;
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});
const scopes = ['identify', 'email', 'guilds', 'guilds.members.read', 'role_connections.write'];
passport.use(new Strategy({
  clientID: clientId,
  clientSecret: clientSec,
  callbackURL: redirectURI,
  scope: scopes
}, function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
    return done(null, profile);
  });
}));

//SETUP DATABASE
const sqlite3 = require('sqlite3');
let db = new sqlite3.Database('data.db', sqlite3.OPEN_READWRITE, (err) => {});
db.run( 'PRAGMA journal_mode = WAL;' );

//SETUP SERVER(S)
const fs = require('fs');
const express = require('express');
const session  = require('express-session');
const lusca = require('lusca')
const https = require('https');
const http = require('http');
const cookieParser = require("cookie-parser");
const crypto = require('crypto');
const seasonProcess = require('./2023.js')
var RateLimit = require('express-rate-limit');
var EventEmitter = require("events").EventEmitter;
const helmet = require('helmet')
var sanitize = require("sanitize-filename");
const leadToken = crypto.randomBytes(48).toString('hex');
const casinoToken = crypto.randomBytes(48).toString('hex');
var app = express();
app.disable('x-powered-by');
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const options = {
  key: fs.readFileSync(`/etc/letsencrypt/live/${baseURLNoPcl}/privkey.pem`, 'utf8'),
  cert: fs.readFileSync(`/etc/letsencrypt/live/${baseURLNoPcl}/cert.pem`, 'utf8')
};

const certsizes = {
  key: fs.statSync(`/etc/letsencrypt/live/${baseURLNoPcl}/privkey.pem`, 'utf8'),
  cert: fs.statSync(`/etc/letsencrypt/live/${baseURLNoPcl}/cert.pem`, 'utf8')
};

//checks file size of ssl, if it exists (is filled), use HTTPS on port 443
if (certsizes.key <= 100 || certsizes.cert <= 100) {} else {https.createServer(options, app).listen(443)}
const ejs = require('ejs')
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.use('/images', express.static('images'))
app.use('/public', express.static('src/public'))
//all cards by Lydia Honerkamp (https://github.com/1yd1a)
app.use('/assets', express.static('src/assets', {
  setHeaders: function(res, path) {
    res.set("X-Artist", "Lydia Honerkamp");
  }
}))
app.use(session({
  secret: serverSecret,
  resave: false,
  saveUninitialized: false,
  maxAge: 24 * 60 * 60 * 1000 * 365, // 183 days
  cookie : {
    sameSite: 'lax',
    secure: 'true'
  }
}));
var limiter = RateLimit({
  windowMs: 10*60*1000, // 10 minutes
  max: 1000,
  standardHeaders: true,
	legacyHeaders: false,
  keyGenerator: (req, res) => { return req.connection.remoteAddress }
});
app.use(lusca({
  csrf: false,
  xframe: 'SAMEORIGIN',
  hsts: {maxAge: 31557600000, includeSubDomains: true, preload: true},
  xssProtection: true,
  nosniff: true,
  referrerPolicy: 'same-origin'
}));
app.use(limiter);
app.use(passport.initialize());
app.use(passport.session());

//SETUP IMAGE UPLOADING
const qs = require('querystring');
const multer  = require('multer');
const mulstorage = multer.diskStorage(
  {
      destination: './images/',
      filename: function (req, file, cb ) {
          cb(null, crypto.randomBytes(12).toString('hex') + sanitize(file.originalname));
      }
  }
);
const upload = multer( { storage: mulstorage } );

//BASIC FUNCTIONS TO SHORTEN CODE
function invalidJSON(str) {
  try { JSON.parse(str); return false } catch (error) { return true }
}

function logInfo(info) {
  console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' + info)
}

function logErrors(errortodisplay) {
  console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' +'\x1b[31m', '[ERROR] ' ,'\x1b[0m' + errortodisplay);
  console.log('╰─> ' + Date.now);
}

//check the JSON file to see if the user is in the team discord server
function inTeamServer(json) {
  var isInTheServer = false;
  for (var index = 0; index < json.length; ++index) {
   var server = json[index];
   if(server.id == teamServerID || server.id == anotherServerID){
     isInTheServer = true;
     break;
   }
  }
  return isInTheServer;
}

//THIS IS NOT THE DISCORD.JS MODULE, THIS IS THE FILE NAMED DISCORD.JS
const discordSendData = require("./discord.js");

function findTopRole(roles) {
  var rolesOut = [];
  if (roles.indexOf(leadscout) >= 0) {
    rolesOut.push(["Lead Scout", "rgb(233, 30, 99)", "rgba(233, 30, 99, 0.1)"]);
  }
  if (roles.indexOf(drive) >= 0) {
    rolesOut.push(["Drive Team", "rgb(241, 196, 15)", "rgba(241, 196, 15, 0.1)"]);
  } 
  if (roles.indexOf(pit) >= 0) {
    rolesOut.push(["Pit Team", "rgb(230, 126, 34)", "rgba(230, 126, 34, 0.1)"]);
  } 
  if (roles.indexOf(scoutteama) >= 0) {
    rolesOut.push(["Scout Team A", "rgb(26, 188, 156)", "rgba(26, 188, 156, 0.1)"]);
  } 
  if (roles.indexOf(scoutteamb) >= 0) {
    rolesOut.push(["Scout Team B", "rgb(52, 152, 219)", "rgba(52, 152, 219, 0.1)"]);
  }
  rolesOut.push(["Default Role", "rgb(200, 200, 200)", "rgba(200, 200, 200, 0.1)"]);
  return rolesOut;
}

function checkIfLead(roles) {
  if (roles.indexOf(leadscout) >= 0) {
    return true;
  } else {
    return false;
  }
}

//check the authentication and server membership
function checkAuth(req, res, next) {
  if (req.isAuthenticated() && inTeamServer(req.user.guilds)) return addToDataBase(req, next);
  if (req.isAuthenticated() && !inTeamServer(req.user.guilds)) return res.redirect('/denied')
  res.redirect('/login');
}

//check the authentication and server membership
function apiCheckAuth(req, res, next) {
  if (req.isAuthenticated() && inTeamServer(req.user.guilds)) return next();
  if (req.isAuthenticated() && !inTeamServer(req.user.guilds)) return res.status(401).json(`{"status": 401}`);
  res.status(401).json(`{"status": 401}`)
}

function checkGamble(req, res, next) {
  let pointStmt = `SELECT score FROM scouts WHERE discordID=?`;
  let pointValues = [req.user.id];
  db.get(pointStmt, pointValues, (err,  result) => {
      if (Number(result.score) > (-2000)) {
        return next()
      } else {
        return res.status(403).json(`{"status": 403}`);
      }
  });
}

/*function checkGambleEligibility(userID) {
  let pointStmt = `SELECT score FROM scouts WHERE discordID=?`;
  let pointValues = [userID];
  db.get(pointStmt, pointValues, (err,  result) => {
      return (Number(result.score) > (-2000));
  });
}*/

//add scouts to database
function addToDataBase(req, next) {
  const password = crypto.randomBytes(12).toString('hex')
  /*db.get(`SELECT * FROM scouts WHERE email="${req.user.email}" AND discordID="${req.user.id}" ORDER BY discordID ASC LIMIT 1`, (err, accountQueryResults) => {
    if (err) {
      return;
    } else {
      if (accountQueryResults) {
        return;
      } else {
        //discordSendData.sendPasswordToUser(req.user.id, password, req.user.email);
      }
    }
  });*/
  db.run(`UPDATE scouts SET email="${req.user.email}", discordProfile="${req.user.avatar}", username="${req.user.username}", discriminator=${req.user.discriminator}, addedAt="${req.user.fetchedAt}" WHERE discordID=${req.user.id}`);
  db.run(`INSERT OR IGNORE INTO scouts(discordID, score, email, password, discordProfile, username, discriminator, addedAt, badges) VALUES(${req.user.id}, 1, "${req.user.email}", "${password}", "${req.user.avatar}", "${req.user.username}", ${req.user.discriminator}, "${req.user.fetchedAt}", 0000000000)`);
  return next();
}

//before server creation
logInfo("Preparing...");

//EXPRESSJS APP RESPONSES
app.get('/login', function(req, res) {
  res.sendFile('src/login.html', {root: __dirname})
});

//send users to discord to login when the /loginDiscord url is visited
app.get('/loginDiscord', passport.authenticate('discord', { scope: scopes }), function(req, res) {});

//get the auth code from discord (the code parameter) and use it to get a token
app.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }), function(req, res) { res.redirect('/') } // auth success
);

app.get('/clearCookies', function(req, res) {
  res.clearCookie('role');
  res.clearCookie('connect.sid');
  res.clearCookie('lead');
  res.redirect('/');
});

app.get('/settings', checkAuth, async function(req, res) {
  res.sendFile('src/settings.html', {root: __dirname})
});

//destroy session
app.get('/logout', function(req, res) {
  if (req.session) {req.session.destroy(); res.redirect('/');} else {res.send("error!")}
});

//use for lets encrypt verification
app.get('/.well-known/acme-challenge/', function(req, res) {
  res.send("");
});

//get the main form submissions
app.post('/submit', checkAuth, function(req, res) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      let formData = qs.parse(body);
      if (formData.formType == 'pit') {
        res.end("WRONG FORM")
      } else if (formData.formType == 'main') {
        var formscoresdj = 20;
        if (formData.overall.length >= 70) {
          var formscoresdj = 25;
        }
        let stmt = `INSERT INTO main (event, season, name, team, match, level, game1, game2, game3, game4, game5, game6, game7, game8, game9, game10, game11, game12, game13, game14, game15, game16, game17, game18, game19, game20, game21, game22, game23, game24, game25, teleop, defend, driving, overall, discordID, discordName, discordTag, discordAvatarId, weight, analysis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        let values = [formData.event, season, req.user.username, formData.team, formData.match, formData.level, formData.game1, formData.game2, formData.game3, formData.game4, formData.game5, formData.game6, formData.game7, formData.game8, formData.game9, formData.game10, formData.game11, formData.game12, formData.game13, formData.game14, formData.game15, formData.game16, formData.game17, formData.game18, formData.game19, formData.game20, formData.game21, formData.game22, formData.game23, formData.game24, formData.game25, "dropped", formData.defend, formData.driving, formData.overall, req.user.id, req.user.username, req.user.discriminator, req.user.avatar, 0, "0"];
        db.run(stmt, values, function(err) {
            if (err) {
              logErrors(err.message);
              res.end(err.message);
            }
            discordSendData.newSubmission("main", this.lastID, req.user.username);
            seasonProcess.weightScores(this.lastID)
        });
        let pointStmt = `UPDATE scouts SET score = score + ? WHERE discordID=?`;
        let pointValues = [formscoresdj, req.user.id];
        db.run(pointStmt, pointValues, function(err) {
            if (err) {
              logErrors(err.message);
              res.end(err.message);
            }
        });
        res.sendFile('src/submitted.html', { 
          root: __dirname
        })
      } else {
        return res.status(500).send(
          "unknown form type"
        );
      }
    });
});

//use this thing to do the pit form image thing
const imageUploads = upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }, { name: 'image5', maxCount: 1 }])
app.post('/submitPit', checkAuth, imageUploads, function(req, res) {
  let formData = req.body
  let stmt = `INSERT INTO pit (event, season, name, team, drivetype, game1, game2, game3, game4, game5, game6, game7, game8, game9, game10, game11, game12, game13, game14, game15, game16, game17, game18, game19, game20, driveTeam, attended, confidence, bqual, overall, discordID, discordName, discordTag, discordAvatarId, image1, image2, image3, image4, image5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  let values = [formData.event, season, req.user.username, formData.team, formData.drivetype, formData.game1, formData.game2, formData.game3, formData.game4, formData.game5, formData.game6, formData.game7, formData.game8, formData.game9, formData.game10, formData.game11, formData.game12, formData.game13, formData.game14, formData.game15, formData.game16, formData.game17, formData.game18, formData.game19, formData.game20, formData.driveTeam, formData.attended, formData.confidence, formData.bqual, formData.overall, req.user.id, req.user.username, req.user.discriminator, req.user.avatar, req.files.image1[0].filename, req.files.image2[0].filename, req.files.image3[0].filename, req.files.image4[0].filename, req.files.image5[0].filename];
  db.run(stmt, values, function(err) {
    if (err) {
      logErrors(err.message);
      res.end('pit form error! ' + err.message);
    }
    discordSendData.newSubmission("pit", this.lastID, req.user.username);
  });
  let pointStmt = `UPDATE scouts SET score = score + 35 WHERE discordID=?`;
  let pointValues = [req.user.id];
  db.run(pointStmt, pointValues, function(err) {
      if (err) {
        logErrors(err.message);
        res.end(err.message);
      }
  });
  res.sendFile('src/submitted.html', { 
    root: __dirname
  })
});

//index.html, read the code
app.get('/', checkAuth, async function(req, res) {
  try {
    if (!req.cookies.role) {
      //set cookie if not exists
      //I am setting a cookie because it takes a while to wait for role data from API
      
      var oauthDataCookieSet =  await Promise.resolve(getOauthData.getGuildMember(req.user.accessToken, teamServerID).then( data => {return findTopRole(data.roles)}));

      //btoa and atob bad idea
      //Buffer.from(str, 'base64') and buf.toString('base64') instead
      res.cookie("role", JSON.stringify(oauthDataCookieSet), {expire: 7200000 + Date.now(), sameSite: 'Lax', secure: true, httpOnly: true }); 
      if (oauthDataCookieSet[0][0] == "Pit Team" || oauthDataCookieSet[0][0] == "Drive Team") {
        res.render('../src/index.ejs', { 
          root: __dirname, order1: "2", order2: "0", order3: "1", order4: "3", additionalURLs: "<span></span>"
        })
      } else if (oauthDataCookieSet[0][0] == "Lead Scout") {
        res.cookie("lead", leadToken, {expire: 7200000 + Date.now(), sameSite: 'Lax', secure: true, httpOnly: true }); 
        res.render('../src/index.ejs', { 
          root: __dirname, order1: "0", order2: "3", order3: "2", order4: "1", additionalURLs: `<a href="manage" class="gameflair1" style="order: 4; margin-bottom: 5%;">Manage Submissions<br></a>`
        })
      } else {
        res.render('../src/index.ejs', { 
          root: __dirname, order1: "0", order2: "3", order3: "2", order4: "1", additionalURLs: "<span></span>"
        })
      }
    } else {
    var oauthData =  JSON.parse(req.cookies.role);
    if (oauthData[0][0] == "Pit Team" || oauthData[0][0] == "Drive Team") {
      res.render('../src/index.ejs', { 
        root: __dirname, order1: "2", order2: "0", order3: "1", order4: "3", additionalURLs: "<span></span>"
      })
    } else if (oauthData[0][0] == "Lead Scout") {
      res.cookie("lead", leadToken, {expire: 7200000 + Date.now(), sameSite: 'Lax', secure: true, httpOnly: true }); 
      res.render('../src/index.ejs', { 
        root: __dirname, order1: "0", order2: "3", order3: "2", order4: "1", additionalURLs: `<a href="manage" class="gameflair1" style="order: 4; margin-bottom: 5%;">Manage Submissions<br></a>`
      })
    } else {
      res.render('../src/index.ejs', { 
        root: __dirname, order1: "0", order2: "3", order3: "2", order4: "1", additionalURLs: "<span></span>"
      })
    }
    }
  } catch (err) {
    res.render('../src/index.ejs', { 
      root: __dirname, order1: "0", order2: "3", order3: "2", order4: "1", additionalURLs: `<span></span>`
    })
  }
});

//main scouting form
app.get('/main', checkAuth, function(req, res) {
  res.sendFile('src/main.html', { 
    root: __dirname
  })
});

//pit form
app.get('/pit', checkAuth, function(req, res) {
  res.sendFile('src/pit.html', { 
    root: __dirname
  })
});

//webmanifest for PWAs
//serve resources
app.get('/app.webmanifest', function(req, res) {
  res.sendFile('./src/app.webmanifest', { root: __dirname })
  res.set('Cache-control', 'public, max-age=7776000');
});

//serve resources
app.get('/float.css', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('./src/float.css', { root: __dirname });
});

//serve resources
app.get('/float.min.css', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('./src/float.min.css', { root: __dirname });
});

//serve resources
app.get('/fonts/Raleway-300.ttf', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('./src/fonts/Raleway-300.ttf', { root: __dirname });
});

//serve resources
app.get('/fonts/Raleway-500.ttf', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('./src/fonts/Raleway-500.ttf', { root: __dirname });
});

//serve resources
app.get('/form.js', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('./src/form.js', { root: __dirname });
});

//serve resources
app.get('/form.min.js', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('./src/form.min.js', { root: __dirname });
});

//service worker for PWA installs
//serve resources
app.get('/sw.js', function(req, res) {
  res.set('Cache-control', 'public, max-age=2592000');
  res.sendFile('src/sw.js', { root: __dirname });
});

//serve resources
app.get('/appinstall.js', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('src/appinstall.js', { root: __dirname });
});

//serve resources
app.get('/favicon.ico', function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/favicon.ico', { root: __dirname });
});

app.get('/scouts', function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/scouts.html', { root: __dirname });
});

app.get('/blackjack', checkAuth, function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/blackjack.html', { root: __dirname });
});

app.get('/spin', checkAuth, function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/spin.html', { root: __dirname });
});

app.get('/points', function(req, res) {
  res.set('Cache-control', 'public, max-age=7776000');
  res.sendFile('src/points.html', { root: __dirname });
});

app.get('/topitscout', checkAuth, function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/topitscout.html', { root: __dirname });
});

app.get('/notes', checkAuth, function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/notes.html', { root: __dirname });
});

app.get('/profile', checkAuth, function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/profile.html', { root: __dirname });
});

app.get('/fantasy', checkAuth, function(req, res) {
  res.set('Cache-control', 'public, max-age=259200');
  res.sendFile('src/fantasy.html', { root: __dirname });
});

//allow people to get denied :)
app.get('/denied', function(req, res) {
  try {
  res.sendFile('src/denied.html', { root: __dirname })
  } catch (error) {
    res.write("Access Denied!" + "\nCould not render 404 page!" + "\n Error: " + error)
  } 
});

//print out all info discord gives
app.get('/info', checkAuth, function(req, res) {
  console.log(req.user.id)
  console.log(req.user.username)
  console.log(req.user.avatar)
  console.log(req.user.discriminator)
  console.log(inTeamServer(req.user.guilds))
  res.json(req.user);
});

app.get('/teamRoleInfo', checkAuth, function(req, res) {  
  getOauthData.getGuildMember(req.user.accessToken, teamServerID).then( data => {
    console.log(data.roles)
  }).catch();
});

//tool to browse match scouting data
app.get('/detail', checkAuth, function(req, res) {
  if (req.query.team && req.query.event && req.query.page) {
    const stmt = `SELECT * FROM main WHERE team=? AND event=? AND season=? ORDER BY id DESC LIMIT 1 OFFSET ?`;
    const values = [req.query.team, req.query.event, season, req.query.page];
    db.get(stmt, values, (err, dbQueryResult) => {
      if (err) {
        res.render('../src/detail.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsMatchNumber: 0, resultsEventCode: 0, resultsBody: 0 })
        return;
      } else {
        if (typeof dbQueryResult == "undefined") {
          res.render('../src/detail.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsMatchNumber: 0, resultsEventCode: 0, resultsBody: 0 })
          return;
        } else {
          res.render('../src/detail.ejs', { 
            root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "none", displayResults: "flex",
            resultsTeamNumber: `${dbQueryResult.team}`,
            resultsMatchNumber: `${dbQueryResult.match}`,
            resultsEventCode: `${dbQueryResult.event}`,
            resultsBody: seasonProcess.createHTMLExport(dbQueryResult)
          })
          return;
        }
      }
    });
  } else if (req.query.id) {
    const stmt = `SELECT * FROM main WHERE id=? LIMIT 1`;
    const values = [req.query.id];
    db.get(stmt, values, (err, dbQueryResult) => {
      if (err) {
        res.render('../src/detail.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsMatchNumber: 0, resultsEventCode: 0, resultsBody: 0 })
        return;
      } else {
        if (typeof dbQueryResult == "undefined") {
          res.render('../src/detail.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsMatchNumber: 0, resultsEventCode: 0, resultsBody: 0 })
          return;
        } else {
          res.render('../src/detail.ejs', { 
            root: __dirname, errorDisplay: "block", errorMessage: "ID based query, buttons will not work!", displaySearch: "none", displayResults: "flex",
            resultsTeamNumber: `${dbQueryResult.team}`,
            resultsMatchNumber: `${dbQueryResult.match}`,
            resultsEventCode: `${dbQueryResult.event}`,
            resultsBody: seasonProcess.createHTMLExport(dbQueryResult)
          })
          return;
        }
      }
    });
  } else {
  res.render('../src/detail.ejs', { root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsMatchNumber: 0, resultsEventCode: 0, resultsBody: 0 })
  return;
  }
});

app.get('/browse', checkAuth, function(req, res) {
  if (req.query.number && req.query.event) {
    if (req.query.number == "ALL" || req.query.number == "*" || req.query.number == "0000" || req.query.number == "0") {
      const stmt = `SELECT * FROM main WHERE event=? AND season=? ORDER BY team ASC`;
      const values = [req.query.event, season];
      db.all(stmt, values, (err, dbQueryResult) => {
        if (err) {
          res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0, moredata: 0 })
          return;
        } else {
          if (typeof dbQueryResult == "undefined") {
            res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0, moredata: 0 })
            return;
          } else {
            res.render('../src/browse.ejs', { 
              root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "none", displayResults: "flex",
              resultsTeamNumber: `ALL`,
              resultsEventCode: `${req.query.event}`,
              resultsBody: seasonProcess.createHTMLTableWithTeamNum(dbQueryResult)
            })
            return;
          }
        }
      });
    } else {
      if (req.query.type === "team") {
        const stmt = `SELECT * FROM main WHERE team=? AND event=? AND season=? ORDER BY id DESC`;
        const values = [req.query.number, req.query.event, season];
        db.all(stmt, values, (err, dbQueryResult) => {
          if (err) {
            res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0 })
            return;
          } else {
            if (typeof dbQueryResult == "undefined") {
              res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0 })
              return;
            } else {
              res.render('../src/browse.ejs', { 
                root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "none", displayResults: "flex",
                resultsTeamNumber: `Team ${req.query.number}`,
                resultsEventCode: `${req.query.event}`,
                resultsBody: seasonProcess.createHTMLTable(dbQueryResult)
              })
              return;
            }
          }
        });
      } else if (req.query.type === "match") {
        const stmt = `SELECT * FROM main WHERE match=? AND event=? AND season=? ORDER BY id DESC`;
        const values = [req.query.number, req.query.event, season];
        db.all(stmt, values, (err, dbQueryResult) => {
          if (err) {
            res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0 })
            return;
          } else {
            if (typeof dbQueryResult == "undefined") {
              res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0 })
              return;
            } else {
              res.render('../src/browse.ejs', { 
                root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "none", displayResults: "flex",
                resultsTeamNumber: `Match ${req.query.number}`,
                resultsEventCode: `${req.query.event}`,
                resultsBody: seasonProcess.createHTMLTableWithTeamNum(dbQueryResult)
              })
              return;
            }
          }
        });
      }
    }
  } else if (req.query.discordID) {
    const stmt = `SELECT * FROM main WHERE discordID=? AND season=? ORDER BY id DESC`;
    const values = [req.query.discordID, season];
    db.all(stmt, values, (err, dbQueryResult) => {
      if (err) {
        res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0 })
        return;
      } else {
        if (typeof dbQueryResult == "undefined") {
          res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0 })
          return;
        } else {
          res.render('../src/browse.ejs', { 
            root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "none", displayResults: "flex",
            resultsTeamNumber: `Scout ${req.query.discordID}`,
            resultsEventCode: season,
            resultsBody: seasonProcess.createHTMLTableWithTeamNum(dbQueryResult)
          })
          return;
        }
      }
    });
  } else {
  res.render('../src/browse.ejs', { root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0 })
  return;
  }
});
 
app.get('/teams', checkAuth, function(req, res) {
  res.sendFile('src/teams.html', { root: __dirname });
});

app.get('/manage', checkAuth, async function(req, res) {
  async function checkIfLeadScout() {
    if (req.cookies.lead) {
      if (req.cookies.lead == leadToken) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  const isLeadScout = await checkIfLeadScout()
  if (isLeadScout) {
    if (req.query.dbase) {
      function sanitizeDBName() {
        if (req.query.dbase == "pit") {return "pit"} else {return "main"}
      }
      function mainOrPitLink(type) {
        if (type == "pit") {return "pitimages"} else {return "detail"}
      }
      const stmt = `SELECT id FROM ${sanitizeDBName()} ORDER BY id ASC`;
      db.all(stmt, (err, dbQueryResult) => {
        if (err) {
          res.render('../src/manage.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: Query Error!', displaySearch: "flex", displayResults: "none", resultsBody: 0 })
          return;
        } else {
          if (typeof dbQueryResult == "undefined") {
            res.render('../src/manage.ejs', { root: __dirname, errorDisplay: "block", errorMessage: 'Error: Results Undefined!', displaySearch: "flex", displayResults: "none", resultsBody: 0 })
            return;
          } else {
            var listHTML = "";
            for (var i = 0; i < dbQueryResult.length; i++) {
              listHTML = listHTML + `<fieldset style="background-color: "><span><span>ID:&emsp;${dbQueryResult[i].id}</span>&emsp;&emsp;<span><a href="/${mainOrPitLink(req.query.dbase)}?id=${dbQueryResult[i].id}" style="all: unset; color: #2997FF; text-decoration: none;">View</a>&emsp;<span onclick="deleteSubmission('${req.query.dbase}', ${dbQueryResult[i].id}, '${req.query.dbase}${dbQueryResult[i].id}')" style="color: red" id="${req.query.dbase}${dbQueryResult[i].id}">Delete</span></span></span></fieldset>`
            }
            res.render('../src/manage.ejs', { 
              root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "none", displayResults: "flex",
              resultsBody: listHTML
            })
            return;
          }
        }
      });
    } else {
    res.render('../src/manage.ejs', { root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "flex", displayResults: "none",  resultsBody: 0 })
    return;
    }
  } else {
    res.status(401).send("Access Denied!");
  }
});

app.post('/deleteSubmission', checkAuth, async function(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    function sanitizeDBName() {
      if (reqData.db == "pit") {return "pit"} else {return "main"}
    }
    let reqData = qs.parse(body);
      async function checkIfLeadScout() {
        if (req.cookies.lead) {
          if (req.cookies.lead == leadToken) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
      function selectDeductionAmount() {if (reqData.db == "pit") {return 35} else {return 25}}
      const isLeadScout = await checkIfLeadScout()
      if (isLeadScout) {
        if (reqData.submissionID && reqData.db) {
          const stmt = `SELECT discordID FROM ${sanitizeDBName()} WHERE id=?`;
          const values = [reqData.submissionID];
          db.get(stmt, values, (err, result) => {
            console.log(result)
            const getUserIDstmt = `UPDATE scouts SET score = score - ${selectDeductionAmount()} WHERE discordID="${result.discordID}"`;
            db.run(getUserIDstmt, (err) => {if(err){console.log(err);return;}});
          });
          const deleteStmt = `DELETE FROM ${sanitizeDBName()} WHERE id=?`;
          const deleteValues = [reqData.submissionID];
          db.run(deleteStmt, deleteValues, (err) => {if(err){console.log(err);return;}});
          res.status(200).send("done!");
        } else {
          res.status(400).send("Bad Request!");
        }
      } else {
        res.status(401).send("Access Denied!");
      }
  });
});

//get list of matches
app.get('/matches', checkAuth, function(req, res) {
  res.set('Cache-control', 'public, max-age=2592000');
  res.sendFile('src/matches.html', { root: __dirname });
});

//serve the uploaded images
app.get('/pitimages', checkAuth, function(req, res) {
  if (req.query.team && req.query.event) {
    const stmt = `SELECT * FROM pit WHERE team=? AND event=? AND season=? ORDER BY id LIMIT 1`;
    const values = [req.query.team, req.query.event, season];
    db.get(stmt, values, (err, dbQueryResult) => {
      if (err) {
        res.render('../src/pitimg.ejs', { 
          root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0
        })
        return;
      } else {
        if (typeof dbQueryResult == "undefined") {
          res.render('../src/pitimg.ejs', { 
            root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0
          })
          return;
        } else {
          res.render('../src/pitimg.ejs', { 
            root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "none", displayResults: "flex", 
            resultsTeamNumber: `${dbQueryResult.team}`,
            resultsEventCode: `${dbQueryResult.event}`, 
            resultsBody: `<p>Drive Type: ${dbQueryResult.drivetype}</p><br><p>Pit Scouting Assesment: ${dbQueryResult.overall}</p><br><img src="images/${dbQueryResult.image1}" alt="robot image from pit scouting (1)"/><br><img src="images/${dbQueryResult.image2}" alt="robot image from pit scouting (2)"/><br><img src="images/${dbQueryResult.image3}" alt="robot image from pit scouting (3)"/><br><img src="images/${dbQueryResult.image4}" alt="robot image from pit scouting (4)"/><br><img src="images/${dbQueryResult.image5}" alt="robot image from pit scouting (5)"/>`
          })
          return;
        }
      }
    });
  } else if (req.query.id) {
    const stmt = `SELECT * FROM pit WHERE id=? ORDER BY id LIMIT 1`;
    const values = [req.query.id];
    db.get(stmt, values, (err, dbQueryResult) => {
      if (err) {
        res.render('../src/pitimg.ejs', { 
          root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0
        })
        return;
      } else {
        if (typeof dbQueryResult == "undefined") {
          res.render('../src/pitimg.ejs', { 
            root: __dirname, errorDisplay: "block", errorMessage: 'Error: No results!', displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0
          })
          return;
        } else {
          res.render('../src/pitimg.ejs', { 
            root: __dirname, errorDisplay: "block", errorMessage: "ID based query, buttons will not work!", displaySearch: "none", displayResults: "flex", 
            resultsTeamNumber: `${dbQueryResult.team}`, 
            resultsEventCode: `${dbQueryResult.event}`, 
            resultsBody: `<img src="images/${dbQueryResult.image1}" alt="robot image from pit scouting (1)"/><br><img src="images/${dbQueryResult.image2}" alt="robot image from pit scouting (2)"/><br><img src="images/${dbQueryResult.image3}" alt="robot image from pit scouting (3)"/><br><img src="images/${dbQueryResult.image4}" alt="robot image from pit scouting (4)"/><br><img src="images/${dbQueryResult.image5}" alt="robot image from pit scouting (5)"/>`
          })
          return;
        }
      }
    });
  } else {
  res.render('../src/pitimg.ejs', { 
    root: __dirname, errorDisplay: "none", errorMessage: null, displaySearch: "flex", displayResults: "none", resultsTeamNumber: 0, resultsEventCode: 0, resultsBody: 0
  })
  return;
  }
});

//api
app.get('/api/matches/:season/:event/:level/:all', apiCheckAuth, function(req, res) {
  var teamNumParam = ""
  if (req.params.all === "all") {teamNumParam =  "&start=&end=";} else {teamNumParam = `&teamNumber=${myteam}`}
  var dbody = new EventEmitter();
  var options = {
      'method': 'GET',
      'hostname': 'frc-api.firstinspires.org',
      'path': `/v3.0/${req.params.season}/schedule/${req.params.event}?tournamentLevel=${req.params.level}${teamNumParam}`,
      'headers': {
          'Authorization': 'Basic ' + frcapi
      },
      'maxRedirects': 20
  };

  var request = https.request(options, function(response) {
      var chunks = [];

      response.on("data", function(chunk) {
          chunks.push(chunk);
      });

      response.on("end", function(chunk) {
          var body = Buffer.concat(chunks);
          data = body;
          dbody.emit('update');
      });

      response.on("error", function(error) {
          console.error(error);
      });
  });
  request.end();
  dbody.on('update', function() {
      if (invalidJSON(data)) {res.status(500).send('error! invalid data')} else {
        const parsedData = JSON.parse(data);
        var matchesContent = "";
        const eventCode = req.params.event
        for (let i = 0; i < parsedData.Schedule.length; i++) {
          matchesContent = matchesContent + `<fieldset><label>${parsedData.Schedule[i].description}<br>${(parsedData.Schedule[i].startTime).replace("T", " ")}</label><br><span style="color: #ff0000;"><a href="browse?number=${parsedData.Schedule[i].teams[0].teamNumber}&type=team&event=${eventCode}">${parsedData.Schedule[i].teams[0].teamNumber}</a>&emsp;<a href="browse?number=${parsedData.Schedule[i].teams[1].teamNumber}&type=team&event=${eventCode}">${parsedData.Schedule[i].teams[1].teamNumber}</a>&emsp;<a href="browse?number=${parsedData.Schedule[i].teams[2].teamNumber}&type=team&event=${eventCode}">${parsedData.Schedule[i].teams[2].teamNumber}</a></span><br><span style="color: #0000ff;"><a href="browse?number=${parsedData.Schedule[i].teams[3].teamNumber}&type=team&event=${eventCode}">${parsedData.Schedule[i].teams[3].teamNumber}</a>&emsp;<a href="browse?number=${parsedData.Schedule[i].teams[4].teamNumber}&type=team&event=${eventCode}">${parsedData.Schedule[i].teams[4].teamNumber}</a>&emsp;<a href="browse?number=${parsedData.Schedule[i].teams[5].teamNumber}&type=team&event=${eventCode}">${parsedData.Schedule[i].teams[5].teamNumber}</a></span></fieldset>`;
        }
        res.status(200).setHeader('Content-type','text/plain').send(matchesContent);
      }
  });
});

app.get('/api/data/:season/:event/:team', apiCheckAuth, function(req, res) {
  const stmt = `SELECT * FROM main WHERE team=? AND event=? AND season=? ORDER BY id LIMIT 1`;
  const values = [req.params.team, req.params.event, req.params.season];
  db.get(stmt, values, (err, dbQueryResult) => {
    if (err) {
      res.status(500).send("got an error from query");
    } else {
      res.status(200).json(JSON.parse(dbQueryResult));
    }
  });
});

app.get('/api/pit/:season/:event/:team', apiCheckAuth, function(req, res) {
  const stmt = `SELECT * FROM pit WHERE team=? AND event=? AND season=? ORDER BY id LIMIT 1`;
  const values = [req.params.team, req.params.event, req.params.season];
  db.get(stmt, values, (err, dbQueryResult) => {
    if (err) {
      res.status(500).send("got an error from query");
    } else {
      res.status(200).json(JSON.parse(dbQueryResult));
    }
  });
});

app.get('/api/teams/:season/:event', apiCheckAuth, function(req, res) {
  if (req.params.event) {
      const stmt = `SELECT team, AVG(weight) FROM main WHERE event=? AND season=? GROUP BY team ORDER BY AVG(weight) DESC`;
      const requestedEvent = sanitize(req.params.event);
      const values = [requestedEvent, season];
      db.all(stmt, values, (err, dbQueryResult) => {
        if (err) {
          res.status(500).send("got an error from query");
          return;
        } else {
          if (typeof dbQueryResult == "undefined") {
            res.status(204).send("no query results");
          } else {
            var htmltable = ``;
            for (var i = 0; i < dbQueryResult.length; i++) {
              htmltable = htmltable + `<tr><td>${i + 1}</td><td><a href="/browse?number=${dbQueryResult[i]['team']}&type=team&event=${requestedEvent}" style="all: unset; color: #2997FF; text-decoration: none;">${dbQueryResult[i]['team']}</a></td><td>${Math.round(dbQueryResult[i]['AVG(weight)'])}%</td><td><progress id="scoreWt" max="100" value="${dbQueryResult[i]['AVG(weight)']}"></progress></td>`;
            }
            res.status(200).setHeader('Content-type','text/plain').send(htmltable);
          }
        }
      });
  } else {
    res.status(400).send(
      "parameters not provided, or invalid!"
    );
  }
});

app.get('/api/scouts', apiCheckAuth, function(req, res) {
  const stmt = `SELECT * FROM scouts ORDER BY score DESC`;
  db.all(stmt, (err, dbQueryResult) => {
    if (err) {
      res.status(500).send("got an error from query");
      return;
    } else {
      if (typeof dbQueryResult == "undefined") {
        res.status(204).send("no query results");
      } else {
        var htmltable = ``;
        for (var i = 0; i < dbQueryResult.length; i++) {
          htmltable = htmltable + `<tr><td><a href="/browse?discordID=${dbQueryResult[i].discordID}" style="all: unset; color: #2997FF; text-decoration: none;">${dbQueryResult[i].username}#${dbQueryResult[i].discriminator}</a></td><td>${Math.round(dbQueryResult[i].score)}</td></tr>`;
        }
        res.status(200).setHeader('Content-type','text/plain').send(htmltable);
      }
    }
  });
});

app.get('/api/scouts/:scout/profile', apiCheckAuth, function(req, res) {
  function isMe() {if (req.params.scout == "me") {return req.user.id} else {return req.params.scout}}
  const stmt = `SELECT discordID, score, discordProfile, username, discriminator, addedAt, badges FROM scouts WHERE discordID=?`;
  const values = [isMe()];
  db.get(stmt, values, (err, dbQueryResult) => {
    if (err) {
      res.status(500).send("got an error from query");
      return;
    } else {
      if (typeof dbQueryResult == "undefined") {
        res.status(204).send("no query results");
      } else {
        res.status(200).json(dbQueryResult);
      }
    }
  });
});

app.get('/api/scoutByID/:discordID', apiCheckAuth, function(req, res) {
  const stmt = `SELECT * FROM scouts WHERE discordID=?`;
  const values = [req.params.discordID];
  db.get(stmt, values, (err, dbQueryResult) => {
    if (err) {
      res.status(500).send("got an error from query");
      return;
    } else {
      if (typeof dbQueryResult == "undefined") {
        res.status(204).send("no query results");
      } else {
        res.status(200).setHeader('Content-type','text/plain').send(`<fieldset><p style="text-align: center;"><img src="https://cdn.discordapp.com/avatars/${dbQueryResult.discordID}/${dbQueryResult.discordProfile}.png?size=512" crossorigin="anonymous"x></p><br><br>Scout Name: ${dbQueryResult.username}#${dbQueryResult.discriminator}<br>Scout Discord: ${dbQueryResult.discordID}<br>Started Scouting: ${dbQueryResult.addedAt}<br>Score: ${dbQueryResult.score}</fieldset>`);
      }
    }
  });
});

//slots API
app.get('/api/casino/slots/slotSpin', apiCheckAuth, function(req, res) {
    const spin = [Math.floor(Math.random() * 7 + 1), Math.floor(Math.random() * 7 + 1), Math.floor(Math.random() * 7 + 1)];
    if (spin[0] == spin[1] == spin[2]) {
      let pointStmt = `UPDATE scouts SET score = score + 766 WHERE discordID=?`;
      let pointValues = [req.user.id];
      db.run(pointStmt, pointValues, (err) => {
        if (err) {
          res.status(500).send("got an error from transaction");
          return;
        } else {
            res.status(200).json(`{"spin0": ${spin[0]}, "spin1": ${spin[1]}, "spin2": ${spin[2]}}`);
        }
      });
    } else {
      let pointStmt = `UPDATE scouts SET score = score - 10 WHERE discordID=?`;
      let pointValues = [req.user.id];
      db.run(pointStmt, pointValues, (err) => {
        if (err) {
          res.status(500).send("got an error from transaction");
          return;
        } else {
            res.status(200).json(`{"spin0": ${spin[0]}, "spin1": ${spin[1]}, "spin2": ${spin[2]}}`);
        }
      });
    }
});
//end slots API

//blackjack API
app.get('/api/casino/blackjack/startingCards', apiCheckAuth, checkGamble, function(req, res) {
    const possibleCards = [{"value":"A","suit":"h"},{"value":2,"suit":"h"},{"value":3,"suit":"h"},{"value":4,"suit":"h"},{"value":5,"suit":"h"},{"value":6,"suit":"h"},{"value":7,"suit":"h"},{"value":8,"suit":"h"},{"value":9,"suit":"h"},{"value":10,"suit":"h"},{"value":"J","suit":"h"},{"value":"Q","suit":"h"},{"value":"K","suit":"h"},{"value":"A","suit":"d"},{"value":2,"suit":"d"},{"value":3,"suit":"d"},{"value":4,"suit":"d"},{"value":5,"suit":"d"},{"value":6,"suit":"d"},{"value":7,"suit":"d"},{"value":8,"suit":"d"},{"value":9,"suit":"d"},{"value":10,"suit":"d"},{"value":"J","suit":"d"},{"value":"Q","suit":"d"},{"value":"K","suit":"d"},{"value":"A","suit":"s"},{"value":2,"suit":"s"},{"value":3,"suit":"s"},{"value":4,"suit":"s"},{"value":5,"suit":"s"},{"value":6,"suit":"s"},{"value":7,"suit":"s"},{"value":8,"suit":"s"},{"value":9,"suit":"s"},{"value":10,"suit":"s"},{"value":"J","suit":"s"},{"value":"Q","suit":"s"},{"value":"K","suit":"s"},{"value":"A","suit":"c"},{"value":2,"suit":"c"},{"value":3,"suit":"c"},{"value":4,"suit":"c"},{"value":5,"suit":"c"},{"value":6,"suit":"c"},{"value":7,"suit":"c"},{"value":8,"suit":"c"},{"value":9,"suit":"c"},{"value":10,"suit":"c"},{"value":"J","suit":"c"},{"value":"Q","suit":"c"},{"value":"K","suit":"c"}]
    var cards = [];
    var cardValues = 0;
    var numOfAces = 0;
    cards.push(possibleCards[Math.floor(Math.random() * 51)])
    cards.push(possibleCards[Math.floor(Math.random() * 51)])
    cards.push(possibleCards[Math.floor(Math.random() * 51)])
    //prevent cards from being duplicated
    if (cards[0] == cards[1] || cards[1] == cards[2] || cards[0] == cards[2]) {
      while (cards[0] == cards[1] || cards[1] == cards[2] || cards[0] == cards[2]) {
        if (cards[0] == cards[1] || cards[1] == cards[2] || cards[0] == cards[2]) {
          cards = [];
          cards.push(possibleCards[Math.floor(Math.random() * 51)])
          cards.push(possibleCards[Math.floor(Math.random() * 51)])
          cards.push(possibleCards[Math.floor(Math.random() * 51)])
        } else {
          break;
        }
      }
    }

    for (var i = 1; i < 3; i++) {
      if (typeof(cards[i].value) !== "number") {
        if (cards[i].value === "A") {
          numOfAces = numOfAces + 1
        } else {
          cardValues = cardValues + 10
        }
      } else {
        cardValues = cardValues + cards[i].value
      }
    }
    function findDealerTotal() {if(typeof(cards[0].value) !== "number"){return 10;}else{return cards[0].value;}}

    let pointStmt = `UPDATE scouts SET score = score - 10 WHERE discordID=?`;
    let pointValues = [req.user.id];
    db.run(pointStmt, pointValues, (err) => {
      if (err) {
        res.status(500).send("got an error from transaction");
        return;
      }
    });

    res.status(200).json(`{"dealt": "card-${cards[0].suit}_${cards[0].value}.png", "player0": "card-${cards[1].suit}_${cards[1].value}.png", "player1": "card-${cards[2].suit}_${cards[2].value}.png", "playerTotal": ${cardValues}, "dealerTotal": ${findDealerTotal()}, "casinoToken": "${casinoToken}", "aces": ${numOfAces}}`);
});

app.get('/api/casino/blackjack/newCard', apiCheckAuth, function(req, res) {
  //shh, tell nobody that there are no aces here
  const possibleCards = [{"value":2,"suit":"h"},{"value":3,"suit":"h"},{"value":4,"suit":"h"},{"value":5,"suit":"h"},{"value":6,"suit":"h"},{"value":7,"suit":"h"},{"value":8,"suit":"h"},{"value":9,"suit":"h"},{"value":10,"suit":"h"},{"value":"J","suit":"h"},{"value":"Q","suit":"h"},{"value":"K","suit":"h"},{"value":2,"suit":"d"},{"value":3,"suit":"d"},{"value":4,"suit":"d"},{"value":5,"suit":"d"},{"value":6,"suit":"d"},{"value":7,"suit":"d"},{"value":8,"suit":"d"},{"value":9,"suit":"d"},{"value":10,"suit":"d"},{"value":"J","suit":"d"},{"value":"Q","suit":"d"},{"value":"K","suit":"d"},{"value":2,"suit":"s"},{"value":3,"suit":"s"},{"value":4,"suit":"s"},{"value":5,"suit":"s"},{"value":6,"suit":"s"},{"value":7,"suit":"s"},{"value":8,"suit":"s"},{"value":9,"suit":"s"},{"value":10,"suit":"s"},{"value":"J","suit":"s"},{"value":"Q","suit":"s"},{"value":"K","suit":"s"},{"value":2,"suit":"c"},{"value":3,"suit":"c"},{"value":4,"suit":"c"},{"value":5,"suit":"c"},{"value":6,"suit":"c"},{"value":7,"suit":"c"},{"value":8,"suit":"c"},{"value":9,"suit":"c"},{"value":10,"suit":"c"},{"value":"J","suit":"c"},{"value":"Q","suit":"c"},{"value":"K","suit":"c"}]
  var cards = [];
  var cardValue = 0;
  cards.push(possibleCards[Math.floor(Math.random() * 47)])
  if (typeof(cards[0].value) !== "number") {cardValue = 10} else {cardValue = cards[0].value}
  res.status(200).json(`{"card": "card-${cards[0].suit}_${cards[0].value}.png", "cardValue": ${cardValue}}`);
});

app.get('/api/casino/blackjack/stand/:casinoToken/:playerTotal/:dealerCard', apiCheckAuth, function(req, res) {
  if (req.params.casinoToken == casinoToken) {
    const possibleCards = [{"value":"A","suit":"h"},{"value":2,"suit":"h"},{"value":3,"suit":"h"},{"value":4,"suit":"h"},{"value":5,"suit":"h"},{"value":6,"suit":"h"},{"value":7,"suit":"h"},{"value":8,"suit":"h"},{"value":9,"suit":"h"},{"value":10,"suit":"h"},{"value":"J","suit":"h"},{"value":"Q","suit":"h"},{"value":"K","suit":"h"},{"value":"A","suit":"d"},{"value":2,"suit":"d"},{"value":3,"suit":"d"},{"value":4,"suit":"d"},{"value":5,"suit":"d"},{"value":6,"suit":"d"},{"value":7,"suit":"d"},{"value":8,"suit":"d"},{"value":9,"suit":"d"},{"value":10,"suit":"d"},{"value":"J","suit":"d"},{"value":"Q","suit":"d"},{"value":"K","suit":"d"},{"value":"A","suit":"s"},{"value":2,"suit":"s"},{"value":3,"suit":"s"},{"value":4,"suit":"s"},{"value":5,"suit":"s"},{"value":6,"suit":"s"},{"value":7,"suit":"s"},{"value":8,"suit":"s"},{"value":9,"suit":"s"},{"value":10,"suit":"s"},{"value":"J","suit":"s"},{"value":"Q","suit":"s"},{"value":"K","suit":"s"},{"value":"A","suit":"c"},{"value":2,"suit":"c"},{"value":3,"suit":"c"},{"value":4,"suit":"c"},{"value":5,"suit":"c"},{"value":6,"suit":"c"},{"value":7,"suit":"c"},{"value":8,"suit":"c"},{"value":9,"suit":"c"},{"value":10,"suit":"c"},{"value":"J","suit":"c"},{"value":"Q","suit":"c"},{"value":"K","suit":"c"}]
    if (((possibleCards[Math.floor(Math.random() * 51)].value) + Number(req.params.dealerCard)) < Number(req.params.playerTotal)) {
      if (req.params.playerTotal < 21) {
        let pointStmt = `UPDATE scouts SET score = score + 20 WHERE discordID=?`;
        let pointValues = [req.user.id];
        db.run(pointStmt, pointValues, (err) => {
          if (err) {
            res.status(500).send("got an error from transaction");
            return;
          }
        });
        res.status(200).json(`{"result": "win"}`);
      } else {
        res.send("you pig")
      }
    } else {
      res.status(200).json(`{"result": "loss"}`);
    }
  } else {
    res.send("you pig")
  }
});

app.get('/api/casino/blackjack/:cval/:casinoToken/wonViaBlackjack', apiCheckAuth, function(req, res) {
  if (req.params.cval == 21 && req.params.casinoToken == casinoToken) {
    let pointStmt = `UPDATE scouts SET score = score + 20 WHERE discordID=?`;
    let pointValues = [req.user.id];
    db.run(pointStmt, pointValues, (err) => {
      if (err) {
        res.status(500).send("got an error from transaction");
        return;
      }
    });
  } else {
    res.send("you pig")
  }
});
//end blackjack API

app.get('/api/casino/spinner/spinWheel', apiCheckAuth, checkGamble, function(req, res) {
    //12 spins
    const spins = [10, 20, 50, -15, -25, -35, -100, -50, 100, 250, -1000, 1250]

    //weighting (you didnt think this was fair, did you??)
    var spin = Math.floor(Math.random() * 12);
    for (var i = 0; i < 2; i++) {
      if (spin >= 8) {
        spin = Math.floor(Math.random() * 12);
        if (spin >= 9) {
          spin = Math.floor(Math.random() * 12)
          if (spin >= 10) {
            spin = Math.floor(Math.random() * 12)
          }
        }
      }
    }

    let pointStmt = `UPDATE scouts SET score = score + ? WHERE discordID=?`;
    let pointValues = [spins[spin], req.user.id];
    db.run(pointStmt, pointValues, (err) => {
      if (err) {
        res.status(500).send("got an error from transaction");
        return;
      }
    });

    res.status(200).json(`{"spin": ${spin}}`);
});

app.get('/api/events/:event/teams', apiCheckAuth, function(req, res) {
  var dbody = new EventEmitter();
  var options = {
      'method': 'GET',
      'hostname': 'frc-api.firstinspires.org',
      'path': `/v3.0/${season}/teams?eventCode=${req.params.event}`,
      'headers': {
          'Authorization': 'Basic ' + frcapi
      },
      'maxRedirects': 20
  };

  var request = https.request(options, function(response) {
      var chunks = [];

      response.on("data", function(chunk) {
          chunks.push(chunk);
      });

      response.on("end", function(chunk) {
          var body = Buffer.concat(chunks);
          data = body;
          dbody.emit('update');
      });

      response.on("error", function(error) {
          console.error(error);
      });
  });
  request.end();
  dbody.on('update', function() {
      if (invalidJSON(data)) {res.status(500).send('error! invalid data')} else {
        const parsedData = JSON.parse(data);
        var teams = [];
        for (var i = 0; i < parsedData.teams.length; i++) {
          teams.push(parsedData.teams[i].teamNumber);
        }
        res.status(200).setHeader('Content-type','text/plain').send(teams.toString())
      }
  });
});

app.get('/api/events/:event/allTeamData', apiCheckAuth, function(req, res) {
  var dbody = new EventEmitter();
  var options = {
      'method': 'GET',
      'hostname': 'frc-api.firstinspires.org',
      'path': `/v3.0/${season}/teams?eventCode=${req.params.event}`,
      'headers': {
          'Authorization': 'Basic ' + frcapi
      },
      'maxRedirects': 20
  };

  var request = https.request(options, function(response) {
      var chunks = [];

      response.on("data", function(chunk) {
          chunks.push(chunk);
      });

      response.on("end", function(chunk) {
          var body = Buffer.concat(chunks);
          data = body;
          dbody.emit('update');
      });

      response.on("error", function(error) {
          console.error(error);
      });
  });
  request.end();
  dbody.on('update', function() {
      if (invalidJSON(data)) {res.status(500).send('error! invalid data')} else {
        res.status(200).json(JSON.parse(data))
      }
  });
});

app.get('/api/events/current/allData', apiCheckAuth, function(req, res) {
  var dbody = new EventEmitter();
  var options = {
      'method': 'GET',
      'hostname': 'frc-api.firstinspires.org',
      'path': `/v3.0/${season}/teams?eventCode=${currentComp}`,
      'headers': {
          'Authorization': 'Basic ' + frcapi
      },
      'maxRedirects': 20
  };

  var request = https.request(options, function(response) {
      var chunks = [];

      response.on("data", function(chunk) {
          chunks.push(chunk);
      });

      response.on("end", function(chunk) {
          var body = Buffer.concat(chunks);
          data = body;
          dbody.emit('update');
      });

      response.on("error", function(error) {
          console.error(error);
      });
  });
  request.end();
  dbody.on('update', function() {
      if (invalidJSON(data)) {res.status(500).send('error! invalid data')} else {
        res.status(200).json(JSON.parse(data))
      }
  });
});

app.get('/api/events/:event/pitscoutedteams', apiCheckAuth, function(req, res) {
  var teams = [];
  const stmt = `SELECT * FROM pit WHERE event=? AND season=?`;
  const values = [req.params.event, season];
  db.all(stmt, values, (err, dbQueryResult) => {
    if (err) {
      res.status(500).send("error!")
      return;
    } else {
      if (typeof dbQueryResult == "undefined") {
        res.status(500).send("fail")
        return;
      } else {
        for (var i = 0; i < dbQueryResult.length; i++) {
          teams.push(dbQueryResult[i].team);
        }
        res.status(200).setHeader('Content-type','text/plain').send(teams.toString())
      }
    }
  });
});

app.get('/api/notes/:event/:team/getNotes', checkAuth, function(req, res) {
  const stmt = `SELECT * FROM notes WHERE event=? AND season=? AND team=?`;
  const values = [req.params.event, season, req.params.team];
  db.get(stmt, values, (err, dbQueryResult) => {
    if (err) {
      res.status(403).setHeader('Content-type','text/plain').send("none");
      return;
    } else {
      if (typeof dbQueryResult == "undefined") {
        res.status(403).setHeader('Content-type','text/plain').send("none")
        return;
      } else {
        res.status(200).setHeader('Content-type','text/plain').send(dbQueryResult.note)
      }
    }
  });
});

app.get('/api/notes/:event/:team/createNote', checkAuth, function(req, res) {
  db.run(`INSERT INTO notes (team, season, event, note) VALUES(${req.params.team}, ${season}, "${req.params.event}", 'no note yet')`, function(err) {
    if (err) {
      res.status(500).send('500')
    } else {
      res.status(200).send('200')
    }
  });
});


app.post('/api/notes/:event/:team/updateNotes', apiCheckAuth, function(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    let newNote = qs.parse(body);
    var teams = [];
    const stmt = `UPDATE notes SET note=? WHERE event=? AND season=? AND team=?`;
    const values = [newNote.save, req.params.event, season, req.params.team];
    db.run(stmt, values, (err) => {
      if (err) {
        res.status(500).send("error!")
        return;
      } else {
        res.status(200).send("200")
      }
    });
  });
});

app.get('/api/teams/teamdata/:team', apiCheckAuth, function(req, res) {
  var dbody = new EventEmitter();
  var options = {
      'method': 'GET',
      'hostname': 'frc-api.firstinspires.org',
      'path': `/v3.0/${season}/teams?teamNumber=${req.params.team}`,
      'headers': {
          'Authorization': 'Basic ' + frcapi
      },
      'maxRedirects': 20
  };

  var request = https.request(options, function(response) {
      var chunks = [];

      response.on("data", function(chunk) {
          chunks.push(chunk);
      });

      response.on("end", function(chunk) {
          var body = Buffer.concat(chunks);
          data = body;
          dbody.emit('update');
      });

      response.on("error", function(error) {
          console.error(error);
      });
  });
  request.end();
  dbody.on('update', function() {
      if (invalidJSON(data)) {res.status(500).send('error! invalid data')} else {
        res.status(200).json(JSON.parse(data))
      }
  });
});

//auth functions
app.get('/', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) {
    res.redirect('/');
});

//not requiring auth for offline version, you cannot submit with this and submit url is secured anyway
app.get('/offline.html', function(req, res) {
  res.sendFile('src/offline.html', { root: __dirname })
});

// deepcode ignore HttpToHttps: ignoring because it is used only to redirect requests to HTTPS, deepcode ignore OR: ignored because it is redirecting to HTTPS, deepcode ignore OR: <please specify a reason of ignoring this>
if (certsizes.key <= 100 || certsizes.cert <= 100) {app.listen(80)} else {const httpRedirect = express(); httpRedirect.all('*', (req, res) => res.redirect(`https://${req.hostname}${req.url}`)); const httpServer = http.createServer(httpRedirect); httpServer.listen(80, () => logInfo(`HTTP server listening: http://localhost`));}

//server created and ready for a request
logInfo("Ready!");