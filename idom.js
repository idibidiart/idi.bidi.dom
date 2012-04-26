/*! idi.bidi.dom 
* 
* v0.07
*
* New Way To Interact With The DOM 
*
* Copyright (c) Marc Fawzi 2012
* 
* http://javacrypt.wordpress.com
*
* Apache License 2.0 
* 
* derived from NattyJS v0.08: a BSD licensed precursor by the same author 
*
*/

/******************************************************************************
 * 
 * README:
 * 
 * This version works in Gecko and Webkit, not tested on IE
 *
 * idi.bidi.dom - Anti-Templating Framework For Javascript -- offers a radically
 * different way for interfacting with the DOM. In abstract terms, it takes the DOM 
 * and adds variables, variable memoization, encapsulation, multiple-inheritance and 
 * type polymorphism (with the Node Prototype as the user defined type) In logical 
 * terms, it offers a list-based API for creating, populating, and de-populating 
 * predetermined DOM structures with the ability to link, directly access, populate
 * and de-populate other predetermined DOM structures at any depth within them, thus 
 * giving us a simple and consistent alternative to the DOM's native API while allowing 
 * us to reduce the amount of HTML as well as separate the HTML from the presentation 
 * logic.
 * 
 * Why use it?
 * 
 * idi.bidi.dom reduces HTML on a page to a minimum and places a simple and consistent
 * JSON API between presentation logic and the DOM
 * 
 * How does it work?
 * 
 * idi.bidi.dom allows the DOM to be decomposed into Nodes each having a 
 * Node Prototype of which instances (copies, with the same or entirely different data) 
 * may be created, populated with JSON data, inserted into --and deleted from-- the Node 
 * (with the ability to target specific, previously inserted instances of the Node 
 * Prototype or all such instances), and where each Node can be linked by reference into 
 * any number of other Nodes.
 * 
 * Additionally, idi.bidi.dom allows the cloning of each Node and all the populated
 * instances within it (including any Linked Nodes inserted into the host's Node Prototype 
 * and their populated instances) This means that we may re-use the same Node to create 
 * any number of differently populated Nodes.  
 *
 * Unlike other template-less DOM rendering frameworks, idi.bidi.dom does not attempt 
 * to take the place of Javascript itself nor does it add its own boilerplate; it 
 * simply gives Javascript more power by leveraging a simple and consistent interface
 * to the DOM. 
 *
 * Usage:
 *
 * format: document.querySelector('#someNode').idom$(cloneId, data [, settings])
 * 
 * output: creates a new instance of the Node using 'data' (json) to populate the 
 * special variables in the Node, then append/prepend to (or replace) existing 
 * instance(s) of the Node
 *
 * cloneId: id for the clone the data is intended for. This is omitted when operating on 
 * cloned nodes
 *
 * data: {key: value, key: value, key: value, etc} 
 * where the key must match the variable name in the data minus the idom$ prefix
 *
 * settings: {mode: 'replace'|'append'|'prepend', targetInstanceId: value, instanceId: 
 * value}
 *
 * if there no populated instances of the Node then append/prepend/replace 
 * will create a new instance of the Node (so if a targetInstanceId is supplied 
 * in this case it will throw an error, so call .$isPopulated() first to be sure before 
 * invoking this method with targetInstanceId, unless you know the node is populated)
 *
 * targetInstanceId: (1) idom-instance-id value for the instance of the Node to 
 * insert _at_ when in append and prepend modes. If null, append/prepend at last/first 
 * previously populated instance of the Node, or to start of the list if none 
 * were previously populated.
 *
 * targetInstanceId: (2) dom-instance-id value for instance(s) of the Node Protoype to 
 * replace when in replace mode. If null, replace all instances.
 *
 * instanceId: idom-instance-id value for instance of Prototype Node being populated. 
 *
 *********************************************************************************
 * 
 * Other available are methods are 
 *
 * .idom$dePopulate([settings]) which can delete certain populated instances of the Node 
 * Prototype or all populated instances 
 *
 * .idom$isPopulated() may be queried before specifying targetInstanceId  
 * to verify existence of populated instance(s) of Node Prototype (the targets) 
 * 
 * idom$clone may be used to clone an entire node (including any linked nodes) after it's 
 * been populated)
 *
 **********************************************************************************
 *
 * About Events:
 * If the handler is defined on the node it will only have access to the node id. If it's 
 * defined on or in the node prototype it will have access to the instance id
 *
 * The context of 'this' inside the handler becomes the element the event is defined on 
 * (i.e. the cloned node or the node instances within it), which is the normal 
 * way 'this' is handled in this context
 *
 * event handlers that are not defined using element attributes (e.g. onclick, onmouseover, 
 * etc) are not handled by idom at this time. Finding and cloning all event handlers that 
 * are attached via different means, like jQuery, will be supported in the future 
 * 
 *********************************************************************************/
	
// define the global idom object
var idom = {};

// user defined iteration and DOM traversal functions should be added to idom.user
// Example: idom.user.someFunction = function () { ... }
idom.user = {};
 
idom.version = "0.07";

// define regular expression (RegEx) pattern for Prototype variables. use idom$ since that can't be confused 
idom.regex = /(idom\$\w+)/g;

// define length of Prototype variables pattern
idom.regexLength = 5;

// define regular expression (RegEx) pattern for idom.init() variables. use i$ since that can't be confused 
idom.initRegEx =  /(i\$\w+)/g;

