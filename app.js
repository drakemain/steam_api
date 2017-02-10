require('dotenv').config({path: './config/.env', silent: true});

var path     = require('path');
var express  = require('express');
var hbars    = require('express-handlebars');
var bparse   = require('body-parser');

var profile        = require('./src/profile');
var SteamSigError = require('./src/error');
var init = require('./src/initialize');
var checkFileExists = require('./src/validate').checkFileExists;
var validate = require('./src/validate');

var app = express();
app.use(bparse.json());
app.use(bparse.urlencoded({ extended: true }));
app.engine('handlebars', hbars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

var parsedElements = require('./assets/JSON/elements');

init();
process.env.PORT = process.env.PORT || 3000;
app.listen(process.env.PORT);
console.log("--App started listening on port", process.env.PORT + '.');

app.get('/', function(req, res) {
  if (process.env.STEAM_KEY) {
    res.redirect('/steam-id-form');
  } else {
    res.send("No steam key has been set! A steam API Key" +
      " must be set before API calls can be made.");
  }
});

app.get('/steam-id-form/', function(req, res) {
  res.render('form', {
    title: "Enter Steam ID",
    steamIDInputValue: req.query.steamid,
    elements: parsedElements
  });
});

//will be more uselfull later...
app.get('/form-handler', function(req, res) {
  validate.checkForValidID(req.query.steamid)

  .then(profile.render)

  .then(function(steamid) {
    res.redirect('/profile/' + steamid);
  })

  .catch(SteamSigError.Validation, function(err) {
    console.error(err.message);
    res.status(400).send("The name or ID doesn't seem to be associated with a Steam account.");
  })
  .catch(SteamSigError.TimeOut, function(err) {
    console.error(err.message);
    res.status(504);

    var idPos = err.uri.search('&steamids=') + 10;
    var steamid = err.uri.substr(idPos, 17);

    return checkFileExists(path.join('assets', 'profiles', steamid, 'sig.png'))
    .then(function(filePath) {
      console.log('Cached profile sent');
      res.sendFile(path.resolve(filePath));
    });
  })
  .catch(SteamSigError.FileDNE, function(err) {
    console.error(err.message);
    res.send("Your profile is not cached and Steam is not responding to requests!");
  })
  .catch(function(err) {
    console.error("An unhandled error occured.");
    console.trace(err.stack);
    
    res.status(500).send("ARG! You've destroyed everything!");
  });
});

app.get('/profile/:user', function(req, res) {
  if (validate.steamid(req.params.user)) {
    var sigPath = path.resolve(path.join('assets', 'profiles', req.params.user, 'sig.png'));

    validate.checkFileExists(sigPath)

    // update sig
    
    .then(function(newSigPath) {
      console.time('|> Retrieve file');
      res.status(200).type('png').sendFile(newSigPath);
      console.timeEnd('|> Retrieve file');
    })

    .catch(SteamSigError.FileDNE, function(err) {
      console.error(err);
      res.redirect('/steam-id-form/?steamid=' + req.params.user);
    })

    .catch(function(err) {
      console.error(err);
      res.send("An error occured while attempting to retrieve or create your profile");
    });

  } else {
    validate.checkForValidID(req.params.user)

    .then(function(steamid) {
      console.log('/profile/' + steamid);
      res.redirect('/profile/' + steamid);
    })

    .catch(SteamSigError.Validation, function(err) {
      console.error(err.message);
      res.status(400).send("The name or ID doesn't seem to be associated with a Steam account.");
    });
  }
});

app.use(function(req, res) {
  res.status(404).send("Can't find requested page.");
});