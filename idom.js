/*! idi.bidi.dom 
* 
* v0.12
*
* A New Way To Interact With The DOM 
*
* Copyright (c) Marc Fawzi 2012-
* 
* http://javacrypt.wordpress.com
*
* This software is released under the Apache License 2.0 
* 
* This software is derived in part from NattyJS, an early precursor by the same
* author, "Copyright (c) Marc Fawzi, NiNu, Inc. 2011-2012" under "BSD License"  
*
*/

/******************************************************************************
 * 
 * README:
 * 
 * This version works in Gecko and Webkit, not tested on IE
 *
 * idi.bidi.dom - Anti-Templating Framework For Javascript -- offers a radically
 * different way for interacting with the DOM. In abstract terms, it takes the DOM 
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
 * idi.bidi.dom allows the DOM to be decomposed into Nodes each having a Node Prototype 
 * with data-injected variables in their markup. Multiple instances of each Node (i.e. 
 * data populated versions, each with its own persisted data) may be created, populated 
 * with data, and inserted into --and deleted from-- the Node (with the ability to target 
 * specific, previously inserted instances of the Node or all such instances). Each Node 
 * may embed any number of other Nodes, at any depth within its markup.
 * 
 * Additionally, idi.bidi.dom allows the cloning of each Node and all the populated
 * instances within it (including any populated Linked Nodes that were embedded into the 
 * host's Node Prototype) This means that we could re-use the same host Node to create 
 * any number of differently populated Clones with nested Nodes, which allows us to
 * composite and nest DOM views.  
 *
 * Unlike other data-driven DOM rendering frameworks, idi.bidi.dom does not attempt 
 * to take the place of Javascript itself nor does it add its own boilerplate; it 
 * simply gives Javascript more power by offering a simple and consistent interface
 * to the DOM. 
 *
 * Usage:
 *
 * format: document.querySelector('#someNode').idom$(data [, settings])
 * 
 * output: creates a new instance of the Node using 'data' (json) to populate the 
 * special variables in the Node, then append/prepend to (or replace) existing 
 * instance(s) of the Node
 *
 * forClone: id of the clone the data being populated is intended for. This is omitted 
 * when operating on cloned nodes
 *
 * data: {key: value, key: value, key: value, etc} 
 * where the key must match the variable name in the data minus the idom$ prefix
 *
 * settings: {mode: 'replace'|'append'|'prepend'|'node'|'proto', targetInstanceName: 
 * value, instanceName: value} ... replace is default mode
 *
 * if there no populated instances of the Node then append/prepend/replace 
 * will create a new instance of the Node (so if a targetInstanceName is supplied 
 * in this case it will throw an error, so call .$isPopulated() first to be sure before 
 * invoking this method with targetInstanceName, unless you know the node is populated)
 * 
 * If 'mode' is set to 'node' in settings then no other settings param is expected 
 * and only the node's style and class attributes are populated (all node instance 
 * attributes, including inline event handlers, as well as the node's style and class 
 * attributes, and all idom$ vars at the node instance level can be populated in any of 
 * the other modes during instance creation and replacement. Setting mode to 'node' will 
 * cause idom to populate only the style and class attributes in the node itself and does 
 * not touch any of the populated instances of its node prototype.)
 * 
 * If 'mode' is set to 'proto' in settings then only targetInstanceName (optional) will
 * be accepted in the param. In 'proto' mode only the style and class attributes on the 
 * node prototype instance(s) are populated. If no targetInstanceName is supplied then
 * then all instances are populated.  
 * 
 * targetInstanceName: (1) idom-instance-name value for the instance of the Node to 
 * insert _at_ when in append and prepend modes. If null, append/prepend at last/first 
 * previously populated instance of the Node, or to start of the list if none 
 * were previously populated.
 *
 * targetInstanceName: (2) dom-instance-name value for instance(s) of the Node Protoype to 
 * replace when in replace mode. If null, replace all instances.
 *
 * instanceName: idom-instance-name value for instance of Prototype Node being populated. 
 *
 *********************************************************************************
 * 
 * Other idom methods are 
 *
 * .idom$dePopulate([settings]) which can delete certain populated instances of the Node 
 * Prototype or all populated instances 
 *
 * .idom$isPopulated() may be queried before specifying targetInstanceName to verify the 
 * existence of populated instance(s) of the node prototype (the targets) 
 * 
 * idom$clone may be used to clone an entire node (including any linked nodes) after it's 
 * been populated)
 * 
 * idom.eventHandler may be used to defined inline events, e.g. onclick=idom$someHandler 
 * and setting someHandler to idom.eventHandler(event, this, someFunction) during instance 
 * creation which binds 'this' context to the element the event was triggered on and passes
 * the event, parent node id for the instance, and the instanceName  
 * 
 * idom.baseSelector maybe used on node and instance id's to strip out the clone and any link
 * references from instanceName which is 
 *
 **********************************************************************************
 *
 * About Events:
 * 
 * If a handler is defined on the node it will only have access to the node id. If it's 
 * defined on or in the node prototype it will have access to the instance id
 *
 * The context of 'this' inside the handler function is the element the event is 
 * defined on
 *
 * Event handlers that are NOT defined using inline event handlers (like onclick, 
 * onmouseover, etc) are not supported by idom at this time. 
 *    
 * 
 *********************************************************************************/
	
