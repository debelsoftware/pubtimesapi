const express = require('express');
const bodyParser = require('body-parser');
const editJsonFile = require("edit-json-file");
const app = express();

let file = editJsonFile('./users.json', {
    autosave: true
});

app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/status', getStatus);
app.post('/users', getUsers);
app.post('/lastpub', getLastPub);
app.post('/drink', setDrink);
app.post('/auth', authenticateUser);
app.post('/updatepass', updatePass);

function findUserID(username){
  for (i=0; i<file.get("users").length; i++){
    if (file.get("users."+i+".username") == username){
      return i;
    }
  }
  return "not found"
}

function validate(data){
  if (data == "" || data == null || data.length > 35){
    return false;
  }
  else {
    return true;
  }
}

async function getStatus(req, res, next) {
  try {
    res.json({"status":"running"});
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}
async function getUsers(req, res, next) {
  try {
    if (req.body.password == file.get("users." + findUserID(req.body.username) + ".password")) {
      res.json({"status":"success","data":file.get("users")});
      console.log(new Date().toLocaleString(),"Getting users");
    }
    else {
      res.json({"status":"fail"});
      console.log(new Date().toLocaleString(),"unauthorised attempt to get users with username:", req.body.username)
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

async function getLastPub(req, res, next) {
  try {
    if (req.body.password == file.get("users." + findUserID(req.body.username) + ".password")) {
      res.json({"status":"success","data":file.get("global.lastPub")});
      console.log(new Date().toLocaleString(),"Getting last pub");
    }
    else {
      res.json({"status":"fail"});
      console.log(new Date().toLocaleString(),"unauthorised attempt to get last pub with username:", req.body.username)
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

function authenticateUser(req, res, next) {
  try {
    if (req.body.password == file.get("users." + findUserID(req.body.username) + ".password")) {
      res.json({"status":"success","data": "authenticated"});
      console.log(new Date().toLocaleString(),req.body.username,"has been authenticated");
    }
    else {
      res.json({"status":"fail"});
      console.log(new Date().toLocaleString(),"authentication failed with username:", req.body.username)
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

function setDrink(req, res, next) {
  try {
    if (req.body.password == file.get("users." + findUserID(req.body.username) + ".password")) {
      if (validate(req.body.drink) == true){
        file.set("users." + findUserID(req.body.username) +".drink", req.body.drink);
        res.json({"status": "success"});
        console.log(new Date().toLocaleString(),req.body.username,"changed their drink to",file.get("users." + findUserID(req.body.username) +".drink"));
      }
      else {
        res.json({"status":"fail"});
        console.log(new Date().toLocaleString(),req.body.username + "'s data did not pass validation'")
      }
    }
    else {
      res.json({"status":"fail"});
      console.log(new Date().toLocaleString(),"unauthorised drink change attempted with username:", req.body.username)
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

function updatePass(req, res, next){
  try{
    if (req.body.password == file.get("users." + findUserID(req.body.username) + ".password")) {
      if (validate(req.body.newPassword) == true){
        file.set("users." + findUserID(req.body.username) +".password", req.body.newPassword);
        res.json({"status": "success"});
        console.log(new Date().toLocaleString(),req.body.username,"changed their password");
      }
      else {
        res.json({"status":"fail"});
        console.log(new Date().toLocaleString(),req.body.username + "'s new password did not pass validation")
      }
    }
    else {
      res.json({"status":"fail"});
      console.log(new Date().toLocaleString(),"unauthorised password change attempted with username:", req.body.username)
    }
  }
  catch (e) {
  console.error(e);
  res.sendStatus(500);
  }
}

app.listen(3000);
console.log('API running on port 3000');
