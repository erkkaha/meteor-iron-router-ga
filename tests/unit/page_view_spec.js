require("should");
var fakeGa = require("./fakes/fake_ga");
var fakeRouter = require("./fakes/fake_router");
require("../../lib/router");

describe("page view:", function() {

    beforeEach(function() {
        fakeGa.reset();
        fakeRouter.reset();
    });

    it("should set page and track page view", function() {
        Router.route("test-route", {
            trackPageView: true
        });

        Router.executeRoute("test-route");

        fakeGa.queue.length.should.equal(2);
        fakeGa.queue[0].length.should.equal(3);
        fakeGa.queue[0][0].should.equal("set");
        fakeGa.queue[0][1].should.equal("page");
        fakeGa.queue[0][2].should.equal("http://localhost/test-route");
        fakeGa.queue[1].length.should.equal(2);
        fakeGa.queue[1][0].should.equal("send");
        fakeGa.queue[1][1].should.equal("pageview");
    });

    it("should not track page view but should set page", function() {
        Router.route("test-route", {
            trackPageView: false
        });

        Router.executeRoute("test-route");

        fakeGa.queue.length.should.equal(1);
        fakeGa.queue[0].length.should.equal(3);
        fakeGa.queue[0][0].should.equal("set");
        fakeGa.queue[0][1].should.equal("page");
        fakeGa.queue[0][2].should.equal("http://localhost/test-route");
    });

    it("should call route's onRun handler and pass along arguments if tracking is enabled", function() {
        var arg1Value = null;

        Router.route("test-route", {
            trackPageView: true,
            onRun: function(arg1) {
                arg1Value = arg1;
                this.next();
            }
        });

        Router.executeRoute("test-route", "foo");

        arg1Value.should.equal("foo");
    });

    it("should not interfere with route's onRun handler if tracking is disabled", function() {
        var arg1Value = null;

        Router.route("test-route", {
            trackPageView: false,
            onRun: function(arg1) {
                arg1Value = arg1;
                this.next();
            }
        });

        Router.executeRoute("test-route", "foo");

        arg1Value.should.equal("foo");
    });

    it("should call next() after tracking the page view", function() {
        Router.route("test-route", {
            trackPageView: true
        });

        Router.executeRoute("test-route");

        Router.routes["test-route"].nextCallCount.should.equal(1);
    });

    it("should handle routes with no options", function() {
        Router.route("no-options");
    });
});