"use strict";

var Msg = require("../../models/msg");

exports.commands = ["awaytty"];

exports.input = function(network, chan, cmd, args) {
	if (network.irc.connection.connected) {
		
		// Set some defaults
		if (!network.awayForward) {
			network.awayForward = {target:null,cooldown:{}};
		}
		
		// Supplied with an argument?
		if (args.length > 0) {
			// Are we already forwarding to that user?
			if (network.awayForward.target != null && (args[0].toLowerCase() === network.awayForward.target.toLowerCase())) {
				chan.pushMessage(this, new Msg({
					type: Msg.Type.ERROR,
					text: `You're already forwarding messages to ${network.awayForward.target}!`
				}));

			} else {
				chan.pushMessage(this, new Msg({
					type: Msg.Type.MESSAGE,
					text: `Noted! I'll try and forward messages to ${args[0]}!`
				}));
				console.log(network.awayForward);
				network.awayForward.target = args[0];
				network.irc.raw("AWAY", `I'm busy right now, please contact ${args[0]} instead.`);
			}
		} else {
			// Default. Toggle else notify.
			if (network.awayForward.target != null) {
				chan.pushMessage(this, new Msg({
					type: Msg.Type.MESSAGE,
					text: `You're back! I'll no longer forward messages to ${network.awayForward.target}.`
				}));
				network.awayForward.target = null;
				network.irc.raw("AWAY");
			} else {
				chan.pushMessage(this, new Msg({
					type: Msg.Type.ERROR,
					text: `You don't currently have a forwarder setup.`
				}));
			}
		}
	} else {
		// Not connected, let them know forwarders are useless without it!
		chan.pushMessage(this, new Msg({
			type: Msg.Type.ERROR,
			text: "You need to be connected to set your forwarder!"
		}));
		return;
	}
};