// define the global idom object
var idom = {};

// user defined iteration and DOM traversal functions should be added to idom.user
// Example: idom.user.someFunction = function () { ... }
idom.user = {};
 
idom.utils = {};

// define regular expression (RegEx) pattern for Prototype variables. use idom$ since that can't be confused 
idom.regex = /(idom\$\w+)/g;

// define length of Prototype variables pattern
idom.regexLength = 5;

// define regular expression (RegEx) pattern for idom.cache() variables. use i$ since that can't be confused 
idom.cacheRegEx =  /(init\$\w+)/g;

// define length of DOM presets pattern
idom.cacheRegexLength = 5;

idomData = {};
idomData.cache = {};
idomData.outerCache = {};

// internal use
idomDOM = {};
idomDOM.cache = {};
idomDOM.nodeClassCache = {};
idomDOM.nodeStyleCache = {};
idomDOM.instanceClassCache = {};
idomDOM.instanceStyleCache = {};
idomDOM.nodeShell = {};


// init method to be called from window.onload or $(document).ready 
idom.cache = function() {
	
	// re-cache()'ing must be avoided as the DOM will have changed, 
	// which would cause the cached templates to be out of sync 
	// with the DOM 
	
	if (idomDOM.cacheDone) {
		return;
	}
	
	// basic browser compatibility test
	if (!Element || 
		!NodeList || 
		!("outerHTML" in document.createElementNS("http://www.w3.org/1999/xhtml", "_")) ||
		!("innerHTML" in document.createElementNS("http://www.w3.org/1999/xhtml", "_")) ||
		typeof document.querySelector == 'undefined' || 
		typeof document.querySelectorAll == 'undefined' 
		) {
		
		var err = new Error;
			
		err.message = "This browser is not supported: some DOM objects, methods or properties are missing"
					 
		throw err.message + '\n' + err.stack;
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
			
			err.message = "iframe is not supported as Node. You must load and use idom from within the iframe"
			
			throw err.message + getPathTo(el)
		}
		
		if (typeof el.outerHTML == 'undefined') {
			
			var err = new Error;
			
			err.message = "this element type is not supported by idom"
			
			throw err.message + getPathTo(el)
			
		}
		
		// verify only one Node Prototype exists 
		// verify no @idom linked nodes exist outside of Node Prototype 
		// (linked nodes must be at root level within the Node Prototype) 
		
		
		if (el.children.length != 1) { 
			
			var err = new Error;
			
			err.message = "At the time of caching, node must contain just one child element as the Node Prototype." + 
							"You may use any block level element and encapsulate other elements within it."
			
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
		// being linked. idom deals with this by changing the idom-node-id and idom-instance-name's 
		// attribute in Linked Nodes inside the host Node Prototype by adding the link reference
		
		if (el.getAttribute("id" || el.children[0].getAttribute("id"))) {
			
			var err = new Error;
			
			err.message = "Node should not have an 'id' attribute (to query you may use document.querySelector with '[idom-node-id=\"someString\"]'"
			
			throw err.message + getPathTo(el)
				
			
		}
			
		if (el.getAttribute("idom-instance-name\=")) {
			
			var err = new Error;
			
			err.message = "at time of caching, node should not have any idom-generated attributes (idom-instance-name)"
			
			throw err.message + getPathTo(el)
		}
				
		// cache the virgin innerHTML of node 
		idomDOM.cache[nid] = el.innerHTML;	
		
		// cache the virgin outerHTML of node (minus the innerHTML)
		idomDOM.nodeShell[nid]	= el.cloneNode(false).outerHTML;
		
		
		var cls = el.getAttribute("class");
		
		if (cls && cls.match(idom.regex)) {
			
			idomDOM.nodeClassCache[nid] = cls;
		}
				
		var style = el.getAttribute("style");
		
		if (style && style.match(idom.regex)) {
			
			idomDOM.nodeStyleCache[nid] = style;
		}
		
		
		cls = el.children[0].getAttribute("class");
		
		if (cls && cls.match(idom.regex)) {
			
			idomDOM.instanceClassCache[nid] = cls;
		}
				
		style = el.children[0].getAttribute("style");
		
		if (style && style.match(idom.regex)) {
			
			idomDOM.instanceStyleCache[nid] = style;
		}
		
		el = null;
	}
	
	els = null;
	
	idomDOM.cacheDone = true;
	
	function getPathTo(element) {
			
	  	switch (element.tagName.toLowerCase()) {
	    
	        case "html" : case "body" : return element.tagName;  
	    }
	   
	    var ix= 0;
	    
	    var siblings= element.parentNode.childNodes;
	    
	    for (var i= 0; i<siblings.length; i++) {
	    
	        var sibling= siblings[i];
	    
	        if (sibling === element)
	    
	            return getPathTo(element.parentNode) + '/' + element.tagName + '[' + (ix+1) + ']';
	    
	        if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
	            ix++;
	    }
	}
};

idom.baseSelector = function(sel) {
	
	function endIndex() {
		
		var nsel = sel.indexOf('@'); 
		
		return nsel != -1 ? nsel : sel.length
	}
	
	return sel.substring(0, endIndex());
};

