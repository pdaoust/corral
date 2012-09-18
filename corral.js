(function (win) {
	var resizeEventTimeoutID;

	var exists = function exists (val) {
		return val !== undefined && val !== null;
	};

	var bufferResizeEvent = function bufferResizeEvent() {
		// buffer resize events so the browser doesn't fire a zillion of them
		win.clearTimeout(resizeEventTimeoutID);
		resizeEventTimeoutID = win.setTimeout(checkAllCorrals, 100);
	};

	var checkMediaQuery = function (mediaQuery) {
		if (typeof win.matchMedia === 'function') {
			// look for native matchMedia first
			return win.matchMedia(mediaQuery).matches;
		} else if (typeof win.Modernizr === 'object' && typeof win.Modernizr.mq === 'function') {
			// look for Modernizr next, because it covers older browsers that
			// do support media queries but don't support matchMedia
			return Modernizr.mq(mediaQuery);
		}
		// otherwise, we don't support matching media queries via JavaScript
		return false;
	};

	var checkAllCorrals = function checkAllCorrals() {
		// iterate through all corrals, checking the media query of each of
		// their fences to determine whether we're inside those fences
		for (var corralName in corrals) {
			if (corrals.hasOwnProperty(corralName)) {
				var corral = corrals[corralName];
				var fences = ['min', 'max', 'both'];

				// check each fence in this corral to see if we're in it
				for (var i in fences) {
					if (fences.hasOwnProperty(i)) {
						var fence = fences[i];

						if (checkMediaQuery(corral.queryString(fence))) {
							// we've entered this fence
							corral.trigger('enter-' + fence);
						} else {
							// we've exited this fence
							corral.trigger('exit-' + fence);
						}
					}
				}
			}
		}
	};

	// all instantiated corrals will be stored here so that checkAllCorrals()
	// can iterate through them on each window resize event
	var corrals = {};

	// valid event names
	var eventNames = ['enter-min', 'enter-max', 'exit-min', 'exit-max', 'enter-both', 'exit-both'];

	// check for valid event names
	var isEventName = function isEventName (eventName) {
		return eventNames.indexOf(eventName) > -1;
	};

	// parse an event name into an event action, a callback action, an event
	// fence, and a callback fence, e.g.:
	//     {
	//         event: {action: 'enter', fence: 'min'},
	//         callback: {action: 'setup', fence: 'above'}
	//     }
	var parseEventName = function parseEventName (eventName) {
		if (!isEventName(eventName)) {
			return;
		}

		eventName = eventName.split['-'];
		var parsedEventInfo = {'event': {}, 'callback': {}};
		parsedEventInfo.event.action = eventName[0];
		parsedEventInfo.event.fence = eventName[1];
		parsedEventInfo.callback.action = eventName[0] === 'enter' ? 'setup' : 'teardown';

		switch (eventName[1]) {
			case 'min':
				// if we're inside the min fence, this means the
				// constraint is 'this corral and above'
				parsedEventInfo.callback.fence = 'above';
				break;
			case 'max':
				// if we're inside the max fence, this means the
				// constraint is 'this corral and below'
				parsedEventInfo.callback.fence = 'below';
				break;
			case 'both':
				// if we're inside both fences, this means the
				// constraint is 'only this corral'
				parsedEventInfo.callback.fence = 'only';
				break;
		}

		return parsedEventInfo;
	};

	// check to see whether we've been passed a callback, an array of callbacks,
	// or something invalid, clean it up, and pass it back as an array
	var sanitiseCallbacks = function sanitiseCallbacks(callbacks) {
		var sanitisedCallbacks = [];

		if ({}.toString.call(callbacks) === '[object Array]') {
			for (var i in callbacks) {
				if (callbacks.hasOwnProperty[i] && typeof callbacks[i] == 'function') {
					sanitisedCallbacks.push(callbacks[i]);
				}
			}
			return sanitisedCallbacks;
		} else if (typeof callbacks === 'function') {
			return [callbacks];
		} // returns undefined if it's not an array
	};

	// corral constructor
	var Corral = win.Corral = function CorralConstructor(newName, newAxis, newMin, newMax, newCallbacks) {
		var _props = {
			name: newName,
			axis: newAxis,
			min: null,
			max: null
		};
		var _callbacks = {
			'above': {'setup': [], 'teardown': [], 'isActive': false},
			'below': {'setup': [], 'teardown': [], 'isActive': false},
			'only': {'setup': [], 'teardown': [], 'isActive': false}
		};
		// add this corral to the list
		var _this = corrals[newName] = this;

		// min and max are both optional values, but one of them ought to be set
		// (if neither are set, then the events just don't fire)
		if (exists(newMin)) {
			_props.min = newMin;
		}
		if (exists(newMax)) {
			_props.max = newMax;
		}

		// were any callbacks passed? If so, add them to this corral
		if (typeof newCallbacks === 'object') {
			for (var fence in newCallbacks) {
				if (newCallbacks.hasOwnProperty(fence) && _callbacks.hasOwnProperty(fence)) {
					_callbacks[fence].setup = sanitiseCallbacks(newCallbacks[fence].setup);
					_callbacks[fence].teardown = sanitiseCallbacks(newCallbacks[fence].teardown);
				}
			}
		}

		// a generic accessor to get or set private values
		// follows jQuery convention: undefined arguments make the function act
		// as a getter; anything else (including null) makes it act as a setter
		var _getSet = function _getSet (prop, val) {
			if (val === undefined) {
				return _props[prop];
			} else {
				_props[prop] = val;
			}
		};

		// all the accessors for the public values
		this.name = function (val) {
			return _getSet('name', val);
		};

		this.axis = function (val) {
			return _getSet('axis', val);
		};

		this.min = function (val) {
			return _getSet('min', val);
		};

		this.max = function (val) {
			return _getSet('max', val);
		};

		// find out if a given constraint in this
		this.isActive = function(callback) {
			if (_callbacks.hasOwnProperty(callback)) {
				return _callbacks[callback].isActive;
			} else {
				throw new Exception('Corral.isActive(): invalid callback name');
			}
		};

		// event binding -- takes a callback or array of callbacks
		this.on = function corralOn(eventName, callbacks) {
			if (isEventName(eventName)) {
				callbacks = sanitiseCallbacks(callbacks);
				var eventInfo = parseEventName(eventName);

				if (callbacks !== undefined) {
					for (var i in callbacks) {
						if (callbacks.hasOwnProperty(i)) {
							_callbacks[eventInfo.callback.fence][eventInfo.callback.action].push(callbacks[i]);
						}
					}
				} else {
					throw new Exception('Corral.on(): no callback(s) passed');
				}
			} else {
				throw new Exception('Corral.on(): unknown eventName ' + eventName);
			}
		};

		// event unbinding
		this.off = function corralOff(eventName, callbacks) {
			var i;

			if (isEventName(eventName)) {
				var eventInfo = parseEventName(eventName, 'constraint');

				if (callbacks !== undefined) {
					callbacks = sanitiseCallbacks(callbacks);

					if (callbacks !== undefined) {
						for (i in callbacks) {
							if (callbacks.hasOwnProperty(i)) {
								// check for existence of callback in the already
								// set up callbacks
								var callbackIndex = _callbacks[eventInfo.callback.fence][eventInfo.callback.action].indexOf(callback);
								if (callbackIndex > -1) {
									// only get rid of this function
									delete _callbacks[eventInfo.callback.fence][eventInfo.callback.action][callbackIndex];
								}
							}
						}
					} else {
						// something funky; we weren't passed any valid callbacks
						throw new Exception('Corral.off(): no valid callbacks passed');
					}
				} else {
					// if a callback wasn't specified, then delete all callbacks
					// for this event
					for (i in _callbacks[eventInfo.callback.fence][eventInfo.callback.action]) {
						if (_callbacks[eventInfo.callback.fence][eventInfo.callback.action].hasOwnProperty(i)) {
							delete _callbacks[eventInfo.callback.fence][eventInfo.callback.action][i];
						}
					}
				}
			} else {
				throw new Exception('Corral.off(): unknown eventName ' + eventName);
			}
		};

		// event triggering
		this.trigger = function corralTrigger(eventName) {
			// check to see if this is a valid event
			if (isEventName(eventName)) {
				var eventInfo = parseEventName(eventName);

				if ((_this.isActive(eventInfo.callbacks.fence) && eventInfo.callbacks.action === 'setup') ||
					(!_this.isActive(eventInfo.callbacks.fence) && eventInfo.callbacks.action === 'teardown')) {
					// don't bother firing if the event has already been fired
					// -- either an exit event has been fired and the corral is
					// already inactive, or an enter event has been fired and
					// the corral is already active
					return;
				}

				// set the active flag appropriately
				_callbacks[eventInfo.callbacks.fence].isActive = (eventInfo.callbacks.fence === 'setup');

				// setup or teardown the callbacks that pertain to this event
				for (var i = 0; i < _callbacks[eventInfo.callbacks.fence][eventInfo.callbacks.action].length; i ++) {
					_callbacks[eventInfo.callbacks.fence][eventInfo.callbacks.action][i]();
				}
			} else {
				throw new Exception('Corral.trigger(): unknown eventName ' + eventName);
			}
		};

		// media query generation
		this.queryString = function queryString(fence) {
			switch (fence) {
				case 'min':
				case 'max':
					return '(' + fence + '-' + _this.axis() + ':' + _this[fence]() + ')';
				case 'both':
					return _this.queryString('min') + ' and ' + _this.queryString('max');
			}
		};
	};

	Corral._event = function _event (eventType, corral, eventName, callback) {
		if (bindType === 'on' || bindType === 'off' || bindType === 'trigger') {
			if (bindType === 'trigger') {
				// the trigger event is handled by this method, but it shouldn't
				// have any callback
				callback = undefined;
			}
			if (corral instanceof Corral) {
				// passed corral is a Corral object; call it directly
				return corral[bindType](eventName, callback);
			} else if (corrals.hasOwnProperty(corral)) {
				// passed corral is a corral name; call it from the hash of
				// instantiated corrals
				return corrals[corral][bindType](eventName, callback);
			}
		} else {
			throw new Exception('Corral._bindOrUnbind(): bindType ' + bindType + 'is invalid');
		}
	};

	Corral.on = function onCorral(corral, eventName, callback) {
		return Corral._event('on', corral, eventName, callback);
	};

	Corral.off = function offCorral(corral, eventName, callback) {
		return Corral._event('off', corral, eventName, callback);
	};

	Corral.trigger = function triggerCorral(corral, eventName) {
		return Corral._event('trigger', corral, eventName);
	};

	Corral.remove = function deleteCorral(corral) {
		if (corral instanceof Corral) {
			corralName = corral.name;
		} else {
			corralName = corral;
		}

		if (corrals.hasOwnProperty(corralName)) {
			delete corrals[corralName];
			return true;
		}
		return false;
	};

	Corral.prototype.remove = function deleteThisCorral() {
		Corral.remove(this);
	};

	if (win.addEventListener) {
		win.addEventListener('resize', bufferResizeEvent, false);
	} else if (win.attachEvent) {
		win.attachEvent('onresize', bufferResizeEvent);
	} else {
		win.onresize = bufferResizeEvent;
	}

}(window));
