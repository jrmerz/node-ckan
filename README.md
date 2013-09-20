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