idom.eventHandler = function(event, el, func) {
	
	function getNodeId() { 
		
		var elem = el;

	    while (elem.parentNode) {
	    	
	        elem = elem.parentNode;
	      
	        var id = elem.getAttribute('idom-node-id')
	        
	        if (id) {
	        
	            return id;
	        }      
	    }
	 
	    return null;
   	}
   	
   	function getInstanceId() { 
   		
   		var elem = el;
	
	    while (elem.parentNode) {
	        
	        elem = elem.parentNode;
	        
	        var id = elem.getAttribute('idom-instance-name')
	        
	        if (id) {
	        
	            return id;
	        }    
	    }
	    
	    return null;
   	}
  
	var nodeId = el.getAttribute("idom-node-id") ? el.getAttribute("idom-node-id") : getNodeId();
	
	if (!nodeId || nodeId.indexOf('@clone@') == -1) {
		
		var err = new Error;
		
		err.message = "idomHandler() may only be invoked on cloned nodes";
					 
		throw err.message + '\n' + err.stack;
	}

    var cidStart = nodeId.indexOf('@clone@'); 
	var forClone = nodeId.substring(cidStart + 7)
	
	var instanceName = el.getAttribute("idom-instance-name") ? el.getAttribute("idom-instance-name") : getInstanceId();
	
	if (instanceName) {
		
		func.call(el, event, nodeId, instanceName, forClone);
		
	} else {
		
		func.call(el, event, nodeId, null, forClone);
	}
};

// utility functions ... 
// commonly needed functions missing from the popular 3rd party libraries

/*  
* 
* idom.utils.forEachExec(object, property assignment or method invocation)
* 
* usage example:
* 
* idom.utils.forEachExec(document.querySelectorAll('[idom-id$=someCloneUID]'), 'style.display = "block"')
*
* executes property assignment on all elements in the returned nodelist, or on the returned element 
* (if only one)
*
*/

idom.utils.forEachExec = function(obj, str) {
	
	if (arguments.length != 2) {
		
		var e = new Error;
		
		e.message = "params must be: object, method invocation or property assigment"
		
		throw e.message + "\n" + e.stack;
		
	}
	
	var exec = new Function("el", "el." + str);
	
	try {
		
		exec(obj[0] || obj);  
			
	} catch (e) {
		
		throw "invalid argument(s): " + e.message + "\n" + e.stack; 	
	}
	
	if (nodelist[0]) {
		for (var n = 1; n < obj.length; n++) {
			
			exec(obj[n]);	
		}	
	}
};

/* 
* 
* idom.utils.asyncLoop(length, asyncFunction, callback)
*  
* usage example:
*
* idom.utils.asyncLoop(5, someAsyncFunc, someCallback)
* 
* someAsyncFunc(loop, iterationCount) {
* 	doSomeAsyncStuff...
*   when done call loop() to continue...
* }
* 
* someCallback() {
* 	this is called after 5 iterations
* }
* 
*  
*/

idom.utils.asyncLoop = function(length, func, callback){
    
    var i=-1  
    var loop = function(){     
        i++;
        if (i == length) {
        	callback(); 
        	return;
        }
        func(loop, i);
    } 
    loop(); 
}

//useful when assigning spaced or hyphenated strings from JSON/AJAX to idom$() settings such as instanceName  

idom.utils.toCamelCase = function() {
	
	  return this.replace(/[\-_]/g, " ").replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
	
	    if (+match === 0) return ""; 
	    // or if (/\s+/.test(match)) for white spaces
	
	    return index == 0 ? match.toLowerCase() : match.toUpperCase();
	
	  });	  
};

// useful for finding indexOf a pattern
idom.utils.regexIndexOf = function(str, regex, startpos) {
    
    //force global
    regex = new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
   
    var indxOf = str.substring(startpos || 0).search(regex);
    
    return (indxOf >= 0) ? (indxOf + (startpos || 0)) : indxOf;
}

// useful for finding lastIndexOf a pattern
idom.utils.regexLastIndexOf = function(str, regex, startpos) {
   
    //force global
    regex = new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
   
    if(typeof (startpos) == "undefined") {
        startpos = str.length;
    } else if (startpos < 0) {
        startpos = 0;
    }
   
    var stringToWorkWith = this.substring(0, startpos + 1);
    var lastIndxOf = -1;
    var nextStop = 0;
   
    while((result = regex.exec(stringToWorkWith)) != null) {
        lastIndxOf = result.index;
        regex.lastIndex = ++nextStop;
    }
   
    return lastIndxOf;
}
	

// internal String method for injecting values into special variable (keys) into the node instance, 
// based on key-value JSON data (key-matched variables get their values from JSON values while unmatched
// ones get empty string) -- for internal use

