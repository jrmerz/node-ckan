/**
 * wrapper around the ckan api
 * 
 * http://docs.ckan.org/en/latest/api.html
 */
var request = require('request');
var jsdom = require('jsdom');
var rest = require('restler');
var fs = require('fs');
var importer = require('./lib/ckan-importer');
var exporter = require('./lib/ckan-exporter');

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

exports.import = function(options) {
    importer.run(options, this);
}

exports.export = function(options) {
    exporter.run(options, this);
}

exports.exec = function(cmd, params, callback) {
    if( typeof params == 'function' ) {
        callback = params;
        params = {};
    }
    
    // see if we are uploading a file
    if( (cmd == 'resource_create' || cmd == 'resource_update') && params.file != null ) {
        var file = params.file;
        delete params.file;
        addFileResource(cmd, file, params, callback);
        return;
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

// todo, check for read access
function addFileResource(cmd, file, params, callback) {
    if( !file ) return callback({error:true,message:"no file provided"});
    if( !fs.existsSync(file) ) return callback({error:true,message:"no file found: "+file});
    if( !fs.statSync(file).isFile() ) return callback({error:true,message:"not a file: "+file});
    if( !params ) return callback({error:true,message:"no resource parameters provided"});
    if( !params.package_id ) return callback({error:true,message:"no package_id provided"});

    // clean up filename
    var name = getCkanFilename(file);
    var folder = new Date().toISOString()+'/'+name;
    
    // set default / known parameters
    params.url = server+"/storage/f/"+encodeURIComponent(folder);
    if( !params.name ) params.name = file.replace(/.*\//,'');
    params.size = fs.statSync(file).size;
    params.resource_type = "file.upload";
    
    exports.exec(cmd, params, function(err, pkg){
        if( err ) return callback(err);
        
        rest.post(server + '/storage/upload_handle', {
            multipart: true,
            headers : {
                Authorization : key
            },
            data: {
              key: folder,
              file: rest.file(file, null, fs.statSync(file).size, null, params.mimetype)
            }
        }).on('complete', function(data) {
            // HACK: redirects seem to fire complete twice.  this is bad
            if( !callback ) return;
            
            if (data instanceof Error) {
                callback(data);
            } else {
                callback(null, data);
            }
            callback = null;
        });
    });

}

function getCkanFilename(file) {
    var parts = file.split("/");
    var filename = parts[parts.length-1];
    var root = filename.match(/(.*)\.[^.]+$/)[1].replace(/^[A-Za-z0-9_]/,'-');
    parts = filename.split(".");
    return root + "." + parts[parts.length-1];
}

//simplify requests
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

    var completed = false;
    function done(err, resp) {
        if( !options.callback ) return;
        if( completed ) return;
        completed = true;
        options.callback(err, resp);
    }

    request(config, function (error, response, body) {
        if( error && !response ) {
            console.log(error);
            process.exit(1);
        }

        if (!error && response.statusCode == options.expected ) {
            done();
        } else if (!error && response.statusCode == 200) {
            if( options.json ) {
                try {
                    var data = JSON.parse(body);
                    done(null, data);
                } catch(e) {
                    e.response = body;
                    done(e);
                }
            } else {
                done(null, body);
            }
        } else if( options.json && response.statusCode == 403 ) {
            try {
                var data = JSON.parse(body);
                done(data);
            } catch(e) {
                done({status:response.statusCode, body: body});
            }
        } else {
            if( !error ) error = {status:response.statusCode, body: body};
            done(error);
        }
    });
}
