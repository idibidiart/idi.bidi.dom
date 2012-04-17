/*! idi.bidi.dom 
* 
* v0.5
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
 * terms, it offers a list-based API for creating, updating, and deleting predetermined 
 * DOM structures with the ability to dynamically link and directly access other 
 * predetermined DOM structures at any depth within them, thus giving us a simple and
 * consistent alternative to the DOM's hierarchical API and allowing us to reduce the 
 * amount of HTML as well as separate the HTML from our presentation logic.
 *
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
 * output: creates a new instance of Node Prototype using 'data' (json) to populate the 
 * special variables in the Node, then append/prepend to (or replace) existing 
 * instance(s) of Node Prototype in the Node
 *
 * cloneId: unique id for the future or current clone the data is intended for  
 *
 * data: {key: value, key: value, key: value, etc} 
 * where the key must match the variable name in the data minus the idom$ prefix
 *
 * settings: {mode: 'replace'|'append'|'prepend', targetInstanceId: value, instanceId: 
 * value}
 *
 * if there no populated instances of Node Prototype then append/prepend/replace 
 * will create a new instance of the Node Prototype (so if a targetInstanceId is supplied 
 * in this case it will throw an error, so call .$isPopulated() first to be sure before 
 * invoking this method with targetInstanceId, unless you know the node is populated)
 *
 * targetInstanceId: (1) idom-instance-id value for the instance of the Node Prototype to 
 * insert _at_ when in append and prepend modes. If null, append/prepend at last/first 
 * previously populated instance of the Node Prototype, or to start of the list if none 
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
 * .idom$delete([settings]) which can delete certain populated instances of the Node 
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
 * (i.e. the cloned node or the node prototype instance within it), which is the normal 
 * way 'this' is handled in this context
 *
 * event handlers that are not defined using element attributes (e.g. onclick, onmouseover, 
 * etc) are not handled by idom at this time. Finding and cloning all event handlers that 
 * are attached via different means, like jQuery, will be supported in the future 
 * 
 *********************************************************************************/
	
// define the glpbal idom object
var idom = {};

// user defined iteration and DOM traversal functions should be added to idom.user
// Example: idom.user.someFunction = function () { ... }
idom.user = {};
 
idom.version = "0.2";

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

// internal use
idomDOM = {};

// internal use
idomDOM.cache = {};

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
	
	// fetch all elements with idom-node-id
	var els = document.querySelectorAll('[idom-node-id]');
	
	var elCount, elem;
	
	// nodelist
	if (els.length) {
		
		elCount = els.length;
		
	// element
	} else if (els) {
		
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
			
			throw new Error("Node must have idom-node-id attribute set to a non-empty string value");
			// add path to element
		}
		
		if (nid.match(idom.regex)) {
			
			throw new Error("idom-node-id must not contain a special variable. ");
			// add path to element
		}
		
		if (nid.indexOf('@') != -1) {
			
			throw new Error("idom-node-id must not contain special character @ at time of caching");
			// add path to element
			
		}
		
		if (idomDOM.cache[nid]) {
			
			throw new Error("idom-node-id is in use by another Node");
			// add path to element
		}
		
		if (el.tagName.toLowerCase() == "iframe") {
			
			throw new Error("iframe is not allowed as a Node. You must load and use idom from within the iframe");
			// add path to element
		}
		
		// verify only one Node Prototype exists 
		// verify no @idom linked nodes exist outside of Node Prototype 
		// (linked nodes must be at root level within the Node Prototype) 
		
		if (el.children.length != 1) { 
				
			throw new Error("At the time of caching, node must contain just one child, which is the Node Prototype." + 
							"You may use a div as the Node Prototype to encapsulate other elements.");
			// add path to element
		}
		
		var commentNodes = el.getElementsByNodeType(8);
		
		if (commentNodes.length) {
			
			for (var i = 0; i < commentNodes.length; i++) {
				
				if (commentNodes[i].textContent.match(/(@idom)([\s+])(\w+)/)) {
					
					throw new Error("@idom linked nodes may only be placed within the Node Prototype, not in the Node itself)")
				}
				
				el.removeChild(commentNodes[i])
			}
		}
		
		if (el.innerHTML.match(/(idom-node-id\=)/)) {
				
			throw new Error("Node must not have any descendants with idom-node-id at time of caching\n" +
							"you may dynamically link other Nodes by inserting <!-- @idom [the idom-node-id for node you wish to nest without the brackets] --> anywhere inside the Node Prototype");
			// add path to element
		}
		
		// using 'id' on Node would match the original Node outside of the Node Prototype that is 
		// being linked. idom deals with this by changing the idom-instance-id 
		// attribute in Linked Nodes in the Node Prototype
		// adding a _linked suffix
		
		if (el.getAttribute("id" || el.children[0].getAttribute("id"))) {
			
			throw new Error("Node should not have an 'id' attribute (to query you may use document.querySelector with '[idom-node-id=someString]'");
			// add path to element
		}
			
		if (el.getAttribute("idom-instance-id\=")) {
			
			throw new Error("at time of caching, node should not have any idom-generated attributes");
			// add path to element
		}
				
		// cache virgin innerHTML of node 
		idomDOM.cache[nid] = el.innerHTML;		
	}
	
	idomDOM.initDone = true;
};

