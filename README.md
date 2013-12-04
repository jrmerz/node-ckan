node-ckan
=========

Node.js wrapper for CKAN api. 

Full api documentation: http://docs.ckan.org/en/latest/api.html


Usage:

Load
```javascript
var ckan = require("node-ckan");
```

Set your server url
```javascript
ckan.setServer("http://demo.ckan.org");
```


Authenticate.  You can manually set your key or login.
```javascript
ckan.setKey("xxx-xxx-xxxx-xxxxxxxx");

// or

ckan.login("username", "password", function(error){
  // if successful, your key is now set
});
```


Call api.
```javascript
ckan.exec("package_list", function(err, resp) {

});

ckan.exec("am_following_user", {id:"bob"}, function(err, resp) {

});

// you can upload file resources as well
// simply use the api's resource_create command, but add the 'file' attribute
// that contains the path to the file you wish to upload
ckan.exec(
    "resource_create", 
    {
        file        : "/path/to/your/file.png",
        package_id  : "mypackage",
        description : "uploading using node.js api",
        name        : "myfile", // this will default to filename if not provided
        mimetype    : "image/png"
     },
     function(err, resp){}
);
```

Importer.  Helper method for importing data into ckan.
```javascript
ckan.import({
  // verbose output
  debug : true,

  // by default if a package or resource alread exsits, it will be ignored
  // set the update flag to force updates of packages and resources
  // update: true,

  // user key, you can authenticate using the setKey() and login() methods as well
  key: "xxx-xxx-xxxx-xxxxxxxx", 

  // server you wish to connect to
  server : "http://demo.ckan.org", 

  // list of packages you want to import.
  packages : [
    {
      name : "mypackage",
      groups : [{id: mygroup}],
      description : "test",
      resources : [
        {
          file        : "/path/to/your/file.png",
          description : "uploading using node.js api",
          name        : "myfile",
          mimetype    : "image/png"
        }
      ]
    }
  ],

  // you can create groups as well
  groups : [
    {
      name : "mygroup"
    }
  ]
});
```

Exporter.  Helper method for getting all data from ckan.
```javascript
ckan.export({
    // user key, you can authenticate using the setKey() and login() methods as well
    key: "xxx-xxx-xxxx-xxxxxxxx", 

    // server you wish to connect to
    server : "http://demo.ckan.org", 

    // data has all groups, organizations and packages
    callback : function(data) {
        // do stuff
    }
});
```
