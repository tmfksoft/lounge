"use strict";

var _ = require("lodash");
var Chan = require("./chan");

module.exports = Network;

var id = 0;

function Network(attr) {
	_.defaults(this, attr, {
		name: "",
		host: "",
		port: 6667,
		tls: false,
		password: "",
		awayMessage: "",
		awayForward: null,
		commands: [],
		username: "",
		realname: "",
		channels: [],
		ip: null,
		hostname: null,
		id: id++,
		irc: null,
		serverOptions: {
			PREFIX: [],
		},
		chanCache: [],
	});

	this.name = attr.name || prettify(attr.host);
	this.channels.unshift(
		new Chan({
			name: this.name,
			type: Chan.Type.LOBBY
		})
	);
}

Network.prototype.setNick = function(nick) {
	this.nick = nick;
	this.highlightRegex = new RegExp(
		// Do not match characters and numbers (unless IRC color)
		"(?:^|[^a-z0-9]|\x03[0-9]{1,2})" +

		// Escape nickname, as it may contain regex stuff
		_.escapeRegExp(nick) +

		// Do not match characters and numbers
		"(?:[^a-z0-9]|$)",

		// Case insensitive search
		"i"
	);
};

Network.prototype.toJSON = function() {
	return _.omit(this, [
		"awayMessage",
		"chanCache",
		"highlightRegex",
		"irc",
		"password",
	]);
};

Network.prototype.export = function() {
	var network = _.pick(this, [
		"awayMessage",
		"nick",
		"name",
		"host",
		"port",
		"tls",
		"password",
		"username",
		"realname",
		"commands",
		"ip",
		"hostname"
	]);

	network.channels = this.channels
		.filter(function(channel) {
			return channel.type === Chan.Type.CHANNEL;
		})
		.map(function(chan) {
			return _.pick(chan, [
				"name"
			]);
		});

	return network;
};

Network.prototype.getChannel = function(name) {
	name = name.toLowerCase();

	return _.find(this.channels, function(that) {
		return that.name.toLowerCase() === name;
	});
};

function prettify(host) {
	var name = capitalize(host.split(".")[1]);
	if (!name) {
		name = host;
	}
	return name;
}

function capitalize(str) {
	if (typeof str === "string") {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}
