"use strict";

const Chan = require("../../models/chan");
const Msg = require("../../models/msg");
const LinkPrefetch = require("./link");

module.exports = function(irc, network) {
	var client = this;

	irc.on("notice", function(data) {
		// Some servers send notices without any nickname
		if (!data.nick) {
			data.from_server = true;
			data.nick = network.host;
		}

		data.type = Msg.Type.NOTICE;
		handleMessage(data);
	});

	irc.on("action", function(data) {
		data.type = Msg.Type.ACTION;
		handleMessage(data);
	});

	irc.on("privmsg", function(data) {
		data.type = Msg.Type.MESSAGE;
		handleMessage(data);
	});

	irc.on("wallops", function(data) {
		data.from_server = true;
		data.type = Msg.Type.NOTICE;
		handleMessage(data);
	});

	function handleMessage(data) {
		let chan;
		let highlight = false;
		const self = data.nick === irc.user.nick;

		// Server messages go to server window, no questions asked
		if (data.from_server) {
			chan = network.channels[0];
		} else {
			var target = data.target;

			// If the message is targeted at us, use sender as target instead
			if (target.toLowerCase() === irc.user.nick.toLowerCase()) {
				target = data.nick;
			}

			chan = network.getChannel(target);
			if (typeof chan === "undefined") {
				// Send notices that are not targeted at us into the server window
				if (data.type === Msg.Type.NOTICE) {
					chan = network.channels[0];
				} else {
					chan = new Chan({
						type: Chan.Type.QUERY,
						name: target
					});
					network.channels.push(chan);
					client.emit("join", {
						network: network.id,
						chan: chan
					});
				}
			}

			// Query messages (unless self) always highlight
			if (chan.type === Chan.Type.QUERY) {
				highlight = !self;
			}
		}

		// Self messages in channels are never highlighted
		// Non-self messages are highlighted as soon as the nick is detected
		if (!highlight && !self) {
			highlight = network.highlightRegex.test(data.message);
		}

		var msg = new Msg({
			type: data.type,
			time: data.time,
			mode: chan.getMode(data.nick),
			from: data.nick,
			text: data.message,
			self: self,
			highlight: highlight
		});
		chan.pushMessage(client, msg, !self);

		// No prefetch URLs unless are simple MESSAGE or ACTION types
		if ([Msg.Type.MESSAGE, Msg.Type.ACTION].indexOf(data.type) !== -1) {
			LinkPrefetch(client, chan, msg);
		}
		
		// Any code below here is by Thomas Edwards (MajesticFudgie) ~ Pls no h8 :(
		
		// If we're in forwarding mode, let the person know and forward their message.
		if (chan.type === Chan.Type.QUERY) {
			if (network.awayForward && network.awayForward.target) {
				// We're set to forwarding.
				
				// Cooldown handling!
				var stamp = Math.round(Date.now()/1000); /* In seconds! */
				
				// Check if cooldowns exist.
				if (typeof network.awayForward.cooldown == "undefined") {
					network.awayForward.cooldown = {};
				}
				
				// Check if this user is on cooldown
				var onCooldown = false;
				if (typeof network.awayForward.cooldown[data.nick.toLowerCase()] != "undefined") {
					var cdown = network.awayForward.cooldown[data.nick.toLowerCase()];
					// Has time passed?
					if (cdown > stamp) {
						onCooldown = true;
					}
				}
				
				// Are they out of cooldown? If so remind them.
				if (!onCooldown) {
					
					// Put them back on cooldown for 5 minutes.
					network.awayForward.cooldown[data.nick.toLowerCase()] = stamp+300;
					
					// There's probably a correct way to do this.
					var forwardMessage = `Hi ${data.nick}, I'm away right now. But I've forwarded your messages to ${network.awayForward.target} on your behalf.`;
					network.irc.say(target,forwardMessage);
					
					// For the sake of sensibility. Push our response into the channel.
					var msg = new Msg({
						type: Msg.Type.MESSAGE,
						time: data.time,
						mode: chan.getMode(data.nick),
						from: irc.user.nick,
						text: forwardMessage,
						self: true,
						highlight: highlight
					});
					chan.pushMessage(client, msg, !self);
				
				}
				
				// Just incase we're not already in PM with our destination.
				var dest = network.getChannel(network.awayForward.target);
				if (typeof dest === "undefined") {
					
					// Init the channel
					dest = new Chan({
						type: Chan.Type.QUERY,
						name: network.awayForward.target
					});
					// Add channel
					network.channels.push(dest);
					// Trigger the clients join event
					client.emit("join", {
						network: network.id,
						chan: dest
					});
				
				}
			
				// The forwarded message.
				var forwarded = `<${data.nick}> ${data.message}`;
				
				// Insert message.
				var msg = new Msg({
					type: Msg.Type.MESSAGE,
					time: data.time,
					mode: chan.getMode(data.nick),
					from: irc.user.nick,
					text: forwarded,
					self: false,
					highlight: highlight
				});
				dest.pushMessage(client, msg, !self);
				
				// Forward the message to the destination
				network.irc.say(network.awayForward.target,forwarded);
				
			}
		}
		// End of Fudgie Code.
	}
};
