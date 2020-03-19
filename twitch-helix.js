const twitch = require('twitch-helix-api');
const EventEmitter = require('events');
const config = require('./config');
const streamEmitter = new EventEmitter();
let startup = false;
twitch.clientID = config["twitch-client-id"];
let streams = { };

function getGameName(game_id) {
  twitch.games.getGames({
    "game_id": game_id
  }).then((data) => {
	let res = data;  
    console.log("Game Data: " + res.name);
    if (data.size > 0) {
	  let res = data[0]["name"];
      return res;
    }
    return "";
  })
}

function streamLoop () {
  // Uncomment for logging.
  console.log("Get streams...");
  console.log(".--current streams--.");
  console.log(streams)
  console.log("'-------------------'");
  twitch.streams.getStreams({
    "user_id": 53717309 //insert user id for stream (currently: Floha258)
  }).then((data) => {
    let res = data.response.data;
    let user_ids = [ ];
    for (let stream of res) {
      user_ids.push(stream["user_id"]);
      if (typeof streams[stream["user_id"]] === 'undefined') {
        streams[stream["user_id"]] = { };
      }
      streams[stream["user_id"]]["timer"] = 15;
      streams[stream["user_id"]]["title"] = stream["title"];
      streams[stream["user_id"]]["viewer_count"] = stream["viewer_count"];
      streams[stream["user_id"]]["game_id"] = stream["game_id"]
    }
    if (user_ids.length > 0) {
      return twitch.users.getUsers({
        "id": user_ids
      });
    }
    return null;
  }).then((data) => {
    if (data === null) {
      return;
    }
    let res = data.response.data;
    for (let stream of res) {
      if (typeof streams[stream["id"]]["url"] === 'undefined') {
        if (startup === true) {
		  console.log('emit message');
          streamEmitter.emit('messageStreamStarted', {
            "url": 'https://www.twitch.tv/floha258',
            "name": "Floha258",
            "title": streams[stream["id"]]["title"],
            "game": getGameName(streams[stream["id"]]["game_id"]),
            // "id": stream["id"],
            // "display_name": stream["display_name"],
            // "login": stream["login"]
          });
        }
      }
      streams[stream["id"]]["url"] = 'https://www.twitch.tv/' + stream["login"];
      streams[stream["id"]]["display_name"] = stream["display_name"];
      streams[stream["id"]]["login"] = stream["login"];
	  console.log(streams[stream["id"]]);
    }
    return;
  }).catch((e) => {
    console.error(e);
  }).then(() => {
    if (startup === false) {
      startup = true;
    }
    setTimeout(streamLoop, 30000);
  });
}
setTimeout(streamLoop, 15000);
setInterval(() => {
  for (let stream of Object.keys(streams)) {
    streams[stream]["timer"]--;
    if (streams[stream]["timer"] < 1) {
      if (typeof streams[stream]["url"] !== 'undefined' && typeof streams[stream]["title"] !== 'undefined') {
        streamEmitter.emit('messageStreamDeleted', {
          "url": streams[stream]["url"],
          "title": streams[stream]["title"],
          "id": stream
        });
      }
      delete streams[stream];
    }
  }
}, 20000);
streamEmitter.getStreams = () => {
  return streams;
}
module.exports = streamEmitter;
