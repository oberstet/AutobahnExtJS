/**
 * absessionExtJS - absession/WAMP proxy and support code for ExtJS.
 *
 * absessionExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 *
 */

// You can use this Wamp application class just by calling the Ext.application function
// as usual and specifying extend:'AB.app.WampApplication' as a property of the app config 
// object.  The connection properties below have to be specified in the app config object as well
Ext.define('AB.app.WampApplication', {
	extend: 'Ext.app.Application',

	// connection config 
	// namespaces: ['AB'],
	cookieDomain: null,
	websocketURI: null,
	appKey: null,
	appSecret: null,
	maxRetries: 10,
	retryDelay: 300,

	// optional URI abreviation for topic specification (see WebMQ documentation)
	topicToPrefix: null,
	topicPrefix: null,
	onWebmqReady: function() {
		this.resumeLaunch();
	},

	// will be set by the constructor for your information
	permissions: null,
	absession: null, // the session object is also created as a global variable "abssession"

	resumeLaunch: function() {
		var me = this;
		if (!this.isLaunched)
			AB.app.WampApplication.superclass.constructor.apply(me, arguments);
		this.isLaunched = true;

	},

	constructor: function(config) {
		var me = this;
		console.log('Starting WampApplication', me.websocketURI);
		var extra = null;
		if (document.cookie != "") {
			extra = {
				cookies: {}
			};
			// extra.cookies[document.domain] = document.cookie; // non-working, need to figure out ..
			extra.cookies[me.cookieDomain] = document.cookie;
		}


		// the reason why the WebMQ init is not done in the init function of the Extjs Application object
		// is because the session creation is asynchronous. -> The app class does not wait for the session to be created.
		// This is here ensured by calling the app class constructor only after successful connection.
		// (The init function of the app class is also called after this constructor.)
		ab.connect(me.websocketURI,

		//success

		function(sess) {
			me.absession = sess;
			// set global variable
			absession = sess;

			console.log("WebMQ connected!");

			if (me.appKey !== null) // anonymous auth
				me.absession.authreq(me.appKey, extra).then(function(challenge) {
					var signature = me.absession.authsign(challenge, me.appSecret);
					me.absession.auth(signature).then(

					function(permissions) {
						me.permissions = permissions;
						// console.log("Connection authenticated with permissions: ", permissions);
						if (me.topicToPrefix != null && me.topicPrefix != null) me.absession.prefix(me.topicPrefix, me.topicToPrefix);

						// WebMQ ready. Call callback.
						me.onWebmqReady();
						// the rest of the app constructor can be called by manually calling startApp


					}, ab.log);
				}, ab.log);
			else
				sess.authreq().then(function() {
					sess.auth().then(function(permissions) {
						me.permissions = permissions;
						// console.log("Connection authenticated with permissions: ", permissions);
						if (me.topicToPrefix != null && me.topicPrefix != null) me.absession.prefix(me.topicPrefix, me.topicToPrefix);

						// WebMQ ready. Call callback.
						me.onWebmqReady();
						// the rest of the app constructor can be called by manually calling startApp
					}, ab.log);


				}, ab.log);
		},
		//failure

		function(code, reason, detail) {
			console.log("WebMQ connection failed!", code, reason, detail);


			me.absession = null;
			switch (code) {
				case ab.CONNECTION_UNSUPPORTED:
					window.location = "http://absession.ws/unsupportedbrowser";
					break;
				case ab.CONNECTION_CLOSED:
					window.location.reload();
					break;
				default:
					console.log(code, reason, detail);
					break;
			}
		},
		//params
		{
			'maxRetries': me.maxRetries,
			'retryDelay': me.retryDelay
		});



	}
});