//idom.forEachExec(document.querySelectorAll('[idom-id$=someCloneUID]'), 'style.display = "block"')

idom.forEachExec = function(nodelist, str) {
	
	if (arguments.length != 2) {
		
		var e = new Error;
		
		e.message = "wrong number of arguments: requires: nodelist, str"
		
		throw e.message + "\n" + e.stack;
		
	}
	
	var exec = new Function("el", "el." + str);
	
	try {
		
		exec(nodelist[0] || nodelist);  
			
	} catch (e) {
		
		throw "invalid argument(s): " + e.message + "\n" + e.stack; 	
	}
	
	if (nodelist.length) {
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
	
	// this exception should never be reached
	if (!nodeId) {
		
		var err = new Error;
		
		err.message = "idomHandler() may only be used with idom nodes, usually passed as value to the idom$ variable for onclick, onmouseover, etc";
					 
		throw err.message + '\n' + err.stack;
	}

	var instanceId = el.getAttribute("idom-instance-id") ? el.getAttribute("idom-instance-id") : getInstanceId();
	
	if (instanceId) {
		
		func.call(el, event, nodeId, instanceId, nodeId.substring(nodeId.indexOf('@cloned@')  + 8));
		
	} else {
		func.call(el, event, nodeId, null, nodeId.substring(nodeId.indexOf('@cloned@')  + 8));
	}
};


//useful when assigning spaced or hyphenated strings from JSON/AJAX to idom$() setttings such as instanceId  

idom.toCamelCase = function() {
	  return this.replace(/[\-_]/g, " ").replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
	    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
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
	

// internal String method for injecting values into special varariable (keys) into the node prototype instance, 
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
				
				// despite nid and instance are shared with original node, any linked instance of it and
				// the clone this ends up being a globally unique key because the cloneId is required for 
				// idom$() insertion and points to the future or current clone id, which is globally unique
				// It is also unique within the clone because no more than one instance of a given node
				// may be linked into the host node (from which the clone is made) 
				
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
			
			var key = match.substr(idom.regexLength);
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

// add nextSiblingElement and previousSiblingElement to Element prototype

Element.prototype.nextSiblingElement =  Element.prototype.nextSiblingElement || function() {
	
	var elem = this;
	
	do {
        elem = elem.nextSibling;
    } while (elem && elem.nodeType != 1);
    
    return elem;
};

Element.prototype.previousSiblingElement =  Element.prototype.previousSiblingElement || function() {
	
	var elem = this;
	
	do {
        elem = elem.previousSibling;
    } while (elem && elem.nodeType != 1);
    
    return elem;
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
	
	var nid = this.getAttribute('idom-node-id').replace(new RegExp("([@])(.)+$", "g"), "");

	if (!idomDOM.cache[nid]) {
		
		// node was added after idom.init() 
		var err = new Error;
			
		err.message = "node was not cached";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	// Todo: need to compose a regex pattern based on the node's template where idom node variables are replaced with 
	// wildcards and the whole pattern repeating {1,} to see if the element has been wrongly updated 
	// (from outside of idom), i.e. will not match the pattern, which would throw an error
	
	var cloneId = arguments[0];
	
	// assuming simple JSON
	var json = arguments[1];
	
	// assuming simple JSON
	var settings = arguments[2];
	
	if (!cloneId) {
		
		var err = new Error;
			
		err.message = "required argument: associated clone id (string)";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	if (!json) {
		
		var err = new Error;
			
		err.message = "required argument: data (json)";
					 
		throw err.message + '\n' + err.stack;	
	}
	
	if (settings) {
		
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
			
		} else if (settingsStr.match(idom.regex)) {
			
			var err = new Error;
			
			err.message = "Invalid settings: idom node variables found in settings";
			 
			throw err.message + '\n' + err.stack;
		}
			
	}
		
	if (!this.children[0] ||
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
				
				err.message = "instanceId must be specified in settings when inserting a new instance of the node prototype"
				 
				throw err.message + '\n' + err.stack;
				
		}
		
		if (settings.instanceId.indexOf('@') != -1) {
				
				var err = new Error;
				
				err.message = "instanceId in settings must not include any references to link or clone (they will be added automatically) \n" +
							"use idom.baseSelector(long@format@instance@id) to get the original instance id"
				 
				throw err.message + '\n' + err.stack;
				
		}
		
		//all error paths hanlded in this case, so 
		this.innerHTML = idomDOM.cache[nid]._idomMapValues(json, {"instanceId": settings.instanceId.replace(new RegExp("([@])(.)+$", "g"), ""), "nid": nid, "cloneId": cloneId});
			
		setInstanceId(this.children[0]);
		
		// insert Linked Nodes
		insertLinkedNodes(this.children[0], cloneId);

		// nothing else to do
		return;
		
	// else (general case)					
	} else {
		
			if (!settings.instanceId) {
			
				var err = new Error;
				
				err.message = "instanceId must be specified in settings when inserting a new instance of the node prototype"
				 
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
				
				if (!targetNodeList.length) {
								
					var err = new Error;
			
					err.message = "Invalid setting: targetInstanceId (" + settings.targetInstanceId + ") does not match " + 
					"the idom-instance-id of any of the instances of the Node Prototype of the Node idom$() is invoked on\n";
					 
					throw err.message + '\n' + err.stack;	
				}; 
			} 
					
			tag = this.children[0].tagName;
			
			// populate instance of the Node Prototype with data     
			content = idomDOM.cache[nid]._idomMapValues(json, {"instanceId": settings.instanceId.replace(new RegExp("([@])(.)+$", "g"), ""), "nid": nid, "cloneId": cloneId});
			
			newChild = document.createElement(tag); 
			
			newChild.innerHTML = content;
			
			// Create document fragment to hold the populated instance
			frag = document.createDocumentFragment();
			
			frag.appendChild(newChild.children[0]);	
			
			switch (settings.mode) {
				
				case null: case '': case "replace": 
					
					if (settings.targetInstanceId) {
						
						if (targetNodeList.length > 1) {
							
							// replace all matched targets with the new instance of the Node Prototype
							for (var n = 0; n < targetNodeList.length; n++) {
							
								this.insertBefore(frag.cloneNode(true), targetNodeList[n]);
								
								newEl[n] = targetNodeList[n].previousSiblingElement();
								
								this.removeChild(targetNodeList[n]);
								
								setInstanceId(newEl[n]);
								
								insertLinkedNodes(newEl[n], cloneId);
							}
							
						} else {
							
							this.insertBefore(frag.cloneNode(true), targetNodeList[0]);
								
							newEl[0] = targetNodeList[0].previousSiblingElement();
								
							this.removeChild(targetNodeList[0])
								
							setInstanceId(newEl[0]);
							
							insertLinkedNodes(newEl[0], cloneId);
								
						}
						
					} else {
						
						this.innerHTML = idomDOM.cache[nid]._idomMapValues(json, {"instanceId": settings.instanceId.replace(new RegExp("([@])(.)+$", "g"), ""), "nid": nid, "cloneId": cloneId});
						
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
						
						this.insertBefore(frag.cloneNode(true), targetEl.nextSiblingElement())
						
						newEl[0] = targetEl.nextSiblingElement();
						
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
							
						newEl[0] = targetNodeList[0].previousSiblingElement();
						
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
			
					err.message = "invalid or misspelled value for mode"
					 
					throw err.message + '\n' + err.stack;	
			}
			
			frag = null; 			
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
		
		if (nestedCommentNodes.length) {
			
			var linkedNodeIDList = '';
			
			for (var n = 0; n < nestedCommentNodes.length; n++) {
				
				var id = nestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/) ? nestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/)[3] : null;
				
				if (id) {
					
					if (linkedNodeIDList.indexOf(id) != -1) {
						
						var err = new Error;
						
						err.message = "duplicate linked node: only one instance of a given linked node is allowed per each instance of the host's node prototype";
						 
						throw err.message + '\n' + err.stack;
					}
					
					linkedNodeIDList += "," + id;
						
					var linkedNode = document.querySelector('[idom-node-id=' + id + ']');
					
					if (!linkedNode.idom$isPopulated()) {
						
						var err = new Error;
						
						err.message = "node must be populated before being linked";
						 
						throw err.message + '\n' + err.stack;
						
					}
					
					var recursiveNestedCommentNodes = linkedNode.getElementsByNodeType(8, true);
					
					for (var m = 0; m < recursiveNestedCommentNodes.length; m++) {
						
						var reId = recursiveNestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/) ? recursiveNestedCommentNodes[n].textContent.match(/(@idom)([\s+])(\w+)/)[3] : null;
						
						if (reId) {
							
							var err = new Error;
							
							err.message = "can't have a linked node within a linked node";
							 
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
	
	// instance ids iin idom$() call must all be void of @... it's added automatically.. users can use baseSelector  
};

// format: clonedNode = document.querySelector('#someNode').idom$clone(uid) 

Element.prototype.idom$clone = Element.prototype.idom$clone || function() { 
	
	if (!arguments.length) {
		
		var err = new Error;
		
		err.message = "you must provide uniqe id for the cloned node"
		 
		throw err.message + '\n' + err.stack;
	}
	
	if (!this.idom$isPopulated()) {
	 				
		var err = new Error;
		
		err.message = "the node must be populated before it may be cloned"
		 
		throw err.message + '\n' + err.stack;
	}

	var cloneId = arguments[0];
	
	var el = this.cloneNode(true);
	
	el.setAttribute("idom-node-id", el.getAttribute("idom-node-id") + "@cloned@" + cloneId);
	
	var linkedNodes = el.querySelectorAll("[idom-node-id]");
	
	if (linkedNodes) {
		
		if (linkedNodes.length) {
			
			for (var n = 0; n < linkedNodes.length; n++) {
				
				linkedNodes[n].setAttribute("idom-node-id", linkedNodes[n].getAttribute("idom-node-id") + "@cloned@" + cloneId)
			}
			
		} else if (linkedNodes) {
				
				linkedNodes.setAttribute("idom-node-id", linkedNodes.getAttribute("idom-node-id") + "@cloned@" + cloneId)
		}
	} 
	
	var els = el.querySelectorAll("[idom-instance-id]");
	
	if (els.length) {

			for (var n = 0; n < els.length; n++) {
				
				els[n].setAttribute("idom-instance-id", els[n].getAttribute("idom-instance-id") + "@cloned@" + cloneId)
			}
	
	} else if (els) {
		
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

	if (this.innerHTML == idomDOM.cache[nid] || !this.children[0]) {
		
		return false;
	}		
	
	return true;
	
};

// .idom$delete
//
// format: document.querySelector('#someNode').idom$delete([settings]) 
// settings: {'targetInstanceId': value}
//
// targetInstanceId: settingal: for specifying instance(s) of Node Prototype to delete. If null, reset node's innerHTML to Node Prototype
//

Element.prototype.idom$delete = Element.prototype.idom$delete || function() {
	
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
		
			if (this.innerHTML == idomDOM.cache[nid] || !this.children[0]) {
		
				var err = new Error;
				
				err.message = "node has not yet been populated (no matching instance)"
							 
				throw err.message + '\n' + err.stack;
			}
			
			for (var n = 0; n < this.children.length; n++) {
				
				if (this.children[n].getAttribute("idom-instance-id") == settings.targetInstanceId) {
					
					targetNodeList.push(this.children[n])
				}
			}
						
			if (!targetNodeList) {
							
				var err = new Error;
		
				err.message = "Invalid setting: targetInstanceId (" + settings.targetInstanceId + ") does not match" + 
				"any idom-instance-id in any instance of the Node Prototype of the Node idom$() is invoked on\n" + 
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
		$.fn.idom$delete = function() {
		
			// get Javascript's version of 'this' for Element
			var thisJS = this.get(0);		
			
		}

	})(jQuery);
} 