// define length of DOM presets pattern
idom.initRegexLength = 2;

idomData = {};

idomData.cache = {};

idomData.outerCache = {};

// internal use
idomDOM = {};

// internal use
idomDOM.cache = {};

idomDOM.cidCache = {};

idomDOM.clsCache = {};

idomDOM.styleCache = {};

// init method to be called from window.onload or $(document).ready 
idom.init = function(json) {
	
	// re-cache()'ing must be avoided as the DOM will have changed, 
	// which would cause the cached templates to be out of sync 
	// with the DOM 
	
	if (idomDOM.initDone) {
		return;
	}
	
	if (!Element || !NodeList || !String) {
		
		var err = new Error;
			
		err.message = "This browser is not supported: some basic Javascript objects are missing"
					 
		throw err.message + '\n' + err.stack;
	}
	
	// populate idom init() variables before caching
	if (json) {
		
		document.documentElement.innerHTML  = document.documentElement.innerHTML._idomMapValues(json, null, true);
	}
	
	// fetch all elements with idom-node-id (no need to loop thru script tags)
	var els = document.querySelectorAll('[idom-node-id]');
	
	var elCount, elem;
	
	// nodelist
	if (els[0]) {
		
		elCount = els.length;
		
	// element
	} else if (typeof els.style != 'undefined') {
		
		elCount = 1;
		elem = els;
    	
	// none
	} else {
	
		elCount = 0;
	}
	
	for (var n = 0; n < elCount; n++) {
		
		el = elem || els[n];
		
		var nid = el.getAttribute('idom-node-id');
		
		if (!nid) {
			
			var err = new Error;
			
			err.message = "Node must have idom-node-id attribute set to a non-empty string value"
			
			throw err.message + getPathTo(el)
		}
		
		if (nid.match(idom.regex)) {
			
			var err = new Error;
			
			err.message = "idom-node-id must not contain a special variable. "
			
			throw err.message + getPathTo(el)
		}
		
		if (nid.indexOf('@') != -1) {
			
			var err = new Error;
			
			err.message = "idom-node-id must not contain special character @ at time of caching"
			
			throw err.message + getPathTo(el)
			
		}
		
		if (idomDOM.cache[nid]) {
			
			var err = new Error;
			
			err.message = "idom-node-id is in use by another Node"
			
			throw err.message + getPathTo(el)
		}
		
		if (el.tagName.toLowerCase() == "iframe") {
			
			var err = new Error;
			
			err.message = "iframe is not allowed as a Node. You must load and use idom from within the iframe"
			
			throw err.message + getPathTo(el)
		}
		
		// verify base node is a div
		// verify only one Node Prototype exists 
		// verify no @idom linked nodes exist outside of Node Prototype 
		// (linked nodes must be at root level within the Node Prototype) 
		
		if (el.tagName.toLowerCase() != "div") { 
			
			var err = new Error;
			
			err.message = "base node must be a div (you may incorporate any type of element inside the node prototype)" 
			
			throw err.message + getPathTo(el)
		}
		
		if (el.children.length != 1 || el.firstElementChild.tagName.toLowerCase() != "div") { 
			
			var err = new Error;
			
			err.message = "At the time of caching, node must contain just one child div as the Node Prototype." + 
							"You may encapsulate other elements within it."
			
			throw err.message + getPathTo(el)
		}
		
		var commentNodes = el.getElementsByNodeType(8);
		
		if (commentNodes.length) {
			
			for (var i = 0; i < commentNodes.length; i++) {
				
				if (commentNodes[i].textContent.match(/(@idom)([\s+])(\w+)/)) {
					
					var err = new Error;
			
					err.message = "@idom linked nodes must be placed within the Node Prototype, not the Node"
					
					throw err.message + getPathTo(el)
				
				}
				
				el.removeChild(commentNodes[i])
			}
		}
		
		if (el.innerHTML.match(/(idom-node-id\=)/)) {
				
			var err = new Error;
			
			err.message = "Node must not have any descendants with idom-node-id at time of caching\n" +
							"you may dynamically link-in other Nodes by inserting <!-- @idom [the idom-node-id for node you wish to nest without the brackets] --> anywhere inside the Node Prototype"
			
			throw err.message + getPathTo(el)
		}
		
		// using 'id' on Node would match the base node outside of the Node Prototype that is 
		// being linked. idom deals with this by changing the idom-node-id and idom-instance-id's 
		// attribute in Linked Nodes inside the host Node Prototype by adding the link reference
		
		if (el.getAttribute("id" || el.children[0].getAttribute("id"))) {
			
			var err = new Error;
			
			err.message = "Node should not have an 'id' attribute (to query you may use document.querySelector with '[idom-node-id=\"someString\"]'"
			
			throw err.message + getPathTo(el)
				
			
		}
			
		if (el.getAttribute("idom-instance-id\=")) {
			
			var err = new Error;
			
			err.message = "at time of caching, node should not have any idom-generated attributes (idom-instance-id)"
			
			throw err.message + getPathTo(el)
		}
				
		// cache virgin innerHTML of node 
		idomDOM.cache[nid] = el.innerHTML;		
	}
	
	idomDOM.initDone = true;
	
	function getPathTo(element) {
			
	  	if (element===document.documentElement)
	        return element.tagName;
	        
	    if (element===document.documentElement.firstElementChild)
	        return element.tagName;   
	         
	    if (element===document.body)
	        return element.tagName;
	
	    var ix= 0;
	    
	    var siblings= element.parentNode.childNodes;
	    
	    for (var i= 0; i<siblings.length; i++) {
	    
	        var sibling= siblings[i];
	    
	        if (sibling===element)
	    
	            return getPathTo(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
	    
	        if (sibling.nodeType===1 && sibling.tagName===element.tagName)
	            ix++;
	    }
	}
}

//idom.forEachExec(document.querySelectorAll('[idom-id$=someCloneUID]'), 'style.display = "block"')

idom.forEachExec = function(nodelist, str) {
	
	if (arguments.length != 2) {
		
		var e = new Error;
		
		e.message = "wrong number of arguments: requires: nodelist, str"
		
		throw e.message + "\n" + e.stack;
		
	}
	
	var exec = new Function("el", "el." + str);
	
	if (!nodelist[0])
	
	try {
		
		exec(nodelist[0] || nodelist);  
			
	} catch (e) {
		
		throw "invalid argument(s): " + e.message + "\n" + e.stack; 	
	}
	
	if (nodelist[0]) {
		for (var n = 1; n < nodelist.length; n++) {
			
			exec(nodelist[n]);	
		}	
	}
};

idom.eventHandler = function(event, el, func) {
	
	function getNodeId() { 
		
		var elem = el;

	    while (elem.parentNode) {
	    	
	        elem = elem.parentNode;
	        
	        var id = elem.getAttribute('idom-node-id')
	        
	        if (id)
	        
	            return id;
	    }
	    
	    return null;
   	}
   	
   	function getInstanceId() { 
   		
   		var elem = el;
	
	    while (elem.parentNode) {
	        
	        elem = elem.parentNode;
	        
	        var id = elem.getAttribute('idom-instance-id')
	        
	        if (id) {
	        
	            return id;
	        }    
	    }
	    
	    return null;
   	}
  
	var nodeId = el.getAttribute("idom-node-id") ? el.getAttribute("idom-node-id") : getNodeId();
	
	if (!nodeId || !nodeId.indexOf('@cloned@')) {
		
		var err = new Error;
		
		err.message = "idomHandler() may only be invoked on cloned nodes";
					 
		throw err.message + '\n' + err.stack;
	}

	var instanceId = el.getAttribute("idom-instance-id") ? el.getAttribute("idom-instance-id") : getInstanceId();
	
	if (instanceId) {
		
		func.call(el, event, nodeId, instanceId);
		
	} else {
		
		func.call(el, event, nodeId, null);
	}
};


//useful when assigning spaced or hyphenated strings from JSON/AJAX to idom$() setttings such as instanceId  

idom.toCamelCase = function() {
	
	  return this.replace(/[\-_]/g, " ").replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
	
	    if (+match === 0) return ""; 
	    // or if (/\s+/.test(match)) for white spaces
	
	    return index == 0 ? match.toLowerCase() : match.toUpperCase();
	
	  });	  
};


