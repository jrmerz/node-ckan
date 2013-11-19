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

	getGroups(function(){
		getPackages(function(){
			if( options.callback ) options.callback(data);
		});
	});
}

function getGroups(callback) {
	ckan.exec('group_list', {all_fields: true}, function(err, resp){
		checkError(err, resp);

		for( var i = 0; i < resp.result.length; i++ ) {
			data.groups[resp.result[i].id] = resp.result[i];
		}

		if( callback ) callback();
	});
}

function getPackages(callback) {
	ckan.exec('current_package_list_with_resources', function(err, resp){
		checkError(err, resp);
		
		for( var i = 0; i < resp.result.length; i++ ) {
			data.packages[resp.result[i].id] = resp.result[i];
		}

		if( callback ) callback();
	});
}

function getOrganizations(callback) {
	ckan.exec('organization_list', {all_fields: true}, function(err, resp){
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