String.prototype._idomMapValues = String.prototype._idomMapValues || function() {
	
	var json = arguments[0];
	
	var uid = arguments[1];
	
	var jsonStr, jsonErr; 
	
	try {
		
		jsonStr = JSON.stringify(json);
	
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
		
	} 
	
	if (jsonStr.match(idom.regex)) {
		
		var err = new Error;
			
		err.message = "Invalid data: idom node variables found in json"
					 
		throw err.message + '\n' + err.stack;
	}
		
	// RegEx will iterate thru the idom node variables (keys) in target element's virgin innnerHTML (the template), 
	// match to JSON values (by key), replacing the idom$ vars that match the supplied keys in JSON with the JSON values 
	// (including null values), and returning the the modified string for updating the target element's innerHTML
		
	return this.replace(idom.regex, function(match) { 
		
		// if idom init() variable exists and has a value, replace with JSON value for corresponding key
		
		var key = match.substr(idom.regexLength);
		var val = json[key];
		
		if (typeof eval("json." + key) != 'undefined') {
			
			// the unique for the data cache is a combination of nodeId + instanceName + forClone which assumes 
			// forClone is globally unique (user enforced for this release), nodeId is unique globally
			// (framework enforced) and instanceName is scoped to the node 
						
			// Despite that the same node can be linked-in multiple times within a given host node (i.e 
			// with the same clone id) such duplicate linking must be done after the node is copied 
			// with a differentiated node id (using idom$cloneBase), so the data cache key will be 
			// globally unique (although not guaranteed yet due to room for user error in the current release)  
			
			idomData.cache[uid.nid + "@" + uid.instanceName + "@" + uid.forClone + '@' + key] = val;
			
			return val;
			
		} else {
			
			// if idom variable is missing or has an empty string value return empty string 	
			return typeof idomData.cache[uid.nid + "@" + uid.instanceName + "@" + uid.forClone + '@' + key] != 'undefined' ? 
						idomData.cache[uid.nid + "@" + uid.instanceName + "@" + uid.forClone + '@' + key] : 
						'';
		}
	}); 
		
};

String.prototype._idomMapInstanceAttributes = String.prototype._idomMapInstanceAttributes || function() {
	
	var json = arguments[0];
	
	var uid = arguments[1];
	
	var jsonStr, jsonErr; 
	
	try {
		
		jsonStr = JSON.stringify(json);
	
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
		
	} 
	
	if (jsonStr.match(idom.regex)) {
		
		var err = new Error;
			
		err.message = "Invalid data: idom node variables found in json"
					 
		throw err.message + '\n' + err.stack;
	}
		
	// RegEx will iterate thru the idom node variables (keys) in target element's virgin innnerHTML (the template), 
	// match to JSON values (by key), replacing the idom$ vars that match the supplied keys in JSON with the JSON values 
	// (including null values), and returning the the modified string for updating the target element's innerHTML
		
	return this.replace(idom.regex, function(match) { 
		
		// if idom init() variable exists and has a value, replace with JSON value for corresponding key
		
		var key = match.substr(idom.regexLength);
		var val = json[key];
		
		if (typeof eval("json." + key) != 'undefined') {
			
			// the unique for the data cache is a combination of nodeId + targetInstanceName + forClone which assumes 
			// forClone is globally unique (user enforced for this release), nodeId is unique globally 
			// (framework enforced) and targetInstanceName is scoped to the node 
						
			// Despite that the same node can be linked-in multiple times within a given host node (i.e 
			// with the same clone id) such duplicate linking must be done after the node is copied 
			// with a differentiated node id (using idom$cloneBase), so the data cache key will be 
			// globally unique (although not guaranteed yet due to room for user error in the current release)  
			
			idomData.cache[uid.nid + "@" + uid.targetInstanceName + "@" + uid.forClone + '@' + key] = val;
			
			return val;
			
		} else {
			
			// if idom variable is missing or has an empty string value return empty string 	
			return typeof idomData.cache[uid.nid + "@" + uid.targetInstanceName + "@" + uid.forClone + '@' + key] != 'undefined' ? 
						idomData.cache[uid.nid + "@" + uid.targetInstanceName + "@" + uid.forClone + '@' + key] : 
						'';
		}
	}); 
		
};