idom.baseSelector = function(sel) {
	
	function endIndex() {
		
		var nsel = sel.indexOf('@'); 
		
		return nsel != -1 ? nsel : sel.length
	}
	
	return sel.substring(0, endIndex());
};
	

// internal String method for injecting values into special variable (keys) into the node instance, 
// based on key-value JSON data (key-matched variables get their values from JSON values while unmatched
// ones get empty string) -- for internal use

String.prototype._idomMapValues = String.prototype._idomMapValues || function() {
	
	// take the first argument, assuming simple JSON
	var json = arguments[0];
	
	var uid = arguments[1];
	
	var forInit = arguments[2];
	
	var jsonStr, jsonErr; 
	
	try {
		
		jsonStr =JSON.stringify(json);
	
	} catch(e) {
		
		jsonErr = true;
	}
	
	// primitive, fast error checking ... 
	if (jsonErr || jsonStr.match(/[\{]{2,}|[\[]/) ) {
		
		var err = new Error;
			
		err.message = 'Invalid data: use simple JSON: {"someKey": "some value", "anotherKey": 5, "yetAnotherKey": true, "andLastButNotLeast": null}'
					 
		throw err.message + '\n' + err.stack;
		 
		// Notes:
		//
		// idom works with simple object literal or simple JSON
		// 
		// 'simple JSON' is defined as:
		// {"someKey": "some value", "anotherKey": 5, "yetAnotherKey": true, "andLastButNotLeast": null}
		
		// Use Javascript to iterate thru more complex JSON then pass on simple JSON to idom
		
	} else if (jsonStr.match(idom.regex)) {
		
		var err = new Error;
			
		err.message = "Invalid data: idom node variables found in json"
					 
		throw err.message + '\n' + err.stack;
	}
		
	// RegEx will iterate thru the idom node variables (keys) in target element's virgin innnerHTML (the template), 
	// match to JSON values (by key), replacing the pseduo vars that match the supplied keys in JSON with the JSON values 
	// (including null values), and returning the the modified string for updating the target element's innerHTML
	
	if (!forInit) {
		
		return this.replace(idom.regex, function(match) { 
			
			// if idom init() variable exists and has a value, replace with JSON value for corresponding key
			
			var key = match.substr(idom.regexLength);
			var val = json[key];
			
			if (typeof eval("json." + key) != 'undefined') {
				
				// The data cache key for each key in the JSON for a given node is unique per instance id
				// (instanceId), per each clone id (cloneId.) Since the node id (nid) and instance id are 
				// used internally without the link or clone reference, the data cache keys for a given node 
				// are shared at the node instance level among the base node, the linked version 
				// (if any, including inside a cloned host node) and the cloned version, and this sharing is 
				// only per the given clone id, so it's globally unique per instance id, per clone id. 
				
				// Despite that the same node can be linked into multiple times within a given host node (i.e 
				// with the same clone id) such duplicate linking must be done after the node is copied 
				// with a different node id, so the data cache key will always be globally unique per instance 
				// id, per clone id.  
				
			    // 1. you can't link @hkjhkkj@linked@ or @jghgjh@cloned .. no @ in id of node to be linked from comment
			    
			    // 2. stamp the clone id as attribute
				
				idomData.cache[uid.nid + "@" + uid.instanceId + "@" + uid.cloneId + '@' + key] = val;
				
				return val;
				
			} else {
				
				// if idom variable is missing or has an empty string value return empty string 	
				return typeof idomData.cache[uid.nid + "@" + uid.instanceId + "@" + uid.cloneId + '@' + key] != 'undefined' ? 
							idomData.cache[uid.nid + "@" + uid.instanceId + "@" + uid.cloneId + '@' + key] : 
							'';
			}
		}); 
		
	}	else {
		
		return this.replace(idom.initRegEx, function(match) { 
			
			var key = match.substr(idom.initRegexLength);
			var val = json[key];
			
			// if an init variable exists and has a value, replace with JSON value for corresponding key
			
			if (val) {
				
				return val;
			
			} else {
				
				// if an init variable is missing or has an empty string value return an empty string in its place	
				return '';
			}
		});
	}		
};


// special version of the general data mapping function (for node-level variables)
String.prototype._idomMapOuterValues = String.prototype._idomMapOuterValues || function() {
	
	// take the first argument, assuming simple JSON
	var json = arguments[0];
	
	var uid = arguments[1];
	
	var forInit = arguments[2];
	
	var jsonStr, jsonErr; 
	
	try {
		
		jsonStr =JSON.stringify(json);
	
	} catch(e) {
		
		jsonErr = true;
	}
	
	// primitive, fast error checking ... 
	if (jsonErr || jsonStr.match(/[\{]{2,}|[\[]/) ) {
		
		var err = new Error;
			
		err.message = 'Invalid data: use simple JSON: {"someKey": "some value", "anotherKey": 5, "yetAnotherKey": true, "andLastButNotLeast": null}'
					 
		throw err.message + '\n' + err.stack;
		 
		// Notes:
		//
		// idom works with simple object literal or simple JSON
		// 
		// 'simple JSON' is defined as:
		// {"someKey": "some value", "anotherKey": 5, "yetAnotherKey": true, "andLastButNotLeast": null}
		
		// Use Javascript to iterate thru more complex JSON then pass on simple JSON to idom
		
	} else if (jsonStr.match(idom.regex)) {
		
		var err = new Error;
			
		err.message = "Invalid data: idom node variables found in json"
					 
		throw err.message + '\n' + err.stack;
	}
		
	// RegEx will iterate thru the idom node variables (keys) in target element's virgin innnerHTML (the template), 
	// match to JSON values (by key), replacing the pseduo vars that match the supplied keys in JSON with the JSON values 
	// (including null values), and returning the the modified string for updating the target element's innerHTML

		
	return this.replace(idom.regex, function(match) { 
		
		// if idom init() variable exists and has a value, replace with JSON value for corresponding key
		
		var key = match.substr(idom.regexLength);
		var val = json[key];
		
		if (typeof eval("json." + key) != 'undefined') {
			
			// The data cache key for each key in the JSON for a given node is unique per instance id
			// (instanceId), per each clone id (cloneId.) Since the node id (nid) and instance id are 
			// used internally without the link or clone reference, the data cache keys for a given node 
			// are shared at the node instance level among the base node, the linked version 
			// (if any, including inside a cloned host node) and the cloned version, and this sharing is 
			// only per the given clone id, so it's globally unique per instance id, per clone id. 
			
			// Despite that the same node can be linked into multiple times within a given host node (i.e 
			// with the same clone id) such duplicate linking must be done after the node is copied 
			// with a different node id, so the data cache key will always be globally unique per instance 
			// id, per clone id.  
			
		    // 1. you can't link @hkjhkkj@linked@ or @jghgjh@cloned .. no @ in id of node to be linked from comment
		    
		    // 2. stamp the clone id as attribute
			
			idomData.outerCache[uid.nid + "@" + uid.cloneId + '@' + key] = val;
			
			return val;
			
		} else {
			
			// if idom variable is missing or has an empty string value return empty string 	
			return typeof idomData.outerCache[uid.nid + "@" + uid.cloneId + '@' + key] != 'undefined' ? 
						idomData.outerCache[uid.nid + "@" + uid.cloneId + '@' + key] : 
						'';
		}
	}); 
			
};


// Todo: test if TreeWalker with SHOW_COMMENTS is faster
Element.prototype.getElementsByNodeType =  Element.prototype.getElementsByNodeType || function() {
    
    var elem = this;
    var childNodeType = arguments[0];
    var deep = arguments[1];
    var childNodes = elem.childNodes;
    var result = [];
    
    for (var i = 0; i < childNodes.length; i++) {
    
      if (childNodes[i].nodeType == Number(childNodeType)) {
    
        result.push(childNodes[i]);
      } 
    
      if (deep && (childNodes[i].nodeType == 1)) {
    
        result = result.concat(childNodes[i].getElementsByNodeType(childNodeType, deep));
      }
    }
    
    return result;
};
 
Element.prototype.idom$ = Element.prototype.idom$ || function() {
	
	if (!idomDOM.initDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.init() from window.onload or $(document).ready before invoking .idom$ methods";
					 
		throw err.message + '\n' + err.stack;
	}
	
	var fullNid = this.getAttribute('idom-node-id');
	
	var nid = fullNid.replace(new RegExp("([@])(.)+$", "g"), "");

	if (!idomDOM.cache[nid]) {
		
		// node was added after idom.init() 
		var err = new Error;
			
		err.message = "node was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	// Todo: need to check if node has been populated from outside of the framework, which should throw an error
	
	var cloneId = arguments[0];
	var json = arguments[1];
	var settings = arguments[2];
	
	// if arg0 is a non-empty string
	if (arguments[0] && typeof arguments[0] == 'string') {
		
		if (fullNid.indexOf('@cloned@') != -1 && cloneId) {
			
			var err = new Error;
			
			err.message = "did not expect cloneId (node is already a clone)";
						 
			throw err.message + '\n' + err.stack;	
		} 
	
	} 
	
	//if arg0 is a non-null object (including {})
	if ((arguments[0] && typeof arguments[0] == 'object') || (!cloneId && fullNid.indexOf('@cloned@') != -1)){
			
		cloneId = fullNid.substring(fullNid.indexOf('@cloned@') != -1 ? fullNid.indexOf('@cloned@') + 8 : fullNid.length); 

		var json = arguments[0];
		var settings = arguments[1];	
	
	}
	
	if (!cloneId) {
		
		var err = new Error;
			
		err.message = "you must specify cloneId";
					 
		throw err.message + '\n' + err.stack;
		
	} 
		
	if (idomDOM.cidCache[nid]) {	
		
		if (idomDOM.cidCache[nid].indexOf(cloneId) == -1) {
			
			idomDOM.cidCache[nid] += cloneId + ",";
		}
		
	} else {
		
		idomDOM.cidCache[nid] += cloneId + ",";
	}
	
	// json is error checked in string replace function
	if (!json) {
		
		var err = new Error;
			
		err.message = "required argument: data (json)";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	
	if (settings && settings != {}) {
		
		var optErr, settingsStr;
			
		try {
			
			settingsStr = JSON.stringify(settings);
			
		} catch (e) {
			
			optErr = true;
		}
		
		// primitive, fast error checking ... 
		if (optErr || settingsStr.match(/[\{]{2,}|[\[]/)) {
			
			var err = new Error;
			
			err.message = 'Invalid settings: use simple JSON. {"someKey": "some value", "anotherKey": 5, "yetAnotherKey": true, "andLastButNotLeast": null}';
			 
			throw err.message + '\n' + err.stack;
			
			// Notes:
			//
			// idom works with simple JSON
			// 
			// 'simple JSON' is defined as a key-value collection, limited to string or numeric values 
			// Like {"someKey": "some value", "anotherKey": 5, "yetAnotherKey": true, "andLastButNotLeast": null}
			
		} 
		
		if (settingsStr.match(idom.regex)) {
			
			var err = new Error;
			
			err.message = "Invalid settings: idom node variables found in settings";
			 
			throw err.message + '\n' + err.stack;
		}
			
		if (settingsStr.indexOf('@') != -1) {
				
				var err = new Error;
				
				err.message = "values in settings must not include @ references (they're inferred at run time) \n" +
							  "use idom.baseSelector(long@format@value) to pass the base values"
				 
				throw err.message + '\n' + err.stack;
				
		}
	}
		
	if (!this.children[0] || !this.children[0].getAttribute("idom-instance-id") ||
		// condition 1: if Node has no populated instances of its Prototype Node 
		this.innerHTML == idomDOM.cache[nid] || 
		// condition 2: or settings were not given 	
		!settings || settings == {} || 
		// condition 3: or 'replace all' is assumed (if no target was specified and mode is replace or not specified)
		(settings && !settings.targetInstanceId && (settings.mode == 'replace' || settings.mode == ''))) {
		
		//exception under condition 1 if target is specified 
		if (settings && settings.targetInstanceId) {
				
				if (this.innerHTML == idomDOM.cache[nid]) {

					var err = new Error;
			
					err.message = "invalid setting: targetInstanceId cannot be applied: this node currently has no populated instances of its node prototype";
					 
					throw err.message + '\n' + err.stack;			
				};
				
		} 
		
		//exception under condition 2 and 3 
		if (!settings || !settings.instanceId) {
				
				var err = new Error;
				
				err.message = "instanceId must be specified in settings when inserting a new instance"
				 
				throw err.message + '\n' + err.stack;
				
		}
		
		
		//all error paths handled in this case, so 
		this.innerHTML = idomDOM.cache[nid]._idomMapValues(json, {"instanceId": settings.instanceId, "nid": nid, "cloneId": cloneId});
						
		setInstanceId(this.children[0]);
		
		// insert Linked Nodes
		insertLinkedNodes(this.children[0], cloneId);
		
	// else (general case)					
	} else {
		
			if (!settings.instanceId) {
			
				var err = new Error;
				
				err.message = "instanceId must be specified in settings when inserting a new instance"
				 
				throw err.message + '\n' + err.stack;
			}
			
			if (settings.instanceId.indexOf('@') != -1) {
				
				var err = new Error;
				
				err.message = "instanceId must not include any references to link or clone (they will be added automatically)"
				 
				throw err.message + '\n' + err.stack;
				
			}
			
			var targetNodeList = [], newEl = [], tag, content, newChild, frag;
			
			if (settings.targetInstanceId) {
				
				for (var n = 0; n < this.children.length; n++) {
					
					var sel = this.children[n].getAttribute('idom-instance-id');
					 if (sel && idom.baseSelector(sel) ==  settings.targetInstanceId) {
						 
						 targetNodeList.push(this.children[n])
					 }
				}
				
				if (!targetNodeList[0]) {
								
					var err = new Error;
			
					err.message = "Invalid setting: targetInstanceId (" + settings.targetInstanceId + ") does not match " + 
					"the idom-instance-id of any of the instances of the Node Prototype of the Node idom$() is invoked on\n";
					 
					throw err.message + '\n' + err.stack;	
				}; 
			} 
			
			// populate instance of the node with data     
			content = idomDOM.cache[nid]._idomMapValues(json, {"instanceId": settings.instanceId, "nid": nid, "cloneId": cloneId});
			
			newChild = document.createElement("div"); 
			
			newChild.innerHTML = content;
			
			// Create document fragment to hold the populated instance
			frag = document.createDocumentFragment();
			
			frag.appendChild(newChild.children[0]);	
			
			switch (settings.mode) {
				
				case null: case '': case "replace": 
					
					if (settings.targetInstanceId) {
						
						if (targetNodeList.length > 1) {
							
							// replace all matched targets with the new instance of the node
							for (var n = 0; n < targetNodeList.length; n++) {
							
								this.insertBefore(frag.cloneNode(true), targetNodeList[n]);
								
								newEl[n] = targetNodeList[n].previousElementSibling;
								
								this.removeChild(targetNodeList[n]);
								
								setInstanceId(newEl[n]);
								
								insertLinkedNodes(newEl[n], cloneId);
							}
							
						} else {
							
							this.insertBefore(frag.cloneNode(true), targetNodeList[0]);
								
							newEl[0] = targetNodeList[0].previousElementSibling;
								
							this.removeChild(targetNodeList[0])
								
							setInstanceId(newEl[0]);
							
							insertLinkedNodes(newEl[0], cloneId);
								
						}
						
					} else {
						
						this.innerHTML = idomDOM.cache[nid]._idomMapValues(json, {"instanceId": settings.instanceId, "nid": nid, "cloneId": cloneId});
						
						newEl[0] = this.children[0];
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0], cloneId);

					}
			
				break;
				
				case "append":
				
				    if (settings.targetInstanceId) {
						
						// append to last matched target
						if (targetNodeList.length > 1) {
							
							var targetEl = targetNodeList[targetNodeList.length - 1];
	
						} else {
							
							var targetEl = targetNodeList[0];
						}	
						
						this.insertBefore(frag.cloneNode(true), targetEl.nextElementSibling)
						
						newEl[0] = targetEl.nextElementSibling;
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0], cloneId);
						
					} else {
								
						this.appendChild(frag.cloneNode(true));
					
						newEl[0] = this.children[this.children.length - 1];
						 
						setInstanceId(newEl[0]);
		
						insertLinkedNodes(newEl[0], cloneId);
					}
				    
				break;
				
				case "prepend":
				
					if (settings.targetInstanceId) {
						
						// prepend to first matching target
						this.insertBefore(frag.cloneNode(true), targetNodeList[0]);
							
						newEl[0] = targetNodeList[0].previousElementSibling;
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0], cloneId);
						
					} else {
						
						this.insertBefore(frag.cloneNode(true), this.children[0]);
						
						newEl[0] = this.children[0];
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0], cloneId);
	
					}

				break;
				
				default: 
				
					var err = new Error;
			
					err.message = "invalid or misspelled setting for mode"
					 
					throw err.message + '\n' + err.stack;	
			}
			
			frag = null; 			
	}	
	
	
	var cls = this.getAttribute("class");
	
	if (cls && cls.match(idom.regex)) {
		
		idomDOM.clsCache[nid] = cls;
		
	} 
		
	if (idomDOM.clsCache[nid]) {
	
		var newCls = idomDOM.clsCache[nid]._idomMapOuterValues(json, {"instanceId": settings.instanceId, "nid": nid, "cloneId": cloneId});
		
		this.setAttribute("class", newCls)
	}
		
	var style = this.getAttribute("style");
	
	if (style && style.match(idom.regex)) {
		
		idomDOM.styleCache[nid] = style;
		
	} 
		
	if (idomDOM.styleCache[nid]) {
	
		var newStyle = 	idomDOM.styleCache[nid]._idomMapOuterValues(json, {"instanceId": settings.instanceId, "nid": nid, "cloneId": cloneId});
		
		this.setAttribute("style", newStyle)
	}
	
	if (typeof this.outerHTML != 'undefined') {
	
		if (this.cloneNode(false).outerHTML.match(idom.regex)) {
			
			var err = new Error;
				
			err.message = "idom$ vars are currently only supported in class and style strings on the node itself (but anywhere in the node prototype)"
						 
			throw err.message + '\n' + err.stack;
		}
		
		if (this.outerHTML.match(idom.regex)) {
			
			var err = new Error;
				
			err.message = "data error: some idom$ vars were found after mapping was done"
						 
			throw err.message + '\n' + err.stack;
		}
	
	}
	
	function setInstanceId(elem) {

		var parentSel = elem.parentNode.getAttribute("idom-node-id")
		
		var refStart = parentSel.indexOf('@')
		
		if (refStart != -1) {
			
			elem.setAttribute("idom-instance-id", settings.instanceId + parentSel.substring(refStart))
		} else {
			
			elem.setAttribute("idom-instance-id", settings.instanceId)
		}	
		
	};
	
	function insertLinkedNodes(elem, cloneId) {
		
		var nestedCommentNodes = elem.getElementsByNodeType(8, true);
		
		if (nestedCommentNodes[0]) {
			
			var linkedNodeIDList = '';
			
			for (var n = 0; n < nestedCommentNodes.length; n++) {
				
				var id = nestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/) ? nestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/)[3] : null;
			
				if (id.indexOf('@') != -1) {
					
					var err = new Error;
			
					err.message = "bad <--! @ id --> // id for node to be linked may not contain any link or clone references (link base node instead)"
					 
					throw err.message + '\n' + err.stack;	
					
				}
				
				if (id) {
				
					
					if (linkedNodeIDList.indexOf(id) != -1) {
						
						var err = new Error;
						
						err.message = "cannot link the same node more than once into the same host node: use idom$copy('copy id') to create a new copy of the base node before linking (coming in v0.08)";
						 
						throw err.message + '\n' + err.stack;
					}
					
					linkedNodeIDList += id + ",";
						
					var linkedNode = document.querySelector('[idom-node-id=' + id + ']');
					
					if (idomDOM.cidCache[nid].indexOf(cloneId) == -1) {
					
							var err = new Error;
							
							err.message = "linked node must be populated with the host node's clone id before being linked into it";
							 
							throw err.message + '\n' + err.stack;
						
					}
					
					var recursiveNestedCommentNodes = linkedNode.getElementsByNodeType(8, true);
					
					for (var m = 0; m < recursiveNestedCommentNodes.length; m++) {
						
						var reId = recursiveNestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/) ? recursiveNestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/)[3] : null;
						
						if (reId) {
							
							var err = new Error;
							
							err.message = "can't have a linked node within a linked node until v0.08 (pending feature)";
							 
							throw err.message + '\n' + err.stack;
						}
					}

					var el = nestedCommentNodes[n].parentNode.insertBefore(linkedNode.cloneNode(true), nestedCommentNodes[n]);
					
					el.parentNode.removeChild(nestedCommentNodes[n]);
				   	
					for (var n = 0; n < el.children.length || n < 1; n++) {
									
						el.children[n].setAttribute("idom-instance-id", el.children[n].getAttribute("idom-instance-id") + "@linked@" + elem.getAttribute("idom-instance-id"));
					  
					} 
					
					el.setAttribute("idom-node-id", el.getAttribute("idom-node-id") + "@linked@"  + elem.getAttribute("idom-instance-id"));
				} 
			}
			
		} else {
			
			return;
		}
	} 
};

