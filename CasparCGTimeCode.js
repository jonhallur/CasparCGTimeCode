OscTime = new Mongo.Collection('osc');
OscSettings = new Mongo.Collection('settings');
OscStatus = new Mongo.Collection('status');
var oscPort = null;


Meteor.startup(function () {
    if (Meteor.isServer) {
        if (OscSettings.find().count() === 0) {
            var settings = {
                address: "127.0.0.1",
                port: 6250,
                channel: 1,
                layer: 10
            };
            OscSettings.upsert({}, {
                $set: settings
            });
        }
        var status = {
            button_status: "btn-primary"
        };
        OscStatus.upsert({}, {
            $set: status
        });
    }

});

if (Meteor.isClient) {
    Template.body.helpers({
        osc: function () {
            return OscTime.findOne({});
        },
        settings: function () {
            return OscSettings.findOne({});
        },
        osc_status: function () {
            return OscStatus.findOne({});
        }

    });
    Template.body.events({
        "click #start_osc": function () {
            var address = $("#address").val();
            var port = $("#port").val();
            var channel = $("#channel").val();
            var layer = $("#layer").val();
            var settings = {
                address: address,
                port: port,
                channel: channel,
                layer: layer
            };
            Meteor.call("StartOsc", settings);
        }
    });
}

if (Meteor.isServer) {
    Meteor.methods({
        StartOsc: function (settings) {
            //var settings = OscSettings.findOne();
            var oscStatus = "";
            var osc = Meteor.npmRequire('osc');
            console.log("SETT:", settings);
            oscPort = new osc.UDPPort({
                localAddress: settings.address,
                localPort: settings.port
            });
            if (oscPort !== null) {
                oscPort.on("message", Meteor.bindEnvironment(function(oscMsg) {
                    //Session.set('oscTime', oscMsg.timeTag.native);

                    var osc_address = '/channel/' + settings.channel +'/stage/layer/' + settings.layer + '/file/time';
                    if (oscMsg.address === osc_address) {
                        //console.log("OSC:", oscMsg);
                        var total = oscMsg.args[1] - 0.07999;
                        var elapsed = oscMsg.args[0];
                        var remaining = total - elapsed;
                        var percentage = parseInt((remaining / total) * 100);
                        var seconds = parseInt(remaining);
                        var date = new Date(null);
                        date.setSeconds(seconds); // specify value for SECONDS here

                        var millis = remaining.toFixed(3) - seconds;
                        var formattedTime = date.toISOString().substr(11, 8) + "." + ("000" + parseInt( millis.toFixed(3)*1000)).slice(-3);
                        OscTime.upsert(
                            {},
                            {
                                $set: {
                                    oscTime: formattedTime,
                                    percentage: percentage
                                }
                            }
                        )
                    }


                }));

                oscPort.open();
                oscStatus = "btn-success";
            }
            else {
                oscStatus = "btn-warning";

            }
            OscStatus.upsert(
                {},
                {
                    $set: {
                        button_status: oscStatus
                    }
                }
            )

        }
    });


}