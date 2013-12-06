var groups = {};
var packages = {};

// save us calls if at all possible
var checkGroups = [];

// hash of vocab name's to id's
var vocabMap = {};

var options, ckan;


exports.run = function(o, c) {
	options = o;
	ckan = c;
	if( !options ) options = {};

	if( options.key ) ckan.setKey(options.key);
	if( options.server ) ckan.setServer(options.server);

	ready();
}

/*function getKnownVocab(callback) {
	if(options.debug) console.log("CKAN IMPORT: gathering list on known vocabulary\n");

	ckan.exec("vocabulary_list", function(err, resp) {
		if( err ) {
			return callback();
			if(options.debug) console.log("CKAN IMPORT: failed to get vocabulary\n");
		}

		knownVocabulary = [];
		for( var i = 0; i < resp.result.length; i++ ) {
			knownVocabulary.push(resp.result[i].name);
		}

		callback();
	});
}*/

function ready() {
	if( !options.groups ) {
		createPackages(632, options.packages);
	} else {
		createGroups(0, options.groups, options.packages);
	}
}

function createGroups(index, groupList, packageList) {
	createGroup(groupList[index], function(){
		index++;
		if( index == groupList.length ) {
			createPackages(0, packageList);
		} else {
			createGroups(index, groupList, packageList);
		}
	});
}

function createPackages(index, packageList) {
	var resources = packageList[index].resources;
	delete packageList[index].resources;

	createPackage(packageList[index], function(pkgId){
		if( resources && resources.length > 0 ) {
			// now create the resources
			// this is done one at a time in case of files
			createResources(0, packageList[index].name, pkgId, resources, function(){
				onPackageComplete(index, packageList);
			});
		} else {
			onPackageComplete(index, packageList);
		}
	});
}

function onPackageComplete(index, packageList) {
	if(options.debug) console.log("CKAN IMPORT: finished package index: "+index+" of "+packageList.length+"\n");

	index++;
	if( !done(index, packageList) ) {
		createPackages(index, packageList);
	}
}

function createResources(index, pkgName, pkgId, resourceList, callback) {
	resourceList[index].package_id = pkgId;

	createResource(pkgName, resourceList[index], function(){
		index++;
		if( index == resourceList.length ) {
			callback();
		} else {
			createResources(index, pkgName, pkgId, resourceList, callback);
		}
	});
}

function createGroup(group, callback) {
	if( !group.name ) error("Attempting to create a group w/o a name: "+JSON.stringify(group));

	if( checkGroups.indexOf(group.name) > -1 ) return callback();
	checkGroups.push(group.name);

	ckan.exec("group_show", {id:group.name}, function(err, resp) {
		if( !err && !resp.error ) return callback();

		create("group", group, function(resp){
			callback();
		});
	});
}

function createPackage(pkg, callback) {
	if( !pkg.name ) error("Attempting to create a package w/o a name: "+JSON.stringify(pkg));
	if( packages[pkg.name] ) return callback(packages[pkg.name].id);

	checkPackage(pkg, callback);
}

function checkPackage(pkg, callback) {
	ckan.exec("package_show", {id:pkg.name}, function(err, resp) {
		// already exists
		if( !err && !resp.error ) {
			if( options.debug ) console.log("CKAN IMPORT: "+pkg.name+" already created");
			packages[resp.result.name] = resp.result;

			if( options.update ) {

				pkg.resources = resp.result.resources;
				setVocabIds(0, pkg, function(){
					update("package", resp.result.id, pkg, function(resp){
						callback(resp.result.id);
					});
				});
			/*} else if ( options.replace ) {
				replace("package", resp.result.id, pkg, function(resp){
					packages[resp.result.name] = resp.result;
					callback(resp.result.id);
				});*/
			} else {
				callback(resp.result.id);
			}
			return;
		}

		setVocabIds(0, pkg, function(){
			create("package", pkg, function(resp){
				packages[resp.result.name] = resp.result;
				callback(resp.result.id);
			});
		});
		
	});
}

// we are going to assume people pass names in the vocabulary_id column
// to which point we need to look up the id from the name so package_create
// does the correct association
function setVocabIds(index, pkg, callback) {
	if(!pkg.tags) return callback();

	if( index == pkg.tags.length ) {
		callback();
	} else {
		getVocabId(pkg.tags[index].vocabulary_id, function(id) {
			pkg.tags[index].vocabulary_id = id;
			index++;
			setVocabIds(index, pkg, callback);
		});
	}
}

// if the id doesn't exist, create it
function getVocabId(name, callback) {
	if( vocabMap[name] ) return callback(vocabMap[name]);

	ckan.exec("vocabulary_show", {id: name}, function(err, resp) {
		if( err ) error("Unable to access vocabulary");

		if( !resp.success ) {
			if( name.match(/.*-.*-.*-.*-.*/) ) {
				if( err ) error("No vocabulary found for passed id");

				create("vocabulary", {name: name, tags: []}, function(err, resp){
					if( err ) error("Unable to create vocabulary: "+name);
					vocabMap[name] = resp.result.id;
					callback(resp.result.id);
				});
			}
		} else {
			vocabMap[name] = resp.result.id;
			callback(resp.result.id);
		}
	});
}

function createResource(pkgName, resource, callback) {
	if( !resource.name &&  !resource.url ) error("Attempting to create a resource w/o a name or url: "+JSON.stringify(resource));

	// first check this resource has not already been created
	if( packages[pkgName].resources ) {
		for( var i = 0; i < packages[pkgName].resources.length; i++ ) {

			if( (resource.name && packages[pkgName].resources[i].name == resource.name ) ||
				(resource.url && packages[pkgName].resources[i].url == resource.url) ) {

				if( options.update && !packages[pkgName].resources[i].file ) {
					update("resource", packages[pkgName].resources[i].id, resource, function(resp){
						callback();
					});
				} else if ( options.update && packages[pkgName].resources[i].file && 
							(options.updateFile === true || options.updateFile == null) ) {

					update("resource", packages[pkgName].resources[i].id, resource, function(resp){
						callback();
					});
				/*} else if ( options.replace ) {
					replace("resource", packages[pkgName].resources[i].id, resource, function(resp){
						callback();
					});*/
				} else {
					callback();
				}
				return;
			}

		}
	}

	create("resource", resource, function(resp){
		callback();
	});
}

function update(type, id, obj, callback) {
	if( options.debug ) console.log("CKAN IMPORT: Updating "+type+" '"+(obj.name ? obj.name : obj.url)+"'");
	obj.id = id;
	var t = new Date().getTime();

	ckan.exec(type+"_update", obj, function(err, resp) {
		if( options.debug ) console.log("  --"+(new Date().getTime()-t)+"ms");
		if( err ) return error(err);
		if( resp.error ) return error(resp.error);
		callback(resp);
	});
}

// does a full delete an insert of the object
// Currently there is no package purge... can this even be done?
/*function replace(type, id, obj, callback) {
	if( options.debug ) console.log("CKAN IMPORT: Replacing "+type+" '"+obj.name+"'");

	ckan.exec(type+"_delete",{id:id}, function(err, resp){
		if( err ) return error(err);
		if( resp.error ) return error(resp.error);

		create(type, obj, callback);
	});
}*/

function create(type, obj, callback) {
	if( options.debug ) console.log("CKAN IMPORT: Creating "+type+" '"+(obj.name ? obj.name : obj.url)+"'");
	var t = new Date().getTime();

	ckan.exec(type+"_create", obj, function(err, resp) {
		if( options.debug ) console.log("  --"+(new Date().getTime()-t)+"ms");
		if( err ) return error(err);
		if( resp.error ) return error(resp.error);

		callback(resp);
	});
}

function done(index, pkgList) {
	if( index == pkgList.length ) {
		if( options.debug ) console.log("CKAN IMPORT: Done.");
		if( options.callback ) options.callback();
		return true;
	}
	return false;
}

function error(msg) {
	console.log(msg);
	process.exit(1);
}