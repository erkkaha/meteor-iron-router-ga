var ua = Npm.require('universal-analytics');
ga = function(user, options){
    var gaSettings = Meteor.settings && Meteor.settings.public &&
                 Meteor.settings.public.ga || {};
    if (gaSettings.id) {
        if(user){
            return ua(gaSettings.id, user, options);        
        }
        else{
            return ua(gaSettings.id);
        }
    } else {
        console.log("iron-router-ga settings not found");
        //returns fake tracker
        return {
            pageview:function(){return this;},
            event:function(){return this;},
            send:function(){return this;},
            transaction:function(){return this;},
            item:function(){return this;},
            exception:function(){return this;},
            timinig:function(){return this;},
            debug:function(){return this;}
        };
    }
};