// special version of the general data mapping function (for node-level variables)
String.prototype._idomMapNodeAttributes = String.prototype._idomMapNodeAttributes || function() {
	
	// take the first argument, assuming simple JSON
	var json = arguments[0];
	
	var uid = arguments[1];
	
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
		
	// In the case of the element's inline style, class attributes and inline event handlers RegEx will iterate 
	// thru the idom node variables (keys) in target element's virgin style or class attribute values or in the 
	// inline event handlers values (the template), match to JSON values (by key), replacing the idom$ vars that 
	// match the supplied keys in JSON with the JSON values (including null values), and returning the the modified 
	// string for updating the target element's style or class attribute values 
		
	return this.replace(idom.regex, function(match) { 
		
		// if idom init() variable exists and has a value, replace with JSON value for corresponding key
		
		var key = match.substr(idom.regexLength);
		var val = json[key];
		
		if (typeof eval("json." + key) != 'undefined') {
			
			// the unique for the data cache for node-level idom$ vars is a combination of nodeId + forClone 
			// which assumes forClone is globally unique (user enforced for this release) and nodeId is globally
			// unique too (framework enforced)  
						
			// Despite that the same node can be linked-in multiple times within a given host node (i.e 
			// with the same clone id) such duplicate linking must be done after the node is copied 
			// with a differentiated node id (using idom$cloneBase), so the node-level data cache key will 
			// be globally unique (although not guaranteed yet due to room for user error in the current release) 
		
			idomData.outerCache[uid.nid + "@" + uid.forClone + '@' + key] = val;
			
			return val;
			
		} else {
			
			// if idom variable is missing or has an empty string value return empty string 	
			return typeof idomData.outerCache[uid.nid + "@" + uid.forClone + '@' + key] != 'undefined' ? 
						idomData.outerCache[uid.nid + "@" + uid.forClone + '@' + key] : 
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

// Main method

Element.prototype.idom$ = Element.prototype.idom$ || function() {

	if (!idomDOM.cacheDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.cache() before invoking idom$ methods";
					 
		throw err.message + '\n' + err.stack;
	}
	
	var fullNid = this.getAttribute('idom-node-id');
	
	var nid = fullNid.replace(new RegExp("([@])(.)+$", "g"), "");

	if (!idomDOM.cache[nid]) {
		
		// node was added after idom.cache() 
		var err = new Error;
			
		err.message = "the node prototype for this node was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	if (!idomDOM.nodeShell[nid]) {
		
		// node was added after idom.cache() 
		var err = new Error;
			
		err.message = "the node was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	// isPopulated() checks if node structure has been corrupted by user or 3rd party library and throws an error
	// return value is used elsewhere in this function 
	var isPopulated = this.idom$isPopulated();
	
	// Todo: need to check if node has been populated from outside of the framework, which should throw an error

	// if arg0 is a non-empty string and node is already a clone
	if (arguments[0] && typeof arguments[0] == 'string') {
	
		if (fullNid.indexOf('@clone@') != -1) {
			
			var err = new Error;
			
			err.message = "did not expect a string (assuming clone id) as first argument (node is already a clone)";
						 
			throw err.message + '\n' + err.stack;	
		} 
	} 
	
	//if arg0 is a not null (including {}) and it's an object or if it's null and the node is already a clone 
	if ((typeof arguments[0] != 'object') || (typeof arguments[1] != 'object') || arguments.length > 2){
		
		var err = new Error;
		
		err.message = "idom$ expects two arguments as simple JSON objects: data and settings";
					 
		throw err.message + '\n' + err.stack;

	
	} else {
		
		var json = arguments[0];
		var settings = arguments[1];
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
	};
	
	if (fullNid.indexOf('@clone@') == -1) { 
		
		if (!settings && !settings.forClone) {
			
			var err = new Error;
			
			err.message = "Missing setting: you must specify forClone (during instance creation)";
			 
			throw err.message + '\n' + err.stack;
			
		}
		
		var forClone = settings.forClone;
		
		var isCloned = false;
		
	} else {
		
		if (settings && settings.forClone) {
			
			var err = new Error;
			
			err.message = "Invalid setting: forClone: node is already a clone";
			 
			throw err.message + '\n' + err.stack;
			
		}
		
		var forClone = fullNid.substring(fullNid.indexOf('@clone@') + 7);
		
		var isCloned = true;
	}
		
	// if only populating node's style and class attributes
	if (settings && settings.mode == 'node') {
		
		if (settings.instanceName || settings.targetInstanceName) {
			
			var err = new Error;
			
			err.message = "changing node attributes: no other paramters allowed in settings";
					 
			throw err.message + '\n' + err.stack;
			
		}
		
		if (!isPopulated) {
			
			var err = new Error;
			
			err.message = "invalid operation: this node currently has no populated instances of its node prototype";
			 
			throw err.message + '\n' + err.stack;	
			
		}
		
		populateOuter(this, forClone);
		
		return;
	};
	
	
	// if only populating node instance' style and class attributes
	if (settings && settings.mode == 'proto') {
		
		if (!isPopulated) {
			
			var err = new Error;
			
			err.message = "invalid operation: this node currently has no populated instances of its node prototype";
			 
			throw err.message + '\n' + err.stack;	
			
		}
		
		if (settings.instanceName) {
			
			var err = new Error;
			
			err.message = "changing node instance attributes: only targetInstanceName maybe specified for proto mode";
					 
			throw err.message + '\n' + err.stack;
			
		}
		
		// may or may not contain targetInstanceName
		populateInner(this, forClone, settings.targetInstanceName);
		
		return;
	};

	if (// 1: if Node has no populated instances 
		!isPopulated || 
		// 2: settings were not given 	
		!settings || settings == {} || 
		// 3: 'replace all' is assumed (if no target was specified and mode is replace or not specified)
		(settings && !settings.targetInstanceName && (settings.mode == 'replace' || !settings.mode))) {
		
		//exception under condition 1 if target is specified 
		if (settings && settings.targetInstanceName) {
				
				if (!this.isPopulated) {

					var err = new Error;
			
					err.message = "invalid setting: targetInstanceName cannot be applied: this node currently has no populated instances of its node prototype";
					 
					throw err.message + '\n' + err.stack;			
				};
		} 
		
		//exception under condition 2 and 3 
		if (!settings || !settings.instanceName) {
				
				var err = new Error;
				
				err.message = "instanceName must be specified in settings when inserting a new instance"
				 
				throw err.message + '\n' + err.stack;	
		}
		
		//all error paths handled in this case, so 
		this.innerHTML = idomDOM.cache[nid]._idomMapValues(json, {"instanceName": settings.instanceName, "nid": nid, "forClone": forClone});
						
		setInstanceId(this.children[0]);
		
		// insert Linked Nodes
		insertLinkedNodes(this.children[0]);
		
		// see after else for continuation
		
	// (general case)					
	} else {
		
			if (!settings.instanceName) {
			
				var err = new Error;
				
				err.message = "instanceName must be specified in settings when inserting a new instance"
				 
				throw err.message + '\n' + err.stack;
			}
			
			if (settings.instanceName.indexOf('@') != -1) {
				
				var err = new Error;
				
				err.message = "instanceName must not include any references to link or clone (they will be added automatically)"
				 
				throw err.message + '\n' + err.stack;
				
			}
			
			var targetInstanceList = [], newEl = [], tag, content, newChild, frag;
			
			if (settings.targetInstanceName) {
				
				for (var n = 0; n < this.children.length; n++) {
					
					var sel = this.children[n].getAttribute('idom-instance-name');
					 if (sel && idom.baseSelector(sel) ==  settings.targetInstanceName) {
						 
						 targetInstanceList.push(this.children[n])
					 }
				}
				
				if (!targetInstanceList[0]) {
								
					var err = new Error;
			
					err.message = "Invalid setting: targetInstanceName (" + settings.targetInstanceName + ") does not match " + 
					"the idom-instance-name of any of the instances of the node prototype in the node idom$() was invoked on\n";
					 
					throw err.message + '\n' + err.stack;	
				}; 
			} 
			
			// populate instance of the node with data     
			content = idomDOM.cache[nid]._idomMapValues(json, {"instanceName": settings.instanceName, "nid": nid, "forClone": forClone});
			
			newChild = document.createElement(this.tagName); 
			
			newChild.innerHTML = content;
			
			// Create document fragment to hold the populated instance
			frag = document.createDocumentFragment();
			
			frag.appendChild(newChild.children[0]);	
			
			switch (settings.mode) {
				
				case null: case undefined: case "replace": 
					
					if (settings.targetInstanceName) {
						
						if (targetInstanceList.length > 1) {
							
							// replace all matched targets with the new instance of the node
							for (var n = 0; n < targetInstanceList.length; n++) {
							
								this.insertBefore(frag.cloneNode(true), targetInstanceList[n]);
								
								newEl[n] = targetInstanceList[n].previousElementSibling;
								
								this.removeChild(targetInstanceList[n]);
								
								setInstanceId(newEl[n]);
								
								insertLinkedNodes(newEl[n]);
							}
							
						} else {
							
							this.insertBefore(frag.cloneNode(true), targetInstanceList[0]);
								
							newEl[0] = targetInstanceList[0].previousElementSibling;
								
							this.removeChild(targetInstanceList[0])
								
							setInstanceId(newEl[0]);
							
							insertLinkedNodes(newEl[0]);	
						}
						
					} else {
						
						this.innerHTML = idomDOM.cache[nid]._idomMapValues(json, {"instanceName": settings.instanceName, "nid": nid, "forClone": forClone});
						
						newEl[0] = this.children[0];
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0]);
					}
			
				break;
				
				case "append":
				
				    if (settings.targetInstanceName) {
						
						// append to last matched target
						if (targetInstanceList.length > 1) {
							
							var targetEl = targetInstanceList[targetInstanceList.length - 1];
	
						} else {
							
							var targetEl = targetInstanceList[0];
						}	
						
						this.insertBefore(frag.cloneNode(true), targetEl.nextElementSibling)
						
						newEl[0] = targetEl.nextElementSibling;
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0]);
						
					} else {
								
						this.appendChild(frag.cloneNode(true));
					
						newEl[0] = this.children[this.children.length - 1];
						 
						setInstanceId(newEl[0]);
		
						insertLinkedNodes(newEl[0]);
					}
				    
				break;
				
				case "prepend":
				
					if (settings.targetInstanceName) {
						
						// prepend to first matching target
						this.insertBefore(frag.cloneNode(true), targetInstanceList[0]);
							
						newEl[0] = targetInstanceList[0].previousElementSibling;
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0]);
						
					} else {
						
						this.insertBefore(frag.cloneNode(true), this.children[0]);
						
						newEl[0] = this.children[0];
						
						setInstanceId(newEl[0]);
						
						insertLinkedNodes(newEl[0]);
					}

				break;
				
				default: 
				
					var err = new Error;
			
					err.message = "invalid or misspelled setting for mode"
					 
					throw err.message + '\n' + err.stack;	
			}
			
			frag = null; 			
	};
	
	
	populateOuter(this, forClone);	
	
	populateInner(this, forClone);
	
	// encapsulated functions.. probably should move to idom.internal{}
	
	function populateInner(el, forClone, targetInstanceName) {
		
		var targetInstanceList = [];
		
		if (targetInstanceName) {
			
			for (var n = 0; n < el.children.length; n++) {
				
				var sel = el.children[n].getAttribute('idom-instance-name');
				 if (sel && idom.baseSelector(sel) ==  settings.targetInstanceName) {
					 
					 targetInstanceList.push(el.children[n])
				 }
			}
			
			if (!targetInstanceList[0]) {
				
				var err = new Error;
		
				err.message = "Invalid setting: targetInstanceName (" + settings.targetInstanceName + ") does not match " + 
				"the idom-instance-name of any of the instances of the node prototype in the node idom$() was invoked on\n";
				 
				throw err.message + '\n' + err.stack;	
			};
				
		} else {
				
			for (var n = 0; n < el.children.length; n++) {
				
				targetInstanceList.push(el.children[n]);	
			}
		}
		
		for (var n = 0; n < targetInstanceList.length; n++) {
			
			var instanceName = idom.baseSelector(targetInstanceList[n].getAttribute("idom-instance-name"))
			
			if (idomDOM.instanceClassCache[nid]) {
				
			
				
				var newCls = idomDOM.instanceClassCache[nid]._idomMapInstanceAttributes(json, {"targetInstanceName": instanceName, "nid": nid, "forClone": forClone});
				
				targetInstanceList[n].setAttribute("class", newCls)
			}

			// new or previous
			if (idomDOM.instanceStyleCache[nid]) {
				
				var newStyle = 	idomDOM.instanceStyleCache[nid]._idomMapInstanceAttributes(json, {"targetInstanceName": instanceName, "nid": nid, "forClone": forClone});
				
				targetInstanceList[n].setAttribute("style", newStyle)
			}
		
		}	
		
	
	}
		
	function populateOuter(el, forClone) {
		
		// new or previous
		if (idomDOM.nodeClassCache[nid]) {
			
			var newCls = idomDOM.nodeClassCache[nid]._idomMapNodeAttributes(json, {"nid": nid, "forClone": forClone});
			
			el.setAttribute("class", newCls)
		}
		
	
		// new or previous
		if (idomDOM.nodeStyleCache[nid]) {
		
			var newStyle = 	idomDOM.nodeStyleCache[nid]._idomMapNodeAttributes(json, {"nid": nid, "forClone": forClone});
			
			el.setAttribute("style", newStyle)
		}
		
	};
	
	
	function setInstanceId(elem) {

		var parentSel = elem.parentNode.getAttribute("idom-node-id")
		
		var refStart = parentSel.indexOf('@')
		
		if (refStart != -1) {
			
			elem.setAttribute("idom-instance-name", settings.instanceName + parentSel.substring(refStart))
		} else {
			
			elem.setAttribute("idom-instance-name", settings.instanceName)
		}	
	};
	
	function insertLinkedNodes(elem) {
		
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
						
						err.message = "cannot link the same node more than once into the same host node: use idom$cloneBase('version id') to create a new version of the base node before linking (coming in v0.12)";
						 
						throw err.message + '\n' + err.stack;
					}
					
					linkedNodeIDList += id + ",";
						
					var linkedNode = document.querySelector('[idom-node-id=' + id + ']');
					
					if (!linkedNode) {
						
						var err = new Error;
						
						err.message = "linked node not found";
							 
						throw err.message + '\n' + err.stack;
						
					} 
					
					if (!linkedNode.idom$isPopulated()) {
						
						var err = new Error;
							
						err.message = "linked node must be populated before being linked";
							 
						throw err.message + '\n' + err.stack;
					}
					
					
				    // use the HTML, Luke!
					if (idomDOM.cache[id].indexOf('@idom') != -1) {
						
							var err = new Error;
							
							err.message = "can't nest linked nodes within each other (bad idea)... \n";
							 
							throw err.message + '\n' + err.stack;	
					}
					
					var el = nestedCommentNodes[n].parentNode.insertBefore(linkedNode.cloneNode(true), nestedCommentNodes[n]);
					
					el.parentNode.removeChild(nestedCommentNodes[n]);
				   	
				   	var elemInstanceId = elem.getAttribute("idom-instance-name");
				   	
					for (var n = 0; n < el.children.length || n < 1; n++) {
									
						el.children[n].setAttribute("idom-instance-name", el.children[n].getAttribute("idom-instance-name") + "@link@" + elemInstanceId);
					} 
					
					el.setAttribute("idom-node-id", el.getAttribute("idom-node-id") + "@link@"  + elemInstanceId);
				} 
			}
			
		} else {
			
			return;
		}
	}; 
};

