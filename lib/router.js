var originalRoute = Router.route;

Router.route = function(name, options) {
    options = attachAnalyticsOptions.call(this, options);
    return originalRoute.call(this, name, options);
};


var attachAnalyticsOptions = function(options) {
    options = options || {};
    if (shouldTrackPageView.call(this, options)) {
        attachPageViewTracking.call(this, options);
    }

    attachPageSetter.call(this, options);

    if (routeHasExperiment(options)) {
        attachExperiment.call(this, options);
    }

    return options;
};

var shouldTrackPageView = function(options) {
    if (options && typeof options.trackPageView !== "undefined") {
        return !!options.trackPageView;
    }

    return !!this.options && !!this.options.trackPageView;
};

var attachPageViewTracking = function(options) {
    var originalOnRun = options.onRun;

    options.onRun = function() {
        if(options.pageViewPath){
            window.ga && window.ga("send", "pageview", options.pageViewPath);
        }
        else{
            window.ga && window.ga("send", "pageview");
        }

        return callEventHandlerOrNext.call(this, originalOnRun, arguments);
    };
};

var attachPageSetter = function(options) {
    var originalOnRun = options.onRun;

    options.onRun = function() {
        window.ga && window.ga("set", "page", this.url);

        return callEventHandlerOrNext.call(this, originalOnRun, arguments);
    };
};

var routeHasExperiment = function(options) {
    return !!options.contentExperiment || !!options.gaContentExperiment;
};

var attachExperiment = function(options) {
    var experiment = options.contentExperiment || options.gaContentExperiment;
    var experimentLoader = new ExperimentLoader(experiment.id);
    var originalOnRun = options.onRun;
    var originalOnBeforeAction = options.onBeforeAction;
    var originalAction = options.action;

    options.onRun = function() {
        experimentLoader.init();

        return callEventHandlerOrNext.call(this, originalOnRun, arguments);
    };

    options.onBeforeAction = function() {
        experimentLoader.load();

        if (!experimentLoader.isReady()) {
            renderLoadingTemplate.call(this);
            return;
        }

        var chosenVariation = window.cxApi.getChosenVariation(experiment.id);

        if (chosenVariation === window.cxApi.NO_CHOSEN_VARIATION) {
            chosenVariation = window.cxApi.chooseVariation();
            ga("send", "event", "iron-router-ga", "Choose experiment variation", experiment.id, chosenVariation);
        }

        return callEventHandlerOrNext.call(this, originalOnBeforeAction, arguments);
    };

    options.action = function() {
        var chosenVariation = getChosenVariationOrDefault(experiment.id);

        this.render(experiment.variationTemplates[chosenVariation]);

        var args = [].slice.apply(arguments);
        return originalAction && originalAction.apply(this, args);
    };
};

var callEventHandlerOrNext = function(handler, args) {
    if (handler) {
        return handler.apply(this, [].slice.apply(args));
    } else {
        this.next();
    }
};

var getChosenVariationOrDefault = function(experimentId) {
    var variation = window.cxApi.getChosenVariation(experimentId);

    if (variation === window.cxApi.NO_CHOSEN_VARIATION || variation === cxApi.NOT_PARTICIPATING) {
        return window.cxApi.ORIGINAL_VARIATION;
    }

    return variation;
};

var renderLoadingTemplate = function() {
    var template = this.route.options.loadingTemplate ||
                   this.router.options.loadingTemplate;

    if (template) {
        this.render(template);
    }
};


var ExperimentLoader = function(experimentId) {
    this.experimentId = experimentId;
    this.dep = new Deps.Dependency();
};

ExperimentLoader.prototype.init = function() {
    this._removePreviousExperiment();
};

ExperimentLoader.prototype.load = function() {
    this._insertScriptIfNecessaryAndStartChecking();
};

ExperimentLoader.prototype.isReady = function() {
    this.dep.depend();
    return typeof window.cxApi !== "undefined";
};

ExperimentLoader.prototype._insertScriptIfNecessaryAndStartChecking = function() {
    if (document.getElementById("irga-experiment-api")) { return; }

    this._insertScript();
    this._checkCxApiLoaded();
};

ExperimentLoader.prototype._insertScript = function() {
    var script = document.createElement("script");
    script.id = "irga-experiment-api";
    script.src = "//www.google-analytics.com/cx/api.js?experiment=" + this.experimentId;
    var head = document.getElementsByTagName("head")[0];
    head.appendChild(script);
};

ExperimentLoader.prototype._removePreviousExperiment = function() {
    if (window.cxApi) {
        delete window.cxApi;
    }
    this._removeScript();
};

ExperimentLoader.prototype._removeScript = function() {
    var script = document.getElementById("irga-experiment-api");
    if (script && script.parentNode) {
        script.parentNode.removeChild(script);
    }
};

ExperimentLoader.prototype._checkCxApiLoaded = function() {
    var self = this;
    var startTime = (new Date()).getTime();
    var TIMEOUT = 10 * 1000;

    var check = function() {
        var currentTime = (new Date()).getTime();
        if (currentTime > startTime + TIMEOUT) {
            window.cxApi = fakeCxApi;
        }

        if (typeof window.cxApi !== "undefined") {
            self._initCookie();
            self.dep.changed();
        } else {
            setTimeout(function() { check(); }, 50);
        }
    };

    check();
};

ExperimentLoader.prototype._initCookie = function() {
    var settings = getCookieSettings();

    settings.cookieDomain && window.cxApi.setDomainName(settings.cookieDomain);
    settings.cookiePath && window.cxApi.setCookiePath(settings.cookiePath);
    settings.allowHash && window.cxApi.setAllowHash(settings.allowHash);
};

var getCookieSettings = function() {
    return typeof Meteor !== "undefined" &&
           Meteor.settings &&
           Meteor.settings.public &&
           Meteor.settings.public.ga &&
           Meteor.settings.public.ga.create ||
           {};
};

var fakeCxApi = {
    NO_CHOSEN_VARIATION: -1,
    NOT_PARTICIPATING: -2,
    ORIGINAL_VARIATION: 0,

    chooseVariation: function() {
        return 0;
    },

    getChosenVariation: function() {
        return 0;
    },

    setDomainName: function() { },
    setCookiePath: function() { },
    setAllowHash: function() { }
};
