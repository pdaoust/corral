(function (win) {
	var exists = function exists (val) {
		return val !== undefined && val !== null;
	};

	var isArray = function isArray(val) {
		return {}.toString.call(val) === '[object Array]';
	};

	var resizeEventTimeoutID;

	var throttleEvent = function throttleEvent(callback) {
		// throttle events so the browser doesn't fire a zillion of them
		win.clearTimeout(resizeEventTimeoutID);
		resizeEventTimeoutID = win.setTimeout(callback, 100);
	};

	var tryMediaQuery = function (mediaQuery) {
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

	// all instantiated corrals will be stored here so that checkAllCorrals()
	// can iterate through them on each window resize event
	var corrals = {};

	var checkAllCorrals = function checkAllCorrals() {
		// iterate through all corrals, checking the media query of each of
		// their fences to determine whether we're inside those fences
		for (var corralName in corrals) {
			if (corrals.hasOwnProperty(corralName)) {
				corrals[corralName].check();
			}
		}
	};

	// valid action names
	var actionNames = ['enter', 'exit'];

	// check for same
	var isActionName = function isActionName(actionName) {
		return actionNames.indexOf(actionName) > -1;
	};

	// valid fence names
	var fenceNames = ['min', 'max', 'both'];

	// check for same
	var isFenceName = function isFenceName(fenceName) {
		return fenceNames.indexOf(fenceName) > -1;
	};

	// check for valid event names
	var isEventName = function isEventName (eventName) {
		try {
			parseEventName(eventName);
		} catch (e) {
			return false;
		}
		return true;
	};

	// parse an event name into an action and a fence, e.g.:
	//     {
	//         action: 'enter',
	//         fence: 'min'
	//     }
	var parseEventName = function parseEventName (eventName) {
		var splitEventName = eventName.split('-');

		if (!isArray(splitEventName) || splitEventName.length < 2) {
			throw new Error('parseEventName(): event name doesn\'t seem to have a hyphen');
		}

		if (!isActionName(splitEventName[0])) {
			throw new Error('parseEventName(): action part of event name is invalid');
		}
		
		if (!isFenceName(splitEventName[1])) {
			throw new Error('parseEventName(): fence part of event name is invalid');
		}
		
		var parsedEventInfo = { 'action': splitEventName[0], 'fence': splitEventName[1] };
		return parsedEventInfo;
	};


	// check to see whether we've been passed a callback, an array of callbacks,
	// or something invalid, clean it up, and pass it back as an array
	var sanitiseCallbacks = function sanitiseCallbacks(callbacks) {
		var sanitisedCallbacks = [];

		if (!isArray(callbacks)) {
			if (typeof callbacks === 'function') {
				callbacks = [callbacks];
			} else {
				throw new Error('sanitiseCallbacks(): callbacks argument was not a function or array');
			}
		}

		for (var i in callbacks) {
			if (callbacks.hasOwnProperty(i)) {
				if (typeof callbacks[i] == 'function') {
					sanitisedCallbacks.push(callbacks[i]);
				} else {
					throw new Error('sanitiseCallbacks(): got a bad callback -- wasn\'t a function');
				}
			}
		}

		return sanitisedCallbacks;
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
			min: {enter: [], exit: [], active: false},
			max: {enter: [], exit: [], active: false},
			both: {enter: [], exit: [], active: false}
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
			if (!newCallbacks.hasOwnProperty('min') &&
				!newCallbacks.hasOwnProperty('max') &&
				!newCallbacks.hasOwnProperty('both') && (
					newCallbacks.hasOwnProperty('enter') ||
					newCallbacks.hasOwnProperty('exit')
				)
			) {
				// this doesn't have any specific sets of callbacks for each of
				// the fences, but it has either entry or exit callbacks, so
				// assume that it's a set of callbacks for 'both'
				newCallbacks = {'both': newCallbacks};
			}

			for (var fence in newCallbacks) {
				if (newCallbacks.hasOwnProperty(fence) && _callbacks.hasOwnProperty(fence)) {
					_callbacks[fence].enter = sanitiseCallbacks(newCallbacks[fence].enter);
					_callbacks[fence].exit = sanitiseCallbacks(newCallbacks[fence].exit);
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
		this.isActive = function isActive(fence) {
			if (_callbacks.hasOwnProperty(fence)) {
				return _callbacks[fence].active;
			} else {
				throw new Error('Corral.isActive(): invalid fence name');
			}
		};

		// event binding -- takes a callback or array of callbacks
		this.on = function corralOn(eventName, callbacks) {
			if (isEventName(eventName)) {
				callbacks = sanitiseCallbacks(callbacks);

				var eventInfo = parseEventName(eventName);

				for (var i in callbacks) {
					if (callbacks.hasOwnProperty(i)) {
						if (_this.isActive(eventInfo.fence) === (eventInfo.action === 'enter')) {
							// run this callback if it applies to this corral at
							// this time
							callbacks[i]();
						}
						_callbacks[eventInfo.fence][eventInfo.action].push(callbacks[i]);
					}
				}
			} else {
				throw new Error('Corral.on(): unknown event name ' + eventName);
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
								var callbackIndex = _callbacks[eventInfo.fence][eventInfo.action].indexOf(callbacks[i]);
								if (callbackIndex > -1) {
									// only get rid of this function
									delete _callbacks[eventInfo.callback.fence][eventInfo.action][callbackIndex];
								}
							}
						}
					} else {
						// something funky; we weren't passed any valid callbacks
						throw new Error('Corral.off(): no valid callbacks passed');
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
				throw new Error('Corral.off(): unknown eventName ' + eventName);
			}
		};

		// event triggering -- takes an event name (consisting of an action,
		// either 'enter' or 'exit'; and a fence, either 'min', 'max', or 'both'
		// and separated by a hyphen) and an optional flag to force this event
		// even if it's already active. The default behaviour is just to not
		// bother running the callbacks on this event if it's already active.
		this.trigger = function corralTrigger(eventName, force, triggerBoth) {
			if (typeof triggerBoth !== 'boolean') {
				triggerBoth = true;
			}

			// check to see if this is a valid event
			if (isEventName(eventName)) {
				var eventInfo = parseEventName(eventName);
				var fenceCallbacks = _callbacks[eventInfo.fence];

				if (_this.isActive(eventInfo.fence) === (eventInfo.action === 'enter') && !force) {
					// don't bother firing if the event has already been fired
					// -- either an exit event has been fired and the corral is
					// already inactive, or an enter event has been fired and
					// the fence is already active
					return;
				}

				// setup or teardown the callbacks that pertain to this event
				for (var i = 0; i < fenceCallbacks[eventInfo.action].length; i ++) {
					fenceCallbacks[eventInfo.action][i]();
				}

				// set the active flag appropriately
				fenceCallbacks.active = (eventInfo.action === 'enter');

				if (eventInfo.fence === 'both') {
					// set the active flag for both 'enter' and 'exit'
					_callbacks.min.active = _callbacks.max.active = fenceCallbacks.active;
				} else if (triggerBoth) {
					// now process all 'both' callbacks -- that is, callbacks
					// that apply only when we're in both fences of this corral
					var complement = (eventInfo.fence === 'min' ? 'max' : 'min');

					if (_this.isActive(complement)) {
						// only run the 'both' callbacks if the other fence is active too
						if (_this.isActive('both') !== (eventInfo.action === 'enter') && !force) {
							// as with above, don't run the 'both' callbacks if they're
							// already active, unless the force flag has been set
							_this.trigger(eventInfo.action + '-both');
						}
					}
				}
			} else {
				throw new Error('Corral.trigger(): unknown eventName ' + eventName + ', or else eventName has \'both\' in it');
			}
		};

		// after construction, check this corral to see if it's active
		this.check();
	};

	// cleanly remove a corral so it doesn't fire anymore
	Corral.prototype.remove = function deleteThisCorral() {
		Corral.remove(this);
	};

	// check to see if we're inside one or both of this corral's fences
	Corral.prototype.check = function checkThisCorral() {
		var fences = ['min', 'max'],
			fence;

		for (var i in fences) {
			if (fences.hasOwnProperty(i)) {
				fence = fences[i];

				if (tryMediaQuery(this.queryString(fence))) {
					if (!this.isActive(fence)) {
						this.trigger('enter-' + fence);
					}
				} else {
					if (this.isActive(fence)) {
						this.trigger('exit-' + fence);
					}
				}
			}
		}
	};

	// generate a media query for use in the above check
	Corral.prototype.queryString = function queryString(fence) {
		if (fence === 'min' || fence === 'max') {
			var fenceValue = this[fence]();
			if (!exists(fenceValue)) {
				// if this fence happens to be missing, assume 0 for the
				// bottom end and infinity for the top end. Of course, these
				// don't work well for media queries, so the bottom end is
				// 1px and the top end is 20000px. This allows you to create
				// open-ended corrals (e.g., no minimum fence)
				if (fence === 'min') {
					fenceValue = '1px';
				} else {
					fenceValue = '20000px';
				}
			}
			return '(' + fence + '-' + this.axis() + ':' + fenceValue + ')';
		} else {
			throw new Error('Corral.queryString(): fence should be min or max');
		}
	};

	// bind, unbind, or trigger an event on a specific corral -- used in the
	// functions below
	Corral._event = function _event (eventType, corral, eventName, callback) {
		if (eventType === 'on' || eventType === 'off' || eventType === 'trigger') {
			if (eventType === 'trigger') {
				// the trigger event is handled by this method, but it shouldn't
				// have any callback
				callback = undefined;
			}
			if (corral instanceof Corral) {
				// passed corral is a Corral object; call it directly
				return corral[eventType](eventName, callback);
			} else if (corrals.hasOwnProperty(corral)) {
				// passed corral is a corral name; call it from the hash of
				// instantiated corrals
				return corrals[corral][eventType](eventName, callback);
			}
		} else {
			throw new Error('Corral._event(): eventType ' + eventType + 'is invalid');
		}
	};

	// bind a function to an event on a specific corral
	Corral.on = function onCorral(corral, eventName, callback) {
		return Corral._event('on', corral, eventName, callback);
	};

	// unbind a function to an event on a specific corral
	Corral.off = function offCorral(corral, eventName, callback) {
		return Corral._event('off', corral, eventName, callback);
	};

	// trigger an event on a specific corral
	Corral.trigger = function triggerCorral(corral, eventName) {
		return Corral._event('trigger', corral, eventName);
	};

	// cleanly delete a corral by reference or by name
	Corral.remove = function deleteCorral(corral) {
		var corralName;

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

	Corral.get = function getCorral(corralName) {
		if (corrals.hasOwnProperty(corralName)) {
			return corrals[corralName];
		}
	}

	// get a hash of all breakpoints, their axes, and min/max values. Returns an
	// object in this format:
	//     {
	//          mobile: { axis: 'width', max: '20em' },
	//         	tablet: { axis: 'width', min: '20.0001em', max: '59.9999em' },
	//          desktop: { axis: 'width', min: '60em' }
	//          // et cetera for all the breakpoints you've defined
	//     }
	Corral.breakpoints = function getAllBreakpoints() {
		var breakpoints = {},
			corralName,
			breakpoint,
			corral;

		for (corralName in corrals) {
			if (corrals.hasOwnProperty(corralName)) {
				corral = corrals[corralName];
				breakpoint = {};
				breakpoint.axis = corral.axis();

				if (exists(corrals[breakpoints].min())) {
					breakpoint.min = corrals[breakpoints].min();
				}
				if (exists(corrals[breakpoints].max())) {
					breakpoint.max = corrals[breakpoints].max();
				}

				breakpoints[corralName] = breakpoint;
			}
		}

		return breakpoints;
	};

	var checkAllCorralsThrottled = function checkAllCorralsThrottled () {
		throttleEvent(checkAllCorrals);
	};

	if (win.addEventListener) {
		win.addEventListener('resize', checkAllCorralsThrottled, false);
	} else if (win.attachEvent) {
		win.attachEvent('onresize', checkAllCorralsThrottled);
	} else {
		win.onresize = checkAllCorralsThrottled;
	}

}(window));
