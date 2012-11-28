// Corral.js - a smart media query for JavaScript. This library allows you to
// set up a set of breakpoints as 'corrals' that handle setup and teardown for
// each breakpoint. It turns your breakpoints into event-driven objects. Neat!
//
// All corrals, once instantiated, are handled by an internal hash and checked
// for validity every time a window.resize event fires. (Each corral is
// checked on instantiation as well.) Think of it this way: if you've defined
// three corrals (one for mobile, one for tablet, and one for desktop, each of
// them butted up against each other...
//
//     [ 'mobile' corral ] [ 'tablet' corral ] [ 'desktop' corral ]
//     0               320 321             768 769              inf
//
// then, you open up a browser that's somewhere around 250px wide, this is what
// happens:
//
//     [ 'mobile' corral ] [ 'tablet' corral ] [ 'desktop' corral ]
//                 ^ enter-min, enter-max, and enter-both are fired on mobile corral
//                   enter-max event is also fired on tablet and desktop corrals
//
// Then you enlarge your viewport:
//
//     [ 'mobile' corral ] [ 'tablet' corral ] [ 'desktop' corral ]
//                 ^------> exit-max and exit-both events are fired on mobile corral
//                          (note that the exit-min event wasn't fired because
//                          we're still larger than the mobile corral's min value
//                          and always will be)
//
//     [ 'mobile' corral ] [ 'tablet' corral ] [ 'desktop' corral ]
//                 ^------>-> enter-min and enter-both event is fired on tablet
//                            corral, because now we're within both of its bounds
//
//     [ 'mobile' corral ] [ 'tablet' corral ] [ 'desktop' corral ]
//                 ^------>->-----------------> exit-max and exit-both events
//                                              are fired on the tablet corral
//
// ... and so forth.
//
// To check media queries, Corral tries to use the browser's built-in
// window.matchMedia (or a shim like machMedia.js), and, barring that, will try
// to find Modernizr's media query checker, Modernizr.mq
//
// Constructor
//
// new Corral(name, axis, min, max [, callbacks])
//
//      (string) name:      what should this corral be called?
//
//      (string) axis:      the media query axis to test. Currently only
//                          dimensional axes are supported, which are:
//                              * width
//                              * height
//                              * device-width
//                              * device-height
//                              * device-pixel-ratio
//                              * aspect-ratio
//                              * color           // does anything actually support these?
//                              * color-index
//                              * resolution
//                              * and any other dimensional axes get added in the
//                                future -- Corral doesn't care
//
//      (string) min:       CSS units for the minimum and maximum 'fences' that
//      (string) max:       contain this corral. As with CSS proper, these values
//                          are inclusive, which means that for the next corrals
//                          above and below, you need to add/subtract a bit so you
//                          don't get overlapping media queries. These are both
//                          optional (specify null if you need to), and if not
//                          specified, will be replaced by huge min and max
//                          values to imitate a fenceless sort of situation:
//
//                              min: null, max: 35em
//                                corral ]
//                              ^ look ma, no fence! (but min is actually 1px
//                                for media query checking purposes)
//
//                              min: 26em, max: null
//                              [ corral
//                                       ^ ditto (but max is actually 20000px)
//
//                          This is useful for creating the bookends, like
//                          'iPhone and everything smaller' or 'Jumbotron and
//                          everything bigger'.
//
//      (obj) callbacks:    An object containing the keys 'min', 'max', and
//                          'both', each of which are optional and are objects
//                          themselves, containing the keys 'enter' and 'exit',
//                          both of which are also optional and are functions
//                          or arrays of functions. These functions get called
//                          when the appropriate event is fired. (Note: as a
//                          shorthand, you can just send an object containing
//                          'enter' and 'exit', in which case it will assume
//                          that you want to attach these functions to 'both'.
//
//  Getters/setters:
//
//      Get or set the name of the corral. Works like jQuery accessors; if no
//      value is given, it's a getter.
//
//      instance.name([name])
//
//      instance.axis([axis])
//
//      instance.min([min])
//
//      instance.max([max])
//
//  Other instance methods:
//
//      instance.isActive(fence)
//
//          Check to see whether the viewport is within the given fence name.
//          Fences are 'min', 'max', or 'both'.
//
//      instance.on(event, callbacks)
//
//          Attach event handlers to a corral. This works just like passing
//          callbacks to the constructor, except that because we are specifying
//          an event, all we need to pass is a function or array of functions.
//          Note: If this event is currently active, on() will run all the
//          passed callbacks.
//
//          (string) event: The event to attach the handler(s) to. This can be:
//                              * enter-min     the viewport is at least as
//                                              large as this corral's min
//                              * exit-min      the viewport is smaller than
//                                              this corral's min
//                              * enter-max     the viewport is at least as
//                                              small as this corral's max
//                              * exit-max      the viewport is smaller than
//                                              this corral's max
//                              * enter-both    the viewport is between this
//                                              corral's min and max
//                              * exit-both     the viewport is smaller or
//                                              larger than this corral
//
//          callbacks: a function or array of functions.
//
//      instance.off(event [, callbacks])
//
//          Detach event handler(s) from a corral. If no callbacks are given,
//          detaches all callbacks.
//
//      instance.trigger(event [, force, = false [, triggerBoth = true]])
//
//          Manually trigger an event on a corral. Doesn't check to see whether
//          the event should actually be triggered.
//
//          (string) event:     See notes for on()
//
//          (bool) force:       Force an event to be re-triggered, even if it's
//                              already been triggered. Default is false, which
//                              means that, for example, once an 'enter-min'
//                              event is fired, it can't be fired again until
//                              after an 'exit-min' event has been fired.
//
//          (bool) triggerBoth: If this is a '?-min' or '?-max' event, trigger
//                              the corresponding '?-both' event if the other
//                              fence's event has been fired already. Defaults
//                              to true, which means that if an 'enter-min'
//                              event has been fired, and then an 'enter-max'
//                              event is fired, it'll automatically fire the
//                              'enter-both' event.
//
//  instance.delete()
//
//      Destroy a corral and all its event handlers.
//
//  instance.check()
//
//      Checks to see what events apply to this corral, and trigger them if
//      they haven't been triggered. This happens automatically on every screen
//      resize/rotate event, so you shouldn't need to call it directly.
//
//  instance.query(fence)
//
//      Return an object that can be used to build a CSS3 media query string.
//      Has three properties: axis, fence, and value. Used internally on every
//      screen resize/rotate event, but you might want to use it for testing.
//
//  The Corral object also functions as a namespace, with the following helpers:
//
//  Corral.remove(corral)
//
//      Removes a corral. The passed corral argument can be a string or a
//      Corral instance object.
//
//  Corral.get(corral)
//
//      Return a corral if a corral name specified by the argument exists;
//      returns null otherwise.
//
//  Corral.breakpoints()
//
//      Returns a hash of all corrals and their min and max values, in this
//      format:
//
//          {
//              corralName???: { min: ???, max: ??? }
//              [, corralName???: { min: ???, max: ??? }
//              [, ...]
//          }
//
//  ***** Here's how to put it all together *****
//
//  Here's a sensible set of defaults, to put into your user code:
//
//  var mobileCallbacks = {
//      max: {
//          enter: function () { console.log('We are now phone-sized!'); }
//          exit: function () { console.log('bigger than a phone'); }
//      }
//  };
//  var mobile = new Corral('mobile', null, '320px', mobileCallbacks);
//
//  var tabletCallbacks = {
//      max: {
//          enter: function () {
//              // some code here that collapses the menus for tablets and
//              // everything smaller
//          },
//          exit: function () {
//              // put the menus back to where they were when we're larger than
//              // a tablet
//          }
//      },
//      both: {
//          enter: function () {
//              // do some special tablet-specific stuff that doesn't apply to
//              // mobile or desktop
//          },
//          exit: function () {
//              // undo that tablet-specific stuff
//          }
//      }
//  };
//  var tablet = new Corral('tablet', '321px', '768px', tabletCallbacks);
//
//  var desktopCallbacks = {
//      min: {
//          enter: function () {
//              // load high-res images and extra sidebars
//          },
//          exit: function () {
//              // unload high-res images and extra sidebars
//          }
//      }
//  };
//  var desktop = new Corral('desktop', '769px', null, tabletCallbacks);
//
//  That's all there is to it! If you want to test out breakpoints without
//  resizing your viewport, you could always go
//
//      tablet.trigger('enter-both');
//
//  or something.

