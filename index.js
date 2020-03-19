const Discord = require('discord.js');
const discordClient = new Discord.Client();
const twitch = require('./twitch-helix');
const config = require('./config');
class DiscordChannel {
  constructor (id) {
    this.id = id;
  }
  send (msg) {
    return new Promise ((resolve, reject) => {
      if (discordClient.ws.connection !== null && discordClient.status === 0) {
        let channel = discordClient.channels.get(this.id);
        if (typeof channel !== 'undefined') {
          resolve(channel.send(msg));
        } else {
          reject('Failed to send discord message (Discord connection open, but channel not found.');
        }
      } else {
        reject('Failed to send discord message (Discord connection not open)');
      }
    });
  }
}
const responseDiscordChannel = new DiscordChannel(config['discord-response-channel-id']);
const notifyDiscordChannel = new DiscordChannel(config['discord-notifications-channel-id']);
const colorDiscordChannel = new DiscordChannel(config['discord-colors-channel-id']);

setTimeout(() => {
  console.log("Logging in to discord...");
  discordClient.login(config["discord-token"]).then(() => {
    console.log("Discord login success");
  }).catch((e) => {
    console.log("Discord login failure");
    console.log(e);
  });
}, 5000);
twitch.on('messageStreamStarted', (stream) => {

  /*discordClient.user.setPresence({
    "status": 'online',
    "game": {
      "name": stream.game ? stream.game : config['bot-currently-playing'],
      "type": "streaming",
      "url": "https://www.twitch.tv/floha258"
    }
  }).catch(failToSet('presence'));*/

  let channel = discordClient.channels.get(config['discord-notifications-channel-id']); 
  var postDate = JSON.parse(JSON.stringify(new Date()));
  const embed = {
    "title": stream.url + " just went live: " + stream.title,
    "url": stream.url,
    "color": 1369976,
    "timestamp": postDate,
    "footer": {
      "icon_url": "https://cdn.discordapp.com/attachments/214064539187019776/341593001023504387/floha2cool112.png",
      "text": "Streaming " + stream.game
    },
    "thumbnail": {
      "url": "https://static-cdn.jtvnw.net/jtv_user_pictures/89f9dd62-793c-479c-bbab-19070ec85cad-profile_image-300x300.png"
    },
    "author": {
      "name": "Floha258 is now live on Twitch!",
      "url": stream.url,
      "icon_url": "https://cdn.discordapp.com/attachments/214064539187019776/341593001023504387/floha2cool112.png"
    }
  };
  channel.send({ embed }).catch((e) => {
    console.log(e);
  });
});
twitch.on('messageStreamDeleted', (stream) => {
  console.log (stream.url + " went offline");
  let channel = discordClient.channels.get(config['discord-notifications-channel-id']); 
  channel.fetchMessages({limit: 30})
    .then(messages => messages.forEach(message => {
     if ((message.embeds) && (message.embeds.length >0)) {
        if (message.embeds[0].message.embeds[0].url == stream.url) {
          message.delete();
          console.log(message.id + " live message deleted!");

          discordClient.user.setPresence({
            "status": 'online',
            "game": {
              "name": config['bot-currently-playing'],
              "url": "https://www.twitch.tv/floha258"
            }
          }).catch(failToSet('presence'));

        }
      }
      /*if (message.content.includes(stream.url))
      message.delete();*/
      
    }))
    .catch(console.error);
});
discordClient.on('ready', () => {
  function failToSet(setting) {return (e) => {
    console.log('Failed to set ' + setting);
    console.log(e);
  }}
  discordClient.user.setPresence({
    "status": 'online',
    "game": {
      "name": config['bot-currently-playing'],
      "url": "https://www.twitch.tv/floha258"
    }
  }).catch(failToSet('presence'));
});
function toWeirdCase (pattern, str) {
  return str.split('').map((v, i) => pattern[i%7+1] === pattern[i%7+1].toLowerCase() ? v.toLowerCase() : v.toUpperCase()).join('');
}
discordClient.on('message', (message) => {
  let streamCommandRegex = /^(\.|!)streams$/i;
  let streamNotCased = /^(\.|!)streams$/;
  let channel = discordClient.channels.get(config['discord-notifications-channel-id']);
  let clearCommand = /^(\.|!)clear$/;
  if (message.channel.id === responseDiscordChannel.id && clearCommand.test(message.content)) {
    _clearChat(message.channel.id);
    return;
  }
  if (message.channel.id === responseDiscordChannel.id && streamCommandRegex.test(message.content)) {
    let applyWeirdCase = !streamNotCased.test(message.content);
    let streams = twitch.getStreams();
    let nobodyStreaming = 'Nobody is streaming.';
    let unknownStreaming = 'At least 1 person is streaming. I\'ll push notification(s) after I finish gathering data.';
    if (applyWeirdCase) {
      nobodyStreaming = toWeirdCase(message.content, nobodyStreaming);
      unknownStreaming = toWeirdCase(message.content, unknownStreaming);
    }
    if (Object.keys(streams).length === 0) {
      message.channel.send(nobodyStreaming);
    } else {
      let streamsString = '';
      for (let stream of Object.keys(streams)) {
        let streamTitle = streams[stream]["title"];
        if (applyWeirdCase) {
          streamTitle = toWeirdCase(message.content, streamTitle);
        }
        if (typeof streams[stream]["login"] !== 'undefined') {
          streamsString += '<' + streams[stream]["url"] + '> - ' + streamTitle + '\n';
        }
      }
      if (streamsString === '') {
        message.channel.send(unknownStreaming);
      } else {
        streamsString = streamsString.slice(0, -1);
        message.channel.send(streamsString);
      }
    }
  }
});

function _clearChat(textChannelID) {
	let channel = discordClient.channels.get(textChannelID);

	console.log("Fetch messages from " + channel.id);

	channel.fetchMessages({ limit: 99 })
		.then(messages => {
			if (messages.size > 2) {
				channel.bulkDelete(messages, false)
					.then(() => {

						console.log("Removed " + messages.size + " messages");

						_clearChat(textChannelID);
					});
			}
			else if (messages.size > 0) {

				console.log("Remove final " + messages.size + " messages");

				Array.from(messages.values()).forEach(message => {

					message.delete();
				});
			}
			else {
				console.log("No more messages left");
			}
		})
		.catch(error => console.log(error));
}