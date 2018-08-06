const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const editJsonFile = require("edit-json-file");
const mysql = require('mysql');
const app = express();
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client('359401561210-5c1jiugiu8mfft88hsl1vcj5ule3h53e.apps.googleusercontent.com');
const options = {
    cert: fs.readFileSync('./sslcert/fullchain.pem'),
    key: fs.readFileSync('./sslcert/privkey.pem')
};

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "database130899"
});

con.connect(function(err) {
  if (err) {
    console.log(err);
  }
  console.log("Connected to database");
});

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
app.post('/updateUsername', setUsername);
app.post('/updateDistance', setDistance);
app.post('/setGroup', setGroup);
app.post('/createGroup', createGroup);

async function verify(token) {
  try{
    var ticket = await client.verifyIdToken({
        idToken: token,
        audience: '359401561210-5c1jiugiu8mfft88hsl1vcj5ule3h53e.apps.googleusercontent.com',
    });
    var payload = ticket.getPayload();
    var userid = payload['sub'];
    var profilePic = payload['picture'];
    var name = payload['name']
    return [userid, profilePic, name];
  }
  catch(e){
    return "error"
  }
}

async function findUserID(username){
  var data = file.get("users");
  var googleData = await verify(username);
  if (googleData != "error"){
    var found = false;
    var index = 0;
    while (!found && index < data.length){
      if (googleData[0] == data[index]["googleID"]){
        return index;
      }
      index++;
    }
    return "not found"
  }
  else {
    return "not found"
  }
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
    var googleData = await verify(req.body.token);
    con.query("SELECT `groupid` FROM `pub`.`user` WHERE googleid = '"+googleData[0]+"'", function (err, result) {
       if (result.hasOwnProperty(0)){
         if (result[0].groupid != null){
           con.query("SELECT * FROM `pub`.`user` WHERE groupid = '"+result[0].groupid+"'", function (err, result) {
             res.json({"status":"success","data": result});
             console.log(new Date().toLocaleString(),"Getting users");
           });
         }
         else {
           res.sendStatus(500);
           console.log(new Date().toLocaleString(),"Error getting users");
         }
       }
       else{
         res.sendStatus(500);
         console.log(new Date().toLocaleString(),"Server received invalid token");
       }
     });
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

async function getLastPub(req, res, next) {
  try {
    var googleData = await verify(req.body.token);
    con.query("SELECT `groupid` FROM `pub`.`user` WHERE googleid = '"+googleData[0]+"'", function (err, result) {
       if (result.hasOwnProperty(0)){
         if (result[0].groupid != null){
           con.query("SELECT * FROM `pub`.`group` WHERE groupid = '"+result[0].groupid+"'", function (err, result) {
             res.json({"status":"success","data": result[0].lastpub});
             console.log(new Date().toLocaleString(),"Getting users");
           });
         }
         else {
           res.sendStatus(500);
           console.log(new Date().toLocaleString(),"Error getting last pub");
         }
       }
       else{
         res.sendStatus(500);
         console.log(new Date().toLocaleString(),"Server received invalid token");
       }
     });
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

async function authenticateUser(req, res, next) {
  try {
    var googleData = await verify(req.body.token);
    con.query("SELECT `username`,`groupid` FROM `pub`.`user` WHERE googleid = '"+googleData[0]+"'", function (err, result) {
       if (result.hasOwnProperty(0)){
         if (result[0].groupid != null){
           res.json({"status":"success","data": "auth"});
           console.log(new Date().toLocaleString(),"user",result[0].username,"logged in");
         }
         else {
           res.json({"status":"success","data": "nogroup"});
           console.log(new Date().toLocaleString(),"user",result[0].username,"logged in but has no group");
         }

       }
       else if (googleData[0] == "e"){
         res.sendStatus(500);
         console.log(new Date().toLocaleString(),"Server received invalid token");
       }
       else{
         con.query("INSERT INTO `pub`.`user` (`googleid`, `groupid`, `username`, `drink`, `distance`, `lastpub`, `profilepic`) VALUES ('"+googleData[0]+"', NULL, '"+googleData[2]+"', 'Not specified', 0, 0, '"+googleData[1]+"');", function (err, result) {
           if (err) {
             console.log(new Date().toLocaleString(),err);
             res.sendStatus(500);
           }
           else {
             console.log(new Date().toLocaleString(),"New User Added");
             res.json({"status":"success","data": "authnew"});
           }
         });
       }
    });
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

async function setDrink(req, res, next) {
  try {
    var googleData = await verify(req.body.token);
    if (validate(req.body.drink) == true){
      if (googleData[0] != "e"){
        con.query("UPDATE `pub`.`user` SET drink = '"+req.body.drink+"' WHERE googleID ='"+googleData[0]+"'", function (err, result) {
          if (err) {
            console.log(new Date().toLocaleString(),err);
            res.sendStatus(500);
          }
          else {
            res.json({"status": "success"});
            console.log(new Date().toLocaleString(),googleData[2],"changed their drink");
          }
        });
      }
      else{
        res.sendStatus(500);
        console.log(new Date().toLocaleString(),"Server received invalid token");
      }
    }
    else {
      res.sendStatus(500);
      console.log(new Date().toLocaleString(), "data did not pass validation'")
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

async function setUsername(req, res, next) {
  try {
    var googleData = await verify(req.body.token);
    if (validate(req.body.newUsername) == true){
      if (googleData[0] != "e"){
        con.query("UPDATE `pub`.`user` SET username = '"+req.body.newUsername+"' WHERE googleID ='"+googleData[0]+"'", function (err, result) {
          if (err) {
            console.log(new Date().toLocaleString(),err);
            res.sendStatus(500);
          }
          else {
            res.json({"status": "success"});
            console.log(new Date().toLocaleString(),googleData[2],"changed their username");
          }
        });
      }
      else {
        res.sendStatus(500);
        console.log(new Date().toLocaleString(),"Server received invalid token");
      }
    }
    else {
      res.sendStatus(500);
      console.log(new Date().toLocaleString(), "data did not pass validation'")
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

async function setDistance(req, res, next) {
  try {
    var googleData = await verify(req.body.token);
    if (req.body.newDistance < 1000 && req.body.newDistance != "" && req.body.newDistance >= 0 && req.body.newDistance != null){
      if (googleData[0] != "e"){
        con.query("UPDATE `pub`.`user` SET distance = '"+req.body.newDistance+"' WHERE googleID ='"+googleData[0]+"'", function (err, result) {
          if (err) {
            console.log(new Date().toLocaleString(),err);
            res.sendStatus(500);
          }
          else {
            res.json({"status": "success"});
            console.log(new Date().toLocaleString(),googleData[2],"changed their distance");
          }
        });
      }
      else {
        res.sendStatus(500);
        console.log(new Date().toLocaleString(),"Server received invalid token");
      }
    }
    else {
      res.sendStatus(500);
      console.log(new Date().toLocaleString(), "data did not pass validation'")
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
}

async function setGroup(req, res, next){
  try{
    var googleData = await verify(req.body.token);
    con.query("SELECT * FROM `pub`.`group` WHERE groupid = '"+req.body.group+"'", function (err, result) {
       if (result.hasOwnProperty(0)){
         con.query("SELECT * FROM `pub`.`user` WHERE googleid = '"+googleData[0]+"'", function (err, result) {
           if (result.hasOwnProperty(0) && result[0].groupid == null){
             con.query("UPDATE `pub`.`user` SET groupid = '"+req.body.group+"' WHERE googleID ='"+googleData[0]+"'", function (err, result) {
               if (err) {
                 console.log(new Date().toLocaleString(),err);
                 res.sendStatus(500);
               }
               else {
                 res.json({"status": "success"});
                 console.log(new Date().toLocaleString(),googleData[2],"set their group");
               }
             });
           }
           else {
             res.sendStatus(500);
             console.log(new Date().toLocaleString(),"User tried to join a second group");
           }
         });
       }
       else if (googleData[0] == "e"){
         res.sendStatus(500);
         console.log(new Date().toLocaleString(),"Server received invalid token");
       }
       else{
         res.sendStatus(500);
         console.log(new Date().toLocaleString(),"User failed to join group that didn't exist");
       }
     });
  }
  catch(e){
    console.error(e);
    res.sendStatus(500);
  }
}

async function createGroup(req, res, next){
  try{
    var googleData = await verify(req.body.token);
    if (checkSymbols(req.body.groupid) && checkSymbols(req.body.groupname)&& (req.body.groupid).length <= 50 && (req.body.groupname).length <= 50){
      con.query("SELECT * FROM `pub`.`user` WHERE googleid = '"+googleData[0]+"'", function (err, result) {
        if (result.hasOwnProperty(0) && result[0].groupid == null){
          con.query("SELECT * FROM `pub`.`group` WHERE groupid = '"+req.body.groupid+"'", function (err, result) {
            if (!result.hasOwnProperty(0)){
              con.query("INSERT INTO `pub`.`group` (`groupid`, `groupname`, `pub`, `lastpub`) VALUES ('"+req.body.groupid+"', '"+req.body.groupname+"', 'The Placeholder Inn', 0);", function (err, result) {
                if (err) {
                  console.log(new Date().toLocaleString(),err);
                  res.sendStatus(500);
                }
                else {
                  con.query("UPDATE `pub`.`user` SET groupid = '"+req.body.groupid+"' WHERE googleID ='"+googleData[0]+"'", function (err, result) {
                    if (err) {
                      console.log(new Date().toLocaleString(),err);
                      res.sendStatus(500);
                    }
                    else {
                      res.json({"status": "success"});
                      console.log(new Date().toLocaleString(),googleData[2],"Created and joined their new group");
                    }
                  });
                }
              });
            }
            else {
              res.sendStatus(500);
              console.log(new Date().toLocaleString(),"User tried to make group that already exists");
            }
          });
        }
        else {
          res.sendStatus(500);
          console.log(new Date().toLocaleString(),"User tried to create a group while in one");
        }
      });
    }
    else {
      console.log(new Date().toLocaleString(),"Data for new group did not pass validation");
    }
  }
  catch(e){
    console.error(e);
    res.sendStatus(500);
  }
}

async function checkSymbols(text){
  var format = /^[a-zA-Z0-9- ,_]*$/;
  return format.test(text);
}

app.listen(8080);
https.createServer(options, app).listen(8443);
console.log('API running on port 8080');
