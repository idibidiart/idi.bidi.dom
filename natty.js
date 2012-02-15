/*! natty.js -- NiNu's Anti-Templating 

Copyright (c) Marc Fawzi, NiNu, Inc. 2011

BSD License 

*/

/******************************************************************************
 * 
 * README:
 * 
 * This version works in Gecko and Webkit, not tested on IE
 *
 * NattyJS - NiNu's Anti-Templating
 *
 * "All the separation and none of the baggage" 
 *
 * What is it? 
 *
 * Data-Driven DOM-Based "Templating" Without The Templates    
 *
 * How Does It Work?
 * 
 * Natty works by caching the virgin innerHTML (the Node Prototype) of all DOM 
 * elements (the Nodes) that have a 'natty-node-id' attribute at window.onload 
 * or $(document).ready. Each Node must contain exactly one direct child at time 
 * of caching, i.e. the Node Prototype, which must contain special variables (in 
 * its inner/outer HTML) to be replaced, in a global, dynamic fashion, with JSON 
 * data (with the scope being the inner/outer HTML of a newly created instance of 
 * the Node Prototype)
 *
 * The Node Prototype may hold an arbitrarily complex DOM structure, and one in 
 * which Node(s) defined elsewhere in the DOM may be dynamically linked by 
 * reference (called Linked Nodes)
 *
 * Natty works by creating an instance of the Node Prototype and populating the 
 * special variables in it with dynamic JSON data (where the JSON keys must 
 * correspond to the special variables in the Node Prototype) and then inserting 
 * the newly populated instance into the Node itself, using replace (default on 
 * first insertion), append or prepend methods, as applied to the Node's entire 
 * content (the virgin innerHTML or all populated instances of the Node Prototype
 * that were previously inserted into the Node) or specific, previously inserted
 * instance(s) of the Node Prototype.
 *
 * Natty allows the DOM to be decomposed into Nodes each having a Node Prototype
 * from which instances (copies) can be created, populated with JSON data and then 
 * inserted into the Node (in append, prepend, and replace modes, with the 
 * ability to target specific, previously inserted instances of the Node Prototype 
 * or the Node's entire content, i.e. the entire set of instances of the Node 
 * Prototype) and where the Node itself can be dynamically linked into other Nodes, 
 * which can be linked into other Nodes, and so on...
 * 
 * Examples: 
 *
 * Take a look at test.html
 *
 * See Notes under String.prototype._nattyMapValues for the expected JSON format
 * 
 * Main Invocation Pattern
 *
 * .n$ 
 *
 * document.querySelector('#someNode').n$(data [, options])
 *
 * behavior: creates new instance of Prototype Node using data to populate the 
 * special variables in Prototype Node, then append/prepend to (or replace) 
 * existing instance(s) in the Node
 *
 * >> data: {key: value, key: value, key: value, etc} 
 * where the keys must match the natty node variables in the Node Prototype minus
 * the n$ prefix
 *
 * >> options: {mode: 'replace'|'append'|'prepend', targetSelector: value, 
 * ownSelector: value, nodeSelector: value, targetState: value, ownState: value, 
 * nodeState: value}
 *
 * if there no populated instances of Prototype Node exist (or if the Node's 
 * innerHTML was deleted after or before populated instances of Prototype Node 
 * were inserted) then append/prepend/replace will all replace the Node's 
 * entire content (if targetSelector is supplied in this case it will throw 
 * an error, so unless you are sure, you may want to call .$isPopulated() before 
 * invoking this method with targetSelector or stateSelector options)
 *
 * targetSelector: optional natty-selector value for instance(s) of Prototpe Node
 * to insert the new instance at in append and prepend modes. If null, then 
 * append/prepend new instance at last/1st instance
 *
 * targetSelector: optional natty-selector value for instance(s) of Prototpe 
 * Node to insert into in replace mode. If null, replace entire content of Node
 *
 * ownSelector: new value of natty-selector value for instance of Prototpe Node 
 * being inserted
 *
 * ownState: new value of natty-state attribute for instance of Prototpe Node 
 * being inserted
 *
 * targetState: optional natty-selector value for instance of Prototpe Node to in
 * sert at in append and prepend modes targetState: optional natty-selector value
 * for instance of Prototpe Node to insert at in replace mode
 *
 * nodeSelector: new value of natty-selector for the Node itself
 *
 * nodeState: new value of natty-state for the Node itself
 * 
 *
 *********************************************************************************
 * 
 * Other available are methods are 
 *
 * .n$delete([options]) which can delete certain instances of the Node Prototype 
 * or all instances children (this method is untested as of this release but it 
 * should work fine, report bugs)
 *
 * .n$isPopulated() may be queried before specifying targetSelector or targetState 
 * to verify existence of populated instance(s) of Node Prototype (the targets) 
 *
 * 
 *********************************************************************************/