// format: clonedNode = document.querySelector('#someNode').idom$clone(uid) 

Element.prototype.idom$clone = Element.prototype.idom$clone || function() { 
	
	if (!idomDOM.initDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.init() from window.onload or $(document).ready before invoking .idom$ methods";
					 
		throw err.message + '\n' + err.stack;
	}
	
	var fullNid = this.getAttribute("idom-node-id");
	
	var nid = fullNid.replace(new RegExp("([@])(.)+$", "g"), "");

	if (!idomDOM.cache[nid]) {
		
		// node was added after idom.init() 
		var err = new Error;
			
		err.message = "node was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	if (fullNid.indexOf('@linked') != -1) {
		
		var err = new Error;
		
		err.message = "error cloning linked node: you may only clone the base node"  
		 
		throw err.message + '\n' + err.stack;
	}
	
	if (fullNid.indexOf('@cloned') != -1) {
		
		var err = new Error;
		
		err.message = "error cloning already cloned node: you may only clone the base node" 
		 
		throw err.message + '\n' + err.stack;
	}
	
	if (!arguments.length) {
		
		var err = new Error;
		
		err.message = "you must provide a clone id"
		 
		throw err.message + '\n' + err.stack;
	}
	
	if (!this.idom$isPopulated()) {
	 				
		var err = new Error;
		
		err.message = "the node must be populated before it may be cloned"
		 
		throw err.message + '\n' + err.stack;
	}
	
	if (idomDOM.cidCache[nid].indexOf(cloneId) == -1) {
					
		var err = new Error;
		
		err.message = "node must be populated with this clone id before being cloned";
		 
		throw err.message + '\n' + err.stack;
		
	}

	var cloneId = arguments[0];
	
	var el = this.cloneNode(true);
	
	el.setAttribute("idom-node-id", el.getAttribute("idom-node-id") + "@cloned@" + cloneId);
	
	var linkedNodes = el.querySelectorAll("[idom-node-id]");
	
		
	if (linkedNodes[0]) {
		
		for (var n = 0; n < linkedNodes.length; n++) {
			
			linkedNodes[n].setAttribute("idom-node-id", linkedNodes[n].getAttribute("idom-node-id") + "@cloned@" + cloneId)
		}
		
	} else if (typeof linkedNodes.style != 'undefined') {
			
			linkedNodes.setAttribute("idom-node-id", linkedNodes.getAttribute("idom-node-id") + "@cloned@" + cloneId)
	}

	
	var els = el.querySelectorAll("[idom-instance-id]");
	
	if (els[0]) {

			for (var n = 0; n < els.length; n++) {
				
				els[n].setAttribute("idom-instance-id", els[n].getAttribute("idom-instance-id") + "@cloned@" + cloneId)
			}
	
	} else if (typeof els.style != 'undefined') {
		
		els.setAttribute("idom-instance-id", els.getAttribute("idom-instance-id") + "@cloned@" + cloneId)
	} 
	
	return el;
};



