node-ckan
=========

Node wrapper for CKAN api. 

Full api documentation: http://docs.ckan.org/en/latest/api.html


Usage:

Set your server url
```javascript
ckan.setServer("");
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
```