// define the glpbal Natty object
var Natty = {}

// user defined iteration and DOM traversal functions should be added to Natty.user
// Example: Natty.user.someFunction = function () { ... }
Natty.user = {}
 
Natty.version = "0.08"

// define regular expression (RegEx) pattern for Prototype variables. use n$ since that can't be confused 
Natty.regex = /(n\$\w+)/g;

// define length of Prototype variables pattern
Natty.regexLength = 2;

// define regular expression (RegEx) pattern for Natty.init() variables. use i$ since that can't be confused 
Natty.presetRegEx =  /(i\$\w+)/g;

// define length of DOM presets pattern
Natty.initRegexLength = 2;

// special objects for use by natty
Natty.internal = {};

// for internal use
Natty.internal.cache = {};

// init method to be called from window.onload or $(document).ready 
Natty.init = function(json) {
	
	// re-cache()'ing must be avoided as the DOM will have changed, 
	// which would cause the cached templates to be out of sync 
	// with the DOM 
	
	if (Natty.internal.initDone) {
		return;
	}
	
	if (!Element || !NodeList || !String) {
		
		var err = new Error;
			
		err.message = "This browser is not supported: some basic Javascript objects are missing"
					 
		throw err.message + '\n' + err.stack;
		
	}
	
	// populate natty init() variables before caching
	if (json) {
		
		document.documentElement.innerHTML  = document.documentElement.innerHTML._nattyMapValues(json, true);
	}
	
	// fetch all elements with natty-node-id
	var els = document.querySelectorAll('[natty-node-id]');
	
	// convert the NodeList object into a primitive/more convenient Array type 
	var elsArray = Array.prototype.slice.call(els, 0);
	
	// dump the Nodelist
	els = null;
	
	// iterate thru the list roots
	for (var n = 0; n < elsArray.length; n++) {
	
		var el = elsArray[n];
		
		var nid = el.getAttribute('natty-node-id');
		
		if (Natty.internal.cache[nid]) {
			
			throw new Error("natty-node-id is in use by another Node");
			// add path to element
		}
		
		if (!nid) {
			
			throw new Error("Node must have natty-node-id attribute set to a non-empty string value");
			// add path to element
		}
		
		if (nid.match(Natty.regex)) {
			
			throw new Error("natty-node-id must not contain a special variable. ");
			// add path to element
		}
		
		if (el.tagName.toLowerCase() == "iframe") {
			
			throw new Error("iframe is not allowed as Node. you must load and use natty from within the iframe");
			// add path to element
		}
		
		// verify only one Node Prototype exists 
		// verify no @natty comment nodes exist outside of direct child 
		// (to keep all elements within the Node Prototype)
		if (el.children.length != 1) { 
				
			throw new Error("at the time of caching, node must contain just one child as Node Prototype." + 
							"you may use a div to encapsulate multiple descendants.");
			// add path to element
		}
		
		var commentNodes = el.getElementsByNodeType(8);
		
		if (commentNodes.length) {
			
			for (var n = 0; n < commentNodes.length; n++) {
				
				if (commentNodes[i].textContent.match(/(@natty)([\s+])(\w+)/)[3]) {
					
					throw new Error("Node must not have any @natty comment nodes (may only use within the Node Prototype)")
				}	
			}
		}
		
		if (el.innerHTML.match(/(natty-node-id)/)) {
				
			throw new Error("Node must not have any descendants with natty-node-id (reserved for the Node itself). " +
							"you may dynamically link other Nodes by inserting <!-- @natty [the natty-node-id for node you wish to nest without the brackets] --> anywhere inside the Node Prototype");
			// add path to element
		}
		
		// using 'id' on Node would match the original Node outside of the Node Prototype that is 
		// being linked. Natty deals with this by changing the natty-selector and natty-state 
		// attributes in Linked Nodes (the cloned copies linked inside the Node Prototype) by 
		// adding a _linked suffix
		
		if (el.getAttribute("id")) {
			
			throw new Error("Node should not have an 'id' attribute (instead, set nodeSelector or nodeState in options and use document.querySelector with '[natty-selector=someString]' or '[natty-state=someString]')");
			// add path to element
		}
		
		// using 'id' on Node Prototype would match all instances of it inside the Node
		if (el.children[0].getAttribute("id")) {
			
			throw new Error("Node Prototype should not have an 'id' attribute (instead, set ownSelector or ownState in options and use document.querySelector with '[natty-selector=someString]' or '[natty-state=someString]')");
			// add path to element
		}
			
		if (el.getAttribute("natty-state") || el.getAttribute("natty-selector")) {
			
			throw new Error("at time of caching, node should not have any natty-generated attributes");
			// add path to element
		}
		
		if (el.innerHTML.match(/(natty-selector)/) || el.innerHTML.match(/(natty-state)/)) {
			
			throw new Error("at time of caching, node's innerHTML must not contain any natty-generated attributes");
			// add path to element
		}
				
		// cache virgin innerHTML of node 
		Natty.internal.cache[nid] = el.innerHTML;		
	}
	
	Natty.internal.initDone = true;
};