// format: clonedNode = document.querySelector('#someNode').idom$clone(uid) 

Element.prototype.idom$clone = Element.prototype.idom$clone || function() { 
	
	if (!idomDOM.cacheDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.cache() from window.onload or $(document).ready before invoking .idom$ methods";
					 
		throw err.message + '\n' + err.stack;
	}
	
	var fullNid = this.getAttribute("idom-node-id");
	
	var nid = fullNid.replace(new RegExp("([@])(.)+$", "g"), "");

	if (!idomDOM.cache[nid]) {
		
		// node was added after idom.cache() 
		var err = new Error;
			
		err.message = "the node prototype was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	if (!idomDOM.nodeShell[nid]) {
		
		// node was added after idom.cache() 
		var err = new Error;
			
		err.message = "the node was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	
	if (fullNid.indexOf('@link') != -1) {
		
		var err = new Error;
		
		err.message = "error cloning linked node: you may only clone the base node"  
		 
		throw err.message + '\n' + err.stack;
	}
	
	if (fullNid.indexOf('@clone') != -1) {
		
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

	var cloneId = arguments[0];
	
	var el = this.cloneNode(true);
	
	el.setAttribute("idom-node-id", el.getAttribute("idom-node-id") + "@clone@" + cloneId);
	
	var linkedNodes = el.querySelectorAll("[idom-node-id]");
	
		
	if (linkedNodes[0]) {
		
		for (var n = 0; n < linkedNodes.length; n++) {
			
			linkedNodes[n].setAttribute("idom-node-id", linkedNodes[n].getAttribute("idom-node-id").replace(/\@link\@(.*)$/, "") + "@clone@" + cloneId)
			
		}
		
	} else if (typeof linkedNodes.style != 'undefined') {
			
			linkedNodes.setAttribute("idom-node-id", linkedNodes.getAttribute("idom-node-id").replace(/\@link\@(.*)$/, "") + "@clone@" + cloneId)
	}
    
	var els = el.querySelectorAll("[idom-instance-name]");
	
	if (els[0]) {

			for (var n = 0; n < els.length; n++) {
				
				els[n].setAttribute("idom-instance-name", els[n].getAttribute("idom-instance-name").replace(/\@link\@(.*)$/, "") + "@clone@" + cloneId)
			}
	
	} else if (typeof els.style != 'undefined') {
		
		els.setAttribute("idom-instance-name", els.getAttribute("idom-instance-name").replace(/\@link\@(.*)$/, "") + "@clone@" + cloneId)
	} 
	
	return el;
};



// format: document.querySelector('#someNode').idom$isPopulated() 
Element.prototype.idom$isPopulated = Element.prototype.idom$isPopulated || function() {
	
	// .$isPopulated() may be used within loops, so it should be as light as possible
	
	if (!idomDOM.cacheDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.cache() from window.onload or $(document).ready before invoking .idom$ methods"
					 
		throw err.message + '\n' + err.stack;
	}
	
	var nid = this.getAttribute('idom-node-id').replace(new RegExp("([@])(.)+$", "g"), "");
	
	if (!idomDOM.cache[nid]) {
		
		var err = new Error;
			
		err.message = "the node prototype was not cached"
					 
		throw err.message + '\n' + err.stack;
	}
	
	if (!idomDOM.nodeShell[nid]) {
		
		// node was added after idom.cache() 
		var err = new Error;
			
		err.message = "the node was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	if (this.innerHTML == idomDOM.cache[nid] || !this.children[0]) {
		
		return false;
	}
	
	for (var n = 0; n < this.children.length; n++) {
		
		if (!this.children[n].getAttribute("idom-instance-name")) {
			
			var err = new Error;
				
			err.message = "node structure has been corrupted (external source)";
						 
			throw err.message + '\n' + err.stack;
		}
	}
	
	return true;
	
};

// .idom$dePopulate
//
// format: document.querySelector('#someNode').idom$dePopulate([settings]) 
// settings: {'targetInstanceName': value}
//
// targetInstanceName: settingal: for specifying instance(s) of Node Prototype to delete. If null, reset node's innerHTML to Node Prototype
//

Element.prototype.idom$dePopulate = Element.prototype.idom$dePopulate || function() {
	
	if (!idomDOM.cacheDone) {
		
		var err = new Error;
			
		err.message = "you must run idom.cache() from window.onload or $(document).ready before invoking .idom$ methods"
					 
		throw err.message + '\n' + err.stack;
	}
	
	var nodeId = this.getAttribute('idom-node-id');
	
	var nid = nodeId.replace(new RegExp("([@])(.)+$", "g"), "");
	
	if (!idomDOM.cache[nid]) {
		
		var err = new Error;
			
		err.message = "the node prototype was not cached"
					 
		throw err.message + '\n' + err.stack;
	}
     
	if (!idomDOM.nodeShell[nid]) {
		
		// node was added after idom.cache() 
		var err = new Error;
			
		err.message = "the node was not cached";
					 
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
		
		var targetInstanceList = [];
		
		if (settings.targetInstanceName) {
		
			if (this.innerHTML == idomDOM.cache[nid] || !this.children[0]) {
		
				var err = new Error;
				
				err.message = "node has not yet been populated (no matching instance)"
							 
				throw err.message + '\n' + err.stack;
			}
			
			for (var n = 0; n < this.children.length; n++) {
				
				if (this.children[n].getAttribute("idom-instance-name") == settings.targetInstanceName) {
					
					targetInstanceList.push(this.children[n])
				}
			}
						
			if (!targetInstanceList[0]) {
							
				var err = new Error;
		
				err.message = "Invalid setting: targetInstanceName (" + settings.targetInstanceName + ") does not match" + 
				"the idom-instance-name of any of the instances of the node idom$() was invoked on\n" + 
				"outerHTML of node:\n" + this.outerHTML;
				 
				throw err.message + '\n' + err.stack;	
			}
			
						
			for (var n = 0; n < targetInstanceList.length; n++) {
				
				this.removeChild(targetInstanceList[n]);
			}
			
		} else {
			
			var err = new Error;
				
			err.message = "this method only takes targetInstanceName in settings"
						 
			throw err.message + '\n' + err.stack;
		}
		
	} else {
		
		//dePopulate (outerCache includes node-level markup only, no innerHTML)
		this.outerHTML = idomDOM.nodeShell[nid].replace(idom.regex, "").replace(idom.baseSelector(nodeId), nodeId);
		
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