(function (win) {
    var exists = function exists(val) {
        return val !== undefined && val !== null;
    };

    var isArray = function isArray(val) {
        return {}.toString.call(val) === '[object Array]';
    };

    var inArray = function inArray(needle, haystack) {
        if (Array.prototype.indexOf) {
            return haystack.indexOf(needle) >= 0;
        } else {
            for (var i = 0; i < haystack.length; i ++) {
                if (haystack[i] === needle) {
                    return true;
                }
            }
            return false;
        }
    }

    // all instantiated corrals will be stored here so that checkAllCorrals()
    // can iterate through them on each window resize event
    var corrals = {};
    var corralsStatic = {};
    
    // static axes store the currently statically set min and max values, for
    // use with class-based corral checking as opposed to media-query-based
    var staticAxes = {};

    var resizeEventTimeoutID;

    var throttleEvent = function throttleEvent(callback) {
        // throttle events so the browser doesn't fire a zillion of them
        win.clearTimeout(resizeEventTimeoutID);
        resizeEventTimeoutID = win.setTimeout(callback, 100);
    };

    // find out how we're going to test for media query matches
    var supportsMediaQueries = (function () {
        if (typeof win.matchMedia === 'function') {
            // browser itself supports media queries
            return 'native';
        } else if (typeof win.Modernizr === 'object' && typeof win.Modernizr.mq === 'function') {
            // Modernizr is installed, it has media query support, and the
            // browser supports media queries via CSS
            return win.Modernizr.mq('only all') ? 'modernizr' : false;
        }
    })();

    var tryMediaQuery = function (mediaQuery) {
        var mediaQueryString = '(' + mediaQuery.fence + '-' + mediaQuery.axis + ':' + mediaQuery.value + ')';
        var match = false;

        if (supportsMediaQueries === 'native') {
            // use native matchMedia first
            match = win.matchMedia(mediaQueryString).matches;
        } else if (supportsMediaQueries === 'modernizr') {
            // try Modernizr next, because it covers older browsers that
            // do support media queries but don't support matchMedia
            match = Modernizr.mq(mediaQueryString);
        }

        if (!match && staticAxes.hasOwnProperty(mediaQuery.axis)) {
            // fall back to unresponsive checking if nothing above matched
            if ((mediaQuery.fence === 'min' && parseFloat(staticAxes[mediaQuery.axis].min) >= parseFloat(mediaQuery.value)) ||
                (mediaQuery.fence === 'max' && parseFloat(staticAxes[mediaQuery.axis].max) <= parseFloat(mediaQuery.value))) {
                match = true;
            }
        }
        
        return match;
    };

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
        return inArray(actionName, actionNames);
    };

    // valid fence names
    var fenceNames = ['min', 'max', 'both'];

    // check for same
    var isFenceName = function isFenceName(fenceName) {
        return inArray(fenceName, fenceNames);
    };

    // parse an event name into an action and a fence, e.g.:
    //     {
    //         action: 'enter',
    //         fence: 'min'
    //     }
    var parseEventName = function parseEventName(eventName) {
        var namespaceAndEventName = eventName.split('.');
        var fenceAndEventName = namespaceAndEventName[0].split('-');

        if (!isArray(fenceAndEventName) || fenceAndEventName.length < 2) {
            throw new Error('parseEventName(): event name doesn\'t seem to have a hyphen');
        }

        if (!isActionName(fenceAndEventName[0])) {
            throw new Error('parseEventName(): action part of event name is invalid');
        }

        if (!isFenceName(fenceAndEventName[1])) {
            throw new Error('parseEventName(): fence part of event name is invalid');
        }

        var parsedEventInfo = { 'action': fenceAndEventName[0], 'fence': fenceAndEventName[1] };

        // if a namespace is specified, add that to the object
        if (namespaceAndEventName.length > 1) {
            namespaceAndEventName.shift();
            parsedEventInfo.namespace = namespaceAndEventName.join('.');
            parsedEventInfo.actionNamespaced = parsedEventInfo.action + '.' + parsedEventInfo.namespace;
        } else {
            parsedEventInfo.actionNamespaced = parsedEventInfo.action;
        }

        return parsedEventInfo;
    };

    // check for valid event names
    var isEventName = function isEventName(eventName) {
        try {
            parseEventName(eventName);
        } catch (e) {
            return false;
        }
        return true;
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
    var Corral = win.Corral = function Corral(name, axis, min, max, callbacks) {
        var _props = {
            name: name,
            axis: axis,
            min: null,
            max: null
        };
        var _callbacks = {
            min: { enter: [], exit: [], active: false },
            max: { enter: [], exit: [], active: false },
            both: { enter: [], exit: [], active: false }
        };
        // add this corral to the list
        var _this = corrals[name] = this;

        // min and max are both optional values, but one of them ought to be set
        // (if neither are set, then the events just don't fire)
        if (exists(min)) {
            _props.min = min;
        }
        if (exists(max)) {
            _props.max = max;
        }

        // were any callbacks passed? If so, add them to this corral
        if (typeof callbacks === 'object') {
            if (!callbacks.hasOwnProperty('min') &&
                !callbacks.hasOwnProperty('max') &&
                !callbacks.hasOwnProperty('both') && (
                    callbacks.hasOwnProperty('enter') ||
                    callbacks.hasOwnProperty('exit')
                )
            ) {
                // this doesn't have any specific sets of callbacks for each of
                // the fences, but it has either entry or exit callbacks, so
                // assume that it's a set of callbacks for 'both'
                callbacks = { 'both': callbacks };
            }

            for (var fence in callbacks) {
                if (callbacks.hasOwnProperty(fence) && _callbacks.hasOwnProperty(fence)) {
                    _callbacks[fence].enter = sanitiseCallbacks(callbacks[fence].enter);
                    _callbacks[fence].exit = sanitiseCallbacks(callbacks[fence].exit);
                }
            }
        }

        // a generic accessor to get or set private values
        // follows jQuery convention: undefined arguments make the function act
        // as a getter; anything else (including null) makes it act as a setter
        var _getSet = function _getSet(prop, val) {
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
                        // if the namespace hasn't been registered yet, register it
                        if (!_callbacks[eventInfo.fence].hasOwnProperty(eventInfo.actionNamespaced)) {
                            _callbacks[eventInfo.fence][eventInfo.actionNamespaced] = [];
                        }
                        _callbacks[eventInfo.fence][eventInfo.actionNamespaced].push(callbacks[i]);
                    }
                }
            } else {
                throw new Error('Corral.on(): unknown event name ' + eventName);
            }
        };

        // event unbinding
        this.off = function corralOff(eventName) {
            var i;

            if (isEventName(eventName)) {
                var eventInfo = parseEventName(eventName);
                if (_callbacks[eventInfo.fence].hasOwnProperty(eventInfo.actionNamespaced)) {
                    if (eventInfo.hasOwnProperty('namespace')) {
                        // if this is a namespaced event, just delete all the
                        // callbacks *and* the namespace
                        delete _callbacks[eventInfo.fence][eventInfo.actionNamespaced];
                    } else {
                        // otherwise just delete the events
                        _callbacks[eventInfo.fence][eventInfo.action] = [];
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
            if (exists(triggerBoth)) {
                // cast to Boolean
                triggerBoth = !!triggerBoth;
            } else {
                // default to true
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

                // go through the list of events
                for (var eventKey in fenceCallbacks) {
                    // check if this namespaced or non-namespaced event matches
                    // the passed event
                    if (eventKey.indexOf(eventInfo.action) === 0) {
                        // setup or teardown the callbacks that pertain to this event
                        for (var i = 0; i < fenceCallbacks[eventKey].length; i++) {
                            fenceCallbacks[eventKey][i]();
                        }
                    }
                }

                // set the active flag appropriately
                fenceCallbacks.active = (eventInfo.action === 'enter');

                if (triggerBoth) {
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

                if (tryMediaQuery(this.query(fence))) {
                    this.trigger('enter-' + fence);
                } else {
                    this.trigger('exit-' + fence);
                }
            }
        }
    };

    // generate a media query for use in the above check
    Corral.prototype.query = function query(fence) {
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

            var queryObj = {
                axis: this.axis(),
                fence: fence,
                value: fenceValue
            };
            return queryObj;
        } else {
            throw new Error('Corral.query(): fence should be min or max');
        }
    };

    // cleanly delete a corral by reference or by name
    Corral.remove = function removeCorral(corral) {
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
    };

    // get a hash of all breakpoints, their axes, and min/max values. Returns an
    // object in this format:
    //     {
    //          mobile: { axis: 'width', max: '20em' },
    //          tablet: { axis: 'width', min: '20.0001em', max: '59.9999em' },
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

    // static corral -- matches against a classname rather than a media query
    // you don't actually give this corral any event handlers of its own; it
    // automatically fires the event handlers of any corrals that match its
    // width
    var CorralStatic = win.CorralStatic = function CorralStatic(name, axis, min, max) {
        // the second argument can be a corral instead, in which case it gets
        // the axis, min, and max from that corral
        var _props;
        if (axis instanceof Corral) {
            _props = {
                corral: axis,
                name: name,
                active: false
            }
        } else {
            _props = {
                name: name,
                axis: axis,
                min: null,
                max: null,
                active: false
            };
        }
        // add this corral to the list
        var _this = corralsStatic[name] = this;

        // min and max are both optional values, but one of them ought to be set
        // (if neither are set, then the events just don't fire)
        if (exists(min)) {
            _props.min = min;
        }
        if (exists(max)) {
            _props.max = max;
        }

        // a generic accessor to get or set private values
        // follows jQuery convention: undefined arguments make the function act
        // as a getter; anything else (including null) makes it act as a setter
        var _getSet = function _getSet(prop, val) {
            if (val === undefined) {
                var corralables = ['axis', 'min', 'max'];
                if (inArray(prop, corralables) && exists(_props.corral) && !exists(_props[prop])) {
                    // value is not hardcoded in this static corral; get it from
                    // the dynamic corral that was passed to this corral on
                    // construction. This way, if the corral is ever changed,
                    // the changes will propagate to this static corral auto-
                    // matically.
                    return _props.corral[prop]();
                }
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

        // find out if this corral is true (no min or max)
        this.isActive = function isActive() {
            return _getSet('active');
        };

        this.trigger = function CorralStaticTrigger(eventName, force) {
            switch (eventName) {
                case 'enter':
                    if (!_props.active || force) {
                        _props.active = true;
                        if (!staticAxes.hasOwnProperty(_this.axis())) {
                            staticAxes[_this.axis()] = {};
                        }
                        // set static min and max values for this axis
                        staticAxes[_this.axis()].min = _this.min();
                        staticAxes[_this.axis()].max = _this.max();
                    }
                    break;

                case 'exit':
                    if (_props.active || force) {
                        _props.active = false;
                        // unset static min and max values for this axis
                        if (staticAxes.hasOwnProperty(_this.axis())) {
                            delete staticAxes[_this.axis()];
                        }
                    }
                    break;

                default:
                    throw new Error('CorralStatic.trigger(): invalid event name; must be either enter or exit');
            }

            // now see what matches
            checkAllCorrals();
        };

        // after construction, check this corral to see if it's active
        this.check();
    };

    // cleanly remove a corral so it doesn't fire anymore
    CorralStatic.prototype.remove = function deleteThisCorralStatic() {
        CorralStatic.remove(this);
    };

    // check to see if we're inside one or both of this corral's fences
    CorralStatic.prototype.check = function checkThisCorralStatic() {
        var classRegex = new RegExp('\\b' + this.name() + '\\b');
        if (classRegex.test(win.document.documentElement.className)) {
            this.trigger('enter');
        } else {
            this.trigger('exit');
        }
    };

    // cleanly delete a corral by reference or by name
    CorralStatic.remove = function removeCorralStatic(corral) {
        var corralName;

        if (corral instanceof CorralStatic) {
            corralName = corral.name;
        } else {
            corralName = corral;
        }

        if (corralsStatic.hasOwnProperty(corralName)) {
            delete corralsStatic[corralName];
            return true;
        }
        return false;
    };

    CorralStatic.get = function getCorralStatic(corralName) {
        if (corralsStatic.hasOwnProperty(corralName)) {
            return corralsStatic[corralName];
        }
    };

    // IE7 fires the resize event whenever an object on the page resizes; we
    // need to see if the viewport actually changed. This function courtesy of:
    // http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
    var getViewportSize = function() {
        var viewportwidth;
        var viewportheight;
  
        if (typeof window.innerWidth != 'undefined') {
            // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
            viewportwidth = window.innerWidth;
            viewportheight = window.innerHeight;
        } else if (typeof document.documentElement != 'undefined'
                   && typeof document.documentElement.clientWidth !=
                   'undefined' && document.documentElement.clientWidth != 0) {
            // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
            viewportwidth = document.documentElement.clientWidth,
            viewportheight = document.documentElement.clientHeight
        }
        return { width: viewportwidth, height: viewportheight };
    };

    var viewportSizeOriginal = getViewportSize();

    // now we bind the corral checking mechanism to the window's resize event
    var checkAllCorralsThrottled = function checkAllCorralsThrottled() {
        var viewportSizeNew = getViewportSize();
        if (viewportSizeNew.width !== viewportSizeOriginal.width &&
            viewportSizeNew.height !== viewportSizeOriginal.height) {
            throttleEvent(checkAllCorrals);
        }
    };

    if (win.addEventListener) {
        win.addEventListener('resize', checkAllCorralsThrottled, false);
    } else if (win.attachEvent) {
        win.attachEvent('onresize', checkAllCorralsThrottled);
    } else {
        win.onresize = checkAllCorralsThrottled;
    }

} (window));