// String method for injecting values into special varariable (keys) in the Node Prototype, 
// based on key-value JSON data (key-matched variables get their values from JSON values while unmatched
// ones get empty string) -- for internal use

String.prototype._nattyMapValues = String.prototype._nattyMapValues || function() {
	
	// take the first argument, assuming simple JSON
	var json = arguments[0];
	
	var forInit = arguments[1];
	
	var jsonStr, jsonErr; 
	
	var pattern = Natty.internal.initDone ? Natty.regex : Natty.presetRegEx;
	
	var patternLength = Natty.internal.initDone ? Natty.regexLength : Natty.initRegexLength;
	
	try {
		
		jsonStr =JSON.stringify(json);
	
	} catch(e) {
		
		jsonErr = true;
	}
	
	// primitive, fast error checking ... 
	if (jsonErr || jsonStr.match(/[\{]{2,}|[\[]/) ) {
		
		var err = new Error;
			
		err.message = "Invalid data: use simple JSON: {someKey: 'value', anotherKey: 5, yetAnotherKey: 'anotherValue'}"
					 
		throw err.message + '\n' + err.stack;
		 
		// Notes:
		//
		// natty works with simple JSON
		// 
		// 'simple JSON' is defined as a key-value collection, limited to string or numeric values 
		// Like {someKey: 'value', anotherKey: 5, yetAnotherKey: 'anotherValue'}
		
		// Use Javascript to iterate thru more complex JSON then pass on simple JSON to natty
		
	} else if (jsonStr.match(Natty.regex)) {
		
		var err = new Error;
			
		err.message = "Invalid data: natty node variables found in json"
					 
		throw err.message + '\n' + err.stack;
	}
		
	// RegEx will iterate thru the natty node variables (keys) in target element's virgin innnerHTML (the template), 
	// match to JSON values (by key) from left to right, replace the pseduo vars that match the supplied
	// keys in JSON with the JSON values (including null values), and return the the modified string for 
	// updating the target element's innerHTML
	
	if (!forInit) {
		
		return this.replace(Natty.regex, function(match) { 
			
			// if natty init() variable exists and has a value, replace with JSON value for corresponding key
			
			if (json[match.substr(Natty.regexLength)]) {
				
				return json[match.substr(Natty.regexLength)];
				
			} else {
				
				// if natty init() variable is missing or has an empty string value return an empty string in its place	
				return '';
			}
		}); 
		
	}	else {
		
		return this.replace(Natty.presetRegEx, function(match) { 
			
			// if special variable exists and has a value, replace with JSON value for corresponding key
			
			if (json[match.substr(Natty.initRegexLength)]) {
				return json[match.substr(Natty.initRegexLength)];
			
			} else {
				
				// if special variable is missing or has an empty string value return an empty string in its place	
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
 
// add foeEachExec method to indexable objects (used by Natty for NodeList)
// like so: 
// document.querySelectorAll('[natty-selector$=linked]').forEachExec('style.display = "block"')

Object.prototype.forEachExec = Object.prototype.forEachExec || function() {
 		
	var objArray = Array.prototype.slice.call(this, 0);
	
	if (!objArray.length) {
		
		var e = new Error;
		
		e.message = "object must be indexable"
		
		throw e.message + "\n" + e.stack; 
	}
 	
 	str = arguments[0];
 	
 	var exec = new Function("el", "el." + str);
 	
 	try {
 		
 		exec(objArray[0]);  
 			
 	} catch (e) {
 		
 		throw "invalid exec: " + e.message + "\n" + e.stack; 	
 	}
 	
 	for (var n = 1; n < objArray.length; n++) {
 		
 		exec(objArray[n]);	
 	}	
};

// .n$  (main natty method)
//
// format: document.querySelector('#someNode').n$(data [, options])
// action: create new instance of Node Prototype using 'data' (json) to populate the special variables in the Node,
// then append/prepend to (or replace) existing instance(s) of Node Prototype in the Node
//
// data: {key: value, key: value, key: value, etc} 
// where the keys must match the Node variable minus the n$ prefix
//
// options: {mode: 'replace'|'append'|'prepend', targetSelector: value, ownSelector: value,
// nodeSelector: value, targetState: value, ownState: value, nodeState: value}
//
// if there no populated instances of Node Prototype exist (or if the Node's innerHTML was deleted after or before 
// populated instances of Node Prototype were inserted) then append/prepend/replace will all replace the Node's 
// entire innerHTML (if targetSelector is supplied in this case it will throw an error, so be call .$isPopulated() to 
// be sure, before invoking this method with targetSelector)
//
// targetSelector: optional natty-selector value for instance of Prototpe Node to insert into Node in append and prepend modes. 
// If null, append/prepend at last/1st instance of Node Prototype
//
// targetSelector: optional natty-selector value for instance of Prototpe Node to insert into Node in replace mode. 
// If null, replace entire innerHTML of node
//
// ownSelector: new value of natty-selector value for instance of Prototpe Node being inserted
//
// ownState: new value of natty-state attribute for instance of Prototpe Node being inserted
//
// targetState: optional natty-selector value for instance of Prototpe Node to insert *at* in append and prepend modes 
// targetState: optional natty-selector value for instance of Prototpe Node to insert *at* in replace mode
//
// nodeSelector: new value of natty-selector for the Node itself
// 
// nodeState: new value of natty-state for the Node itself

Element.prototype.n$ = Element.prototype.n$ || function() {
	
	if (!Natty.internal.initDone) {
		
		var err = new Error;
			
		err.message = "you must run Natty.init() from window.onload or $(document).ready before invoking .n$ methods"
					 
		throw err.message + '\n' + err.stack;
	}
	
	var nid = this.getAttribute('natty-node-id');
	
	if (!Natty.internal.cache[nid]) {
		
		// node was added after Natty.init() 
		var err = new Error;
			
		err.message = "node was not cached"
					 
		throw err.message + '\n' + err.stack;	
	}
	
	// Todo: need to compose a regex pattern based on the node's template where natty node variables are replaced with 
	// wildcards and the whole pattern repeating {1,} to see if the element has been wrongly updated 
	// (from outside of natty), i.e. will not match the pattern, which should throw an error
	
	// take the first argument, assuming simple JSON
	var json = arguments[0];
	
	// take the second argument, assuming simple JSON
	var options = arguments[1];
	
	if (!(arguments[0])) {
		
		var err = new Error;
			
		err.message = "required argument: data (json)"
					 
		throw err.message + '\n' + err.stack;	
	}
	
	if (options) {
		
		var optErr, optionsStr;
			
		try {
			
			optionsStr = JSON.stringify(options);
			
		} catch (e) {
			
			optErr = true;
		}
		
		// primitive, fast error checking ... 
		if (optErr || optionsStr.match(/[\{]{2,}|[\[]/)) {
			
			var err = new Error;
			
			err.message = "Invalid options: use simple JSON. {someKey: 'value', anotherKey: 5, yetAnotherKey: 'anotherValue'}"
			 
			throw err.message + '\n' + err.stack;
			
			// Notes:
			//
			// natty works with simple JSON
			// 
			// 'simple JSON' is defined as a key-value collection, limited to string or numeric values 
			// Like {someOption: 'value', anotherOption: 'anotherValue', etc}
			
		} else if (optionsStr.match(Natty.regex)) {
			
			var err = new Error;
			
			err.message = "Invalid options: natty node variables found in options"
			 
			throw err.message + '\n' + err.stack;
			
		}
	}
	
	// if Node contains no populated instances of its Prototype Node or no options were given
	// or no target/mode is specified	
	if (this.innerHTML == Natty.internal.cache[nid] || !this.children || 
		!options || options == {} || 
		(options && !(options.targetSelector || options.targetState || options.mode))) {
		
		if (options) {
			
			if (options.targetSelector) {
				
				if (this.innerHTML == Natty.internal.cache[nid] || !this.children) {

					var err = new Error;
			
					err.message = "Invalid option: targetSelector cannot be applied: this Node currently has no populated instances of its Node Prototype"
					 
					throw err.message + '\n' + err.stack;
							
				}
				
			}
		}
		
		this.innerHTML = Natty.internal.cache[nid]._nattyMapValues(json);
		
		if (options) {
			
			setOwnAttributes(this.children[0]);
			
			setNodeAttributes(this);	
		}
		
		// insert Linked Nodes
		insertLinkedNodes(this.children[0]);
		
		// nothing else to do
		return;
		
	// else (if node has been populated and options were given)					
	} else {
		
		if (options) {
			
			var targetNodeList = [], newEl = [], tag, content, newChild, frag;
			
			if (options.targetSelector && !options.targetState) {
				
				targetNodeList = this.querySelectorAll('[natty-selector=' + options.targetSelector +']');
						
				if (!targetNodeList.length) {
								
					var err = new Error;
			
					err.message = "Invalid option: targetSelector does not match natty-selector in any instance of the Node Prototype"
					 
					throw err.message + '\n' + err.stack;	
				} 
				
			} else if (!options.targetSelector && options.targetState) {	
				
				targetNodeList = this.querySelectorAll('[natty-state=' + options.targetState +']');
					
				if (!targetNodeList.length) {
								
					var err = new Error;
			
					err.message = "Invalid option: targetState does not match natty-state in any instance of the Node Prototype"
					 
					throw err.message + '\n' + err.stack;	
				} 
				
			} else if (options.targetSelector && options.targetState) {	
				
				// assumes AND for now... targetCombinator option will be added to allow specifying logical operator
							
				targetNodeList = this.querySelectorAll('[natty-selector=' + options.targetSelector +'][natty-state=' + options.targetState + ']');
				
							
				if (!targetNodeList.length) {
								
					var err = new Error;
			
					err.message = "Invalid option: 'targetSelector AND targetState' do not match natty-selector/natty-state combination in any instance of the Node Prototype";
					 
					throw err.message + '\n' + err.stack;	
				} 
				
			}
			
			// if not doing a whole innerHTML replace
			if (options.targetSelector || options.targetState || options.mode == 'append' || options.mode == 'prepend') {
					
				tag = this.children[0].tagName;
				
				// populate instance of the Node Prototype with data     
				content = Natty.internal.cache[nid]._nattyMapValues(json);
				
				newChild = document.createElement(tag); 
				
				newChild.innerHTML = content;
				
				// Create document fragment to hold the populated instances
				frag = document.createDocumentFragment();
				
				frag.appendChild(newChild.children[0])	
			}	
			
			switch (options.mode) {
				
				case null: case '': case "replace": 
					
					if (options.targetSelector || options.targetState) {
						
						if (targetNodeList.length > 1) {
							
							// replace all matched targets with the new instance of the Node Prototype
							for (var n = 0; n < targetNodeList.length; n++) {
							
								this.insertBefore(frag.cloneNode(true), targetNodeList[n]);
								
								newEl[n] = targetNodeList[n].previousSiblingElement();
								
								this.removeChild(targetNodeList[n]);
								
								insertLinkedNodes(newEl[n]);
								
								setOwnAttributes(newEl[n]);
							}
							
						} else {
							
							this.insertBefore(frag.cloneNode(true), targetNodeList[0]);
								
							newEl[0] = targetNodeList[0].previousSiblingElement();
								
							this.removeChild(targetNodeList[0])
								
							insertLinkedNodes(newEl[0]);
							
							setOwnAttributes(newEl[0]);
								
						}
						
					} else {
						
						this.innerHTML = Natty.internal.cache[nid]._nattyMapValues(json);
						
						newEl[0] = this.children[0];
						
						insertLinkedNodes(newEl[0]);
							
						setOwnAttributes(newEl[0]);
					}
			
				break;
				
				case "append":
				
				    if (options.targetSelector || options.targetState) {
						
						// append to last matched target
						if (targetNodeList.length > 1) {
							
							var targetEl = targetNodeList[targetNodeList.length - 1];
							 
							this.insertBefore(frag.cloneNode(true), targetEl.nextSiblingElement());
						
							newEl[0] = targetEl.nextSiblingElement();
							
							insertLinkedNodes(newEl[0]);
							
							setOwnAttributes(newEl[0]);
							
						} else {
							
							var targetEl = targetNodeList[0];
							
							this.insertBefore(frag.cloneNode(true), targetEl.nextSiblingElement())
							
							newEl[0] = targetEl.nextSiblingElement();
							
							insertLinkedNodes(newEl[0]);
							
							setOwnAttributes(newEl[0]);
						}	
						
					} else {
								
						 this.appendChild(frag.cloneNode(true));
					
						 newEl[0] = this.children[this.children.length - 1];
						 
						 insertLinkedNodes(newEl[0]);
							
						 setOwnAttributes(newEl[0]);
					}
			
				break;
				
				case "prepend":
				
					if (options.targetSelector || options.targetState) {
							
						// prepend to first matching target
						this.insertBefore(frag.cloneNode(true), targetNodeList[0]);
							
						newEl[0] = targetNodeList[0].previousSiblingElement();
						
						insertLinkedNodes(newEl[0]);
							
						setOwnAttributes(newEl[0]);
										
					} else {
						
						this.insertBefore(frag.cloneNode(true), this.children[0]);
						
						newEl[0] = this.children[0];
						
						insertLinkedNodes(newEl[0]);
							
						setOwnAttributes(newEl[0]);
					}
				
				break;
				
				default: 
				
					var err = new Error;
			
					err.message = "invalid or misspelled value for mode"
					 
					throw err.message + '\n' + err.stack;	
			}
			
			// set any natty node attributes supplied in options
			setNodeAttributes(this);  
			
			frag = null; 			
		}
	}	
	
	function setNodeAttributes(elem) {
		
		if (options.nodeSelector) {
			
			elem.setAttribute("natty-selector", options.nodeSelector);
		}
		
		if (options.nodeState) {
				
			elem.setAttribute("natty-state", options.nodeState);
		}
	}
	
	function setOwnAttributes(elem) {
		
		if (options.ownSelector) {
									
			elem.setAttribute("natty-selector", options.ownSelector);
		}
		
		if (options.ownState) {
				
			elem.setAttribute("natty-state", options.ownState);	
		}
	}
	
	function insertLinkedNodes(elem) {
		
		var nestedCommentNodes = elem.getElementsByNodeType(8, true);
		
		var linkedNodeID = '';
		
		if (nestedCommentNodes.length) {
			
			for (var n = 0; n < nestedCommentNodes.length; n++) {
				
				linkedNodeID = nestedCommentNodes[n].textContent.match(/(@natty)([\s+])(\w+)/)[3];
				
				if (linkedNodeID) {
				
						if (!Natty.internal.cache[linkedNodeID]) {
							
							var err = new Error;
			
							err.message = "Node Prototype contains a Linked Node reference to a Node that was not cached"
							 
							throw err.message + '\n' + err.stack;
							
						}
				} 
			
				var el = nestedCommentNodes[n].parentNode.insertBefore(document.querySelector('[natty-node-id=' + linkedNodeID + ']').cloneNode(true), nestedCommentNodes[n]);
				
				el.parentNode.removeChild(nestedCommentNodes[n]);
				
				el.removeAttribute("natty-node-id");
				
				var ownState = el.children[0].getAttribute("natty-state") || '';
				var ownSelector = el.children[0].getAttribute("natty-selector") || '';
				
				if (ownState) {
					 el.children[0].setAttribute("natty-state", ownState + "_linked");
				} 
				
				if (ownSelector) {
					el.children[0].setAttribute("natty-selector", ownSelector + "_linked");
				} 
				
				var nodeState = el.getAttribute("natty-state") || '';
				var nodeSelector = el.getAttribute("natty-selector") || '';
				
				if (nodeState) {
					 el.setAttribute("natty-state", nodeState + "_linked");
				} 
				
				if (nodeSelector) {
					el.setAttribute("natty-selector", nodeSelector + "_linked");
				} 
			}
		}		
	}
};

// format: document.querySelector('#someNode').n$isPopulated() 

Element.prototype.n$isPopulated = Element.prototype.n$isPopulated || function() {
	
	// .$isPopulated() may be used within loops, so it should be as light as possible
	
	if (!Natty.internal.initDone) {
		
		var err = new Error;
			
		err.message = "you must run Natty.init() from window.onload or $(document).ready before invoking .n$ methods"
					 
		throw err.message + '\n' + err.stack;
	}
	
	var nid = this.getAttribute('natty-node-id');
	
	if (!Natty.internal.cache[nid]) {
		
		var err = new Error;
			
		err.message = "node was not cached"
					 
		throw err.message + '\n' + err.stack;
	}

	if (this.innerHTML == Natty.internal.cache[nid] || !this.children) {
		
		return false;
	}		
	
	return true;
}

// .n$delete
//
// format: document.querySelector('#someNode').n$delete([options]) 
// options: {'targetSelector': value, targetState: value, nodeState: value, nodeSelector: value}
//
// targetSelector: optional: for specifying instance(s) of Node Prototype to delete. If null, delete node's entire innerHTML
//
// targetState: optional: for specifying instance(s) of Node Prototype to delete. If null, delete node's entire innerHTML
//
// nodeState: optional: new value of Node's natty-state attribute after modification
// nodeSelector: optional: new value Node's natty-selector attribute after modification

Element.prototype.n$delete = Element.prototype.n$delete || function() {
	
	if (!Natty.internal.initDone) {
		
		var err = new Error;
			
		err.message = "you must run Natty.init() from window.onload or $(document).ready before invoking .n$ methods"
					 
		throw err.message + '\n' + err.stack;
	}
	
	var nid = this.getAttribute('natty-node-id');
	
	if (!Natty.internal.cache[nid]) {
		
		var err = new Error;
			
		err.message = "node was not cached"
					 
		throw err.message + '\n' + err.stack;
	}
	
	if (!this.children) {
		
		// nothing to delete
		return;
	}
	
	// take options, assuming simple JSON
	var options = arguments[0];	
	
	var optionsStr, optErr;
	
	if (options) {
		
		try {
			
			optionsStr = JSON.stringify(options);
			
		} catch (e) {
			
			optErr = true;
		}
		
		// primitive, fast error checking ... 
		if (optErr || optionsStr.match(/[\{]{2,}|[\[]/)) {
			
			var err = new Error;
			
			err.message = "Invalid options: use simple JSON. {someKey: 'value', anotherKey: 5, yetAnotherKey: 'anotherValue'}"
						 
			throw err.message + '\n' + err.stack; 
			 
			// Notes:
			//
			// natty works with simple JSON
			// 
			// 'simple JSON' is defined as a key-value collection, limited to string or numeric values 
			// Like {someOption: 'value', anotherOption: 'anotherValue', etc}
			
		} else if (optionsStr.match(Natty.regex)) {
			
			var err = new Error;
			
			err.message = "Invalid data: natty node variables found in options"
						 
			throw err.message + '\n' + err.stack;
		}
		
		var targetNodeList = [];
		
		if (options.targetSelector) {
			
			if (options.targetSelector && !options.targetState) {
				
				var nodeSelector = document.querySelector('[natty-node-id=' + nid + ']');
				
				for (var n = 0; n < nodeSelector.children.length; n++) {
					
					if (nodeSelector.children[n].getAttribute("natty-selector") == options.targetSelector) {
						
						targetNodeList.push(nodeSelector.children[n])
					}
				}
							
				if (!targetNodeList) {
								
					var err = new Error;
			
					err.message = "Invalid option: targetSelector does not match natty-selector in any instance of the Node Prototype"
					 
					throw err.message + '\n' + err.stack;	
				}
				
			} else if (!options.targetSelector && options.targetState) {	
				
				var nodeSelector = document.querySelector('[natty-node-id=' + nid + ']');
				
				for (var n = 0; n < nodeSelector.children.length; n++) {
					
					if (nodeSelector.children[n].getAttribute("natty-state") == options.targetState) {
						
						targetNodeList.push(nodeSelector.children[n])
					}
				}	
				
				if (!targetNodeList) {
								
					var err = new Error;
			
					err.message = "Invalid option: targetSelector does not match natty-selector in any instance of the Node Prototype)"
					 
					throw err.message + '\n' + err.stack;	
				}
				
			} else if (options.targetSelector && options.targetState) {	
				
				var nodeSelector = document.querySelector('[natty-node-id=' + nid + ']');
				
				for (var n = 0; n < nodeSelector.children.length; n++) {
					
					if (nodeSelector.children[n].getAttribute("natty-state") == options.targetState &&
						nodeSelector.children[n].getAttribute("natty-selector") == options.targetSelector ) {
						
						targetNodeList.push(nodeSelector.children[n])
					}
					
				}
							
				if (!targetNodeList) {
								
					var err = new Error;
			
					err.message = "Invalid option: targetSelector does not match natty-selector in any instance of the Node Prototypee"
					 
					throw err.message + '\n' + err.stack;	
				}
			}
						
			for (var n = 0; n < targetNodeList.length; n++) {
				
				this.removeChild(targetNodeList[n]);
			}
		} 
		
		if (options.nodeState) {
						
			this.setAttribute("natty-state", options.nodeState);
		}
		
		if (options.nodeSelector) {
						
			this.setAttribute("natty-selector", options.nodeSelector);
		}
		
	} else {
		
		this.innerHTML = '';
	}
};

// this block is needed only for jQuery elements

if (typeof(jQuery) == 'function') {
	
	// all jQuery functions are exact replicas of the corresponding Element prototype extensions
	
	// Todo: move code from Element protype into separate function and call from there and from here 
		
	(function($) {
		
		// natty functions as plugins for jQuery 
		
		$.fn.n$ = function() {
			
			// get Javascript's version of 'this' for Element
			var thisJS = this.get(0);
			
			
		}
		
		// isPopulated
		$.fn.n$isPopulated = function() {
			
			// get Javascript's version of 'this' for Element
			var thisJS = this.get(0);
			
			
		}
	
		// delete
		$.fn.n$delete = function() {
		
			// get Javascript's version of 'this' for Element
			var thisJS = this.get(0);		
			
		}

	})(jQuery);
} 