// format: document.querySelector('#someNode').idom$isPopulated() 
Element.prototype.idom$isPopulated = Element.prototype.idom$isPopulated || function() {
	
	// .$isPopulated() may be used within loops, so it should be as light as possible
	
	if (!idomDOM.initDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.init() from window.onload or $(document).ready before invoking .idom$ methods"
					 
		throw err.message + '\n' + err.stack;
	}
	
	var nid = this.getAttribute('idom-node-id').replace(new RegExp("([@])(.)+$", "g"), "");
	
	if (!idomDOM.cache[nid]) {
		
		var err = new Error;
			
		err.message = "node was not cached"
					 
		throw err.message + '\n' + err.stack;
	}

	if (this.innerHTML == idomDOM.cache[nid] || !this.children[0] || !this.children[0].getAttribute("idom-instance-id")) {
		
		return false;
	}		
	
	return true;
	
};

// .idom$dePopulate
//
// format: document.querySelector('#someNode').idom$dePopulate([settings]) 
// settings: {'targetInstanceId': value}
//
// targetInstanceId: settingal: for specifying instance(s) of Node Prototype to delete. If null, reset node's innerHTML to Node Prototype
//

Element.prototype.idom$dePopulate = Element.prototype.idom$dePopulate || function() {
	
	if (!idomDOM.initDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.init() from window.onload or $(document).ready before invoking .idom$ methods"
					 
		throw err.message + '\n' + err.stack;
	}
	
	var nid = this.getAttribute('idom-node-id').replace(new RegExp("([@])(.)+$", "g"), "");
	
	if (!idomDOM.cache[nid]) {
		
		var err = new Error;
			
		err.message = "node was not cached"
					 
		throw err.message + '\n' + err.stack;
	}
     
	
	// take settings, assuming simple JSON
	var settings = arguments[0];	
	
	var settingsStr, optErr;
	
	if (settings) {
		
		try {
			
			settingsStr = JSON.stringify(settings);
			
		} catch (e) {
			
			optErr = true;
		}
		
		// primitive, fast error checking ... 
		if (optErr || settingsStr.match(/[\{]{2,}|[\[]/)) {
			
			var err = new Error;
			
			err.message = 'Invalid settings: use simple JSON. {"someKey": "some value", "anotherKey": 5, "yetAnotherKey": true, "andLastButNotLeast": null}'
						 
			throw err.message + '\n' + err.stack; 
			 
			// Notes:
			//
			// idom works with simple JSON
			// 
			// 'simple JSON' is defined as a key-value collection, limited to string or numeric values 
			// Like {somesetting: 'value', anothersetting: 'anotherValue', etc}
			
		} else if (settingsStr.match(idom.regex)) {
			
			var err = new Error;
			
			err.message = "Invalid data: idom node variables found in settings"
						 
			throw err.message + '\n' + err.stack;
		}
		
		var targetNodeList = [];
		
		if (settings.targetInstanceId) {
		
			if (this.innerHTML == idomDOM.cache[nid] || !this.children[0] || !this.children[0].getAttribute("idom-instance-id")) {
		
				var err = new Error;
				
				err.message = "node has not yet been populated (no matching instance)"
							 
				throw err.message + '\n' + err.stack;
			}
			
			for (var n = 0; n < this.children.length; n++) {
				
				if (this.children[n].getAttribute("idom-instance-id") == settings.targetInstanceId) {
					
					targetNodeList.push(this.children[n])
				}
			}
						
			if (!targetNodeList[0]) {
							
				var err = new Error;
		
				err.message = "Invalid setting: targetInstanceId (" + settings.targetInstanceId + ") does not match" + 
				"any idom-instance-id in any instance of the node idom$() is invoked on\n" + 
				"outerHTML of node:\n" + this.outerHTML;
				 
				throw err.message + '\n' + err.stack;	
			}
			
						
			for (var n = 0; n < targetNodeList.length; n++) {
				
				this.removeChild(targetNodeList[n]);
			}
			
		} else {
			
			var err = new Error;
				
			err.message = "this method only takes targetInstanceId in settings"
						 
			throw err.message + '\n' + err.stack;
		}
		
	} else {
		
		this.innerHTML = "";
	}
};

// this block is needed only for jQuery elements

if (typeof(jQuery) == 'function') {
	
	// all jQuery functions are exact replicas of the corresponding Element prototype extensions
	
	// Todo: move code from Element protype into separate function and call from there and from here 
		
	(function($) {
		
		// idom functions as plugins for jQuery 
		
		$.fn.idom$ = function() {
			
			// get Javascript's version of 'this' for Element
			var thisJS = this.get(0);
			
			
		}
		
		// isPopulated
		$.fn.idom$isPopulated = function() {
			
			// get Javascript's version of 'this' for Element
			var thisJS = this.get(0);
			
			
		}
	
		// delete
		$.fn.idom$dePopulate = function() {
		
			// get Javascript's version of 'this' for Element
			var thisJS = this.get(0);		
			
		}

	})(jQuery);
} 