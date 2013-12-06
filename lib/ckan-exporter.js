var data = {
	groups        : {},
	packages      : {},
	organizations : {}
}

// save us calls if at all possible
var checkGroups = [];

var options, ckan;


exports.run = function(o, c) {
	var t = new Date().getTime();
	ckan = c;
	options = o;
	if( !options ) options = {};

	if( options.key ) ckan.setKey(options.key);
	if( options.server ) ckan.setServer(options.server);

	if( options.debug ) console.log("CKAN EXPORT: Exporting group data...");
	getGroups(function(){

		if( options.debug ) console.log("CKAN EXPORT: Exporting package data...");
		getPackages(function(){

			if( options.debug ) console.log("CKAN EXPORT: Exporting organization data...");
			getOrganizations(function() {
				if( options.callback ) options.callback(data);
			});
		});
	});
}

function getGroups(callback) {
	ckan.exec('group_list', {all_fields: true}, function(err, resp){
		if( options.debug ) console.log("CKAN EXPORT: Group data loaded");
		checkError(err, resp);

		for( var i = 0; i < resp.result.length; i++ ) {
			data.groups[resp.result[i].id] = resp.result[i];
		}

		if( callback ) callback();
	});
}

function getPackages(callback) {
	getPackageSet(0, callback);
}

// get 100 packages at a time
function getPackageSet(index, callback) {
	var page = {
		limit  : 100,
		offset : index*100
	}

	ckan.exec('current_package_list_with_resources', page, function(err, resp){
		checkError(err, resp);
		
		for( var i = 0; i < resp.result.length; i++ ) {
			data.packages[resp.result[i].id] = resp.result[i];
		}

		if( resp.result.length == 0 ) {
			if( callback ) callback();
		} else {
			if( options.debug ) console.log("CKAN EXPORT: Package data loaded ("+(index*100)+" to "+((index+1)*100)+")");
			index++;
			getPackageSet(index, callback);
		}
	});
}

function getOrganizations(callback) {
	ckan.exec('organization_list', {all_fields: true}, function(err, resp){
		if( options.debug ) console.log("CKAN EXPORT: Organization data loaded");
		checkError(err, resp);
		
		for( var i = 0; i < resp.result.length; i++ ) {
			data.organizations[resp.result[i].id] = resp.result[i];
		}

		if( callback ) callback();
	});
}

function checkError(err, resp) {
	if( err ) error(err);
	if( !resp.success ) error(resp);
}

function error(msg) {
	console.log(msg);
	process.exit(1);
}