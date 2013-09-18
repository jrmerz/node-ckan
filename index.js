/**
 * wrapper around the ckan api
 *
 * http://docs.ckan.org/en/latest/api.html
 **/
var request = require('request');
var jsdom = require('jsdom');

var key = "";
var server = "";

exports.setServer = function(current_server) {
	server = current_server;
}

exports.setKey = function(current_key) {
	key = current_key;
}

exports.login = function(username, password, callback) {
	post({
		url : server + "/login_generic",
		expected : 302,
		data : {
			login    : username,
			password : password,
			remember : 63072000
		},
		callback : function(error) {
			if( error ) return callback(error);
			scrapeToken();
		}
	});
	
	// HACK
	// TODO: can we get this token from the cookie?
	function scrapeToken()  {
		get({
			url : server + "/user/"+username,
			callback : function(error, body) {
				if( error ) return callback(error);
				jsdom.env(body,
						["http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"],
					    function(errors, window) {
					        var apikey = window.$("dd.value code");
					        if( apikey.length > 0 ) {
					        	key = apikey.html();
					        	callback();
					        } else {
					        	callback({error:true,message:"login failed"});
					        }
					    }
				);
			}
		})
	}
}

exports.exec = function(cmd, params, callback) {
	if( typeof params == 'function' ) {
		callback = params;
		params = {};
	}
	
	post({
		url       : server + "/api/3/action/"+cmd,
		data      : params,
		stringify : true,
		json      : true,
		headers   : {
			Authorization : key
		},
		callback  : function(error, response){
			if( error ) return callback(error);
			if( !response.success ) return callback(response);
			callback(null, response);
		}
	});
}


// simplify requests
function get(options) {
	request({url: options.url, jar : true},
	       function (error, response, body) {
	            if (!error && response.statusCode == 200) {
	            	if( options.json ) {
	            		try {
	            			var data = JSON.parse(body);
	            			options.callback(null, data);
	            		} catch(e) {
	            			e.response = body;
	            			options.callback(e);
	            		}
	            	} else {
	            		options.callback(null, body);
	            	}
	            } else {
	            	if( !error ) error = {status:response.statusCode};
	            	options.callback(error);
	            }
	       }
	);
}

function post(options) {
	var config = {
		 url : options.url,
	     jar : true,
	     method : "POST"
	}
	
	// set header information
	if( options.headers ) config.headers = options.headers;
	else config.headers = {};
	config.headers["Content-Type"] = "text/plain";
	
	// set body to either form style or JSON string
	if( options.stringify ) {
		config.body = JSON.stringify(options.data);
	} else {
		config.form = options.data;
	}

	request(config,
	        function (error, response, body) {
				if (!error && response.statusCode == options.expected ) {
					options.callback();
				} else if (!error && response.statusCode == 200) {
	            	if( options.json ) {
	            		try {
	            			var data = JSON.parse(body);
	            			options.callback(null, data);
	            		} catch(e) {
	            			e.response = body;
	            			options.callback(e);
	            		}
	            	} else {
	            		options.callback(null, body);
	            	}
				} else if( options.json && response.statusCode == 403 ) {
					try {
            			var data = JSON.parse(body);
            			options.callback(data);
            		} catch(e) {
    	            	options.callback({status:response.statusCode, body: body});
            		}
	            } else {
	            	if( !error ) error = {status:response.statusCode, body: body};
	            	options.callback(error);
	            }
	       }
	);
}

