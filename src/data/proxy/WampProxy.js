/**
 * AutobahnExtJS - Autobahn/WAMP proxy and support code for ExtJS.
 *
 * AutobahnExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 */

Ext.define('AB.data.proxy.WampProxy', {
    extend: 'Ext.data.proxy.Server',
    alias: 'proxy.wamp',

    batchActions: false,

    constructor: function(config) {
        var me = this;
        config = config || {};

        me.addEvents(
        /**
         * @event exception
         * Fires when the WAMP server returns an exception in response to a RPC
         * @param {Ext.data.proxy.Proxy} this
         * @param {Object} error The WAMP error object returned for the RPC
         * @param {Ext.data.Operation} operation The operation that triggered request
         */
        'exception',

        /**
         * @event oncreate
         * Fires when an object was (remotely) created
         * @param {Ext.data.proxy.Proxy} this
         * @param {Object} id The object created
         */
        'oncreate',

        /**
         * @event onupdate
         * Fires when an object was (remotely) update
         * @param {Ext.data.proxy.Proxy} this
         * @param {Object} id The object delta for the update (plus the object ID)
         */
        'onupdate',

        /**
         * @event ondestroy
         * Fires when an object was (remotely) deleted
         * @param {Ext.data.proxy.Proxy} this
         * @param {Object} id The ID of the object deleted
         */
        'ondestroy');

        // http://www.sencha.com/forum/showthread.php?229600-Illegal-access-to-a-strict-mode-caller-function
        // me.callParent([config]);
        AB.data.proxy.WampProxy.superclass.constructor.apply(me, arguments);

        me.session = absession; // absession is not available on load time. only when webMQ connect has been established!
        // The problem is that most store classes get the session config at the class level on load time.
        // This is the reaseon why instead we use the global absession object subsequently.

        me.api = Ext.apply({}, config.api || me.api);
        // console.log('wampproxy ', arguments);
        if (me.api.oncreate) {
            me.session.subscribe(me.api.oncreate, function(topic, event) {
                if (me.debug) {
                    console.log("AB.data.proxy.WampProxy.oncreate", event);
                }
                var obj = event;
                me.fireEvent('oncreate', me, obj);
            });
        }

        if (me.api.onupdate) {
            me.session.subscribe(me.api.onupdate, function(topic, event) {
                if (me.debug) {
                    console.log("AB.data.proxy.WampProxy.onupdate", event);
                }
                var obj = event;
                me.fireEvent('onupdate', me, obj);
            });
        }

        if (me.api.ondestroy) {
            me.session.subscribe(me.api.ondestroy, function(topic, event) {
                if (me.debug) {
                    console.log("AB.data.proxy.WampProxy.ondestroy", event);
                }
                var id = event;
                me.fireEvent('ondestroy', me, id);
            });
        }
    },

    create: function(operation, callback, scope) {

        var me = this;

        if (me.debug) {
            console.log("AB.data.proxy.WampProxy.create", operation);
        }

        // FIXME?
        if (operation.records.length > 1) {
            throw "WAMP proxy cannot process multiple CREATEs at once";
        }

        var record = operation.records[0];

        operation.setStarted();

        // issue WAMP RPC
        this.session.call(this.api.create, record.data).then(

        // process WAMP RPC success result

        function(res) {
            record.phantom = false;
            record.setId(res.id);
            record.commit();

            operation.setCompleted();
            operation.setSuccessful();

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
        },

        // process WAMP RPC error result

        function(err) {

            if (me.debug) {
                console.log("WAMP RPC error", err);
            }

            operation.setException(err.desc);
            me.fireEvent('exception', me, err, operation);

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
        });
    },

    update: function(operation, callback, scope) {

        var me = this;

        if (me.debug) {
            console.log("AB.data.proxy.WampProxy.update", operation);
        }

        // FIXME?
        if (operation.records.length > 1) {
            throw "WAMP proxy cannot process multiple UPDATEs at once";
        }

        var record = operation.records[0];

        operation.setStarted();

        // issue WAMP RPC
        this.session.call(this.api.update, record.data).then(

        // process WAMP RPC success result

        function(res) {
            // FIXME: update record fields ..
            record.commit();

            operation.setCompleted();
            operation.setSuccessful();

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
        },

        // process WAMP RPC error result

        function(err) {
            if (me.debug) {
                console.log("WAMP RPC error", err);
            }

            operation.setException(err.desc);
            me.fireEvent('exception', me, err, operation);

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
        });
    },

    destroy: function(operation, callback, scope) {

        var me = this;

        if (me.debug) {
            console.log("AB.data.proxy.WampProxy.destroy", operation);
        }

        // FIXME?
        if (operation.records.length > 1) {
            throw "WAMP proxy cannot process multiple DESTROYs at once";
        }

        operation.setStarted();

        var id = operation.records[0].getId();

        // issue WAMP RPC
        this.session.call(this.api.destroy, id).then(

        // process WAMP RPC success result

        function() {
            operation.setCompleted();
            operation.setSuccessful();

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
        },

        // process WAMP RPC error result

        function(err) {
            if (me.debug) {
                console.log("WAMP RPC error", err);
            }

            operation.setException(err.desc);
            me.fireEvent('exception', me, err, operation);

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
        });
    },

    read: function(operation, callback, scope) {

        var me = this;
        var i;

        if (me.debug) {
            console.log("AB.data.proxy.WampProxy.read", operation);
        }

        // request preparation is derived from what can be found in the buildRequest method of 
        // the Ext.data.proxy.Server class

        // this object will get the single RPC argument ..
        // var params = Ext.applyIf(operation.params || {}, me.extraParams || {});
        var params = operation.params = Ext.apply({}, operation.params, me.extraParams);
        //copy any sorters, filters etc into the params so they can be sent over the wire
        Ext.applyIf(params, me.getParams(operation));

        // Set up the entity id parameter according to the configured name.
        // This defaults to "id". But TreeStore has a "nodeParam" configuration which
        // specifies the id parameter name of the node being loaded.
        if (operation.id !== undefined && params[me.idParam] === undefined) {
            params[me.idParam] = operation.id;
        }

        // // paging parameters
        // if (operation.start !== undefined) {
        //     params.start = operation.start;
        // }
        // if (operation.limit !== undefined) {
        //     params.limit = operation.limit;
        // }

        // // sorting parameters
        // if (operation.sorters && operation.sorters.length > 0) {
        //     params.sorters = [];
        //     for (i = 0; i < operation.sorters.length; ++i) {
        //         params.sorters.push({
        //             property: operation.sorters[i].property,
        //             direction: operation.sorters[i].direction
        //         });
        //     }
        // }

        // // filtering parameters
        // if (operation.filters && operation.filters.length > 0) {
        //     params.filters = [];
        //     for (i = 0; i < operation.filters.length; ++i) {
        //         params.filters.push({
        //             property: operation.filters[i].property,
        //             value: operation.filters[i].value
        //         });
        //     }
        // }

        // // grouping parameters
        // if (operation.groupers && operation.groupers.length > 0) {
        //     params.groupers = [];
        //     for (i = 0; i < operation.groupers.length; ++i) {
        //         params.groupers.push({
        //             property: operation.groupers[i].property,
        //             direction: operation.groupers[i].direction || 'ASC'
        //         });
        //     }
        // }

        // issue WAMP RPC
        console.log('WAMP read with params ', this.api.read, params);
        this.session.call(this.api.read, params).then(

        // process WAMP RPC success result

        function(res) {
            var reader = me.getReader(),
                result;
            reader.applyDefaults = true;

            result = reader.read(res);
            result.total = Math.max(result.total, me.total || 0); // the proxy has to know the total number beforehand for 
            // infinite scrolling to work. In the grid reconfigure scenario this can be set
            // when getting the grid structure. In a regular scenario you either have to set
            // the page size large enough for one shot loads or set the "total" prperty on the proxy directly.

            Ext.apply(operation, {
                response: res,
                resultSet: result
            });

            operation.commitRecords(result.records);
            operation.setCompleted();
            operation.setSuccessful();

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
        },

        // process WAMP RPC error result

        function(err) {
            me.setException(operation, err.desc);
            me.fireEvent('exception', this, err.desc, operation);
            console.log('Wamp read error occured', operation);
            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
            me.afterRequest(request, success);
        });
    }
}, function() {});