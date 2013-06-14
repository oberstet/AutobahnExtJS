/**
 * AutobahnExtJS - Autobahn/WAMP proxy and support code for ExtJS.
 *
 * AutobahnExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 *
 * Note:
 * The WampStore listens to JSON push events regardless of the reader config as array, json or else.
 * Right now the pushed JSON needs to look like this:
 *
 * {somekey: 'somevalue', 'somekey: 'somevalue'}
 *
 * For update and delete to work as well, the stores model must have an idproperty and
 * you need to provide this as key/value in the json push. If you push an insert on a
 * record that already exists an update is performed instead.
 */
//@tag packageOverrides
Ext.define('AB.data.Store', {
    override: 'Ext.data.Store',
    // requires:'AB.data.proxy.WampProxy',
    // override: 'Ext.data.Store',

    // model: has to be specified in the subclass

    // This should be false to prevent the store from reacting on
    // WAMP events by issuing an RPC call.
    autoSync: false,

    constructor: function() {
        var me = this;
        // console.log('store override constructor called');
        me.callParent(arguments);
        if (!me.model) return true; // if a dummy store has been configured without a proper model then don't throw an error

        me.addEvents(
        /**
         * @event afterWampWrite
         * Fires when remotely triggered write operation (insert, update, delete) on the client store is completed.
         * @param {Ext.data.WampStore} this
         * @param {Object} obj The payload of the wamp event.
         */
        'afterWampWrite');


        // AB.data.Store.superclass.constructor.apply(me, arguments);
        me.model.getProxy().on('oncreate', function(proxy, obj) {
            console.log('got oncreate event ', me.model.prototype.idProperty, obj, obj[me.model.prototype.idProperty]);
            var record = me.getById(obj[me.model.prototype.idProperty]);
            if (record) { // then update the existing
                var fields = me.model.prototype.fields.items;
                for (var i = 0; i < fields.length; ++i) {
                    if (obj[fields[i].name] !== undefined) {
                        record.set(fields[i].name, obj[fields[i].name]); // for json readers
                    }
                }
                record.dirty = false;
            } else {
                var records = [new me.model(obj)],
                    options = {
                        addRecords: true,
                        start: 0
                    };
                me.loadRecords(records, options);
                // me.insert(0,records);
                // console.log('inserting into store the pushed record',records,me.getNewRecords());

                // me.commit();
            }
            // apply configured sort of the store only if not remote sort
            if (!(me.remoteSort || me.buffered))
                me.sort();
            me.fireEvent('afterWampWrite', me, obj);
        });

        me.model.proxy.on('onupdate', function(proxy, obj) {
            var record = me.getById(obj[me.model.prototype.idProperty]);
            console.log('wamp update ', me.model.prototype.idProperty, record);

            if (record) {
                var fields = me.model.prototype.fields.items;
                for (var i = 0; i < fields.length; ++i) {
                    if (obj[fields[i].name] !== undefined) {
                        record.set(fields[i].name, obj[fields[i].name]); // for json readers
                    }
                }
                record.dirty = false;
                // apply configured sort of the store
                if (!(me.remoteSort || me.buffered))
                    me.sort();
                me.fireEvent('afterWampWrite', me, obj);
            }


        });

        me.model.proxy.on('ondestroy', function(proxy, obj) {
            var record = me.getById(obj[me.model.prototype.idProperty]);
            // record.phantom = true;
            if (record)
                me.remove(record);
            me.fireEvent('afterWampWrite', me, obj);
        });
    }
});
/**
 * AutobahnExtJS - Autobahn/WAMP proxy and support code for ExtJS.
 *
 * AutobahnExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 *
 *
 * Note: 
 * This class extends the regular tree store just by three wamp listeners.
 * To have the WampTreeStore react on push events from the back end the back end has to
 * send a property 'father_node' together with the data to know where to insert the new node into the tree.
 * Also note that the WampTreeStore listens to JSON push events regardless of the reader config as array, json or else.
 * Right now the pushed JSON needs to look like this:
 * 
 * {father_node: 23, 'somekey: 'somevalue'}
 * 
 * TODO: the json to receive should look like this
 * {father_node: 23,
    data: <your json data here>
    }
 */


//@tag packageOverrides
Ext.define('AB.data.TreeStore', {
    override: 'Ext.data.TreeStore',
    // requires:'AB.data.proxy.WampProxy',
    // override: 'Ext.data.TreeStore',

    // model: has to be specified in the subclass

    // This should be false to prevent the store from reacting on
    // WAMP events by issuing an RPC call creating an infinite loop.
    autoSync: false,

    constructor: function() {
        var me = this;

        me.callParent(arguments);
        if (!me.model) return true; // if a dummy store has been configured without a proper model then don't throw an error

        // Ext.data.TreeStore.superclass.constructor.apply(me, arguments);
        // Ext.data.WampTreeStore.superclass.constructor(arguments);

        me.addEvents(
        /**
         * @event afterWampWrite
         * Fires when remotely triggered write operation (insert, update, delete) on the store was completed.
         * @param {Ext.data.WampTreeStore} this
         * @param {Object} obj The payload of the wamp event.
         */
        'afterWampWrite');



        me.model.getProxy().on('oncreate', function(proxy, obj) {
            if (obj['father_node'] == "") {
                me.getRootNode().insertChild(0, obj);
            } else {
                var nodeParam = me.model.prototype.nodeParam || 'node';
                console.log('insert in tree node ', nodeParam, obj['father_node']);
                var node = me.getRootNode().findChild(nodeParam, obj['father_node']);
                if (node && node.isLoaded()) {
                    node.insertChild(0, obj);
                } else {
                    //     node.expand(); // this loads the already inserted child from the back end as well
                }
                //            }

            }

            // apply sort
            if (!(me.remoteSort || me.buffered))
                me.sort();
            me.fireEvent('afterWampWrite', me, obj);
        });

        me.model.proxy.on('onupdate', function(proxy, obj) {
            // do a remove and a create. This presumes all properties of the record in the payload.

            // deep search for node
            var node = me.getRootNode().findChild(me.model.prototype.idProperty, obj[me.model.prototype.idProperty], true);
            if (node) node.remove();

            // now create
            if (obj['father_node'] === "") {
                me.getRootNode().insertChild(0, obj);
            } else {
                var nodeParam = me.model.prototype.nodeParam || 'node';
                me.getRootNode().findChild(nodeParam, obj['father_node']).insertChild(0, obj);
            }

            // apply sort
            if (!(me.remoteSort || me.buffered))
                me.sort();
            me.fireEvent('afterWampWrite', me, obj);
        });

        me.model.proxy.on('ondestroy', function(proxy, obj) {
            // deep search for node
            var node = me.getRootNode().findChild(me.model.prototype.idProperty, obj[me.model.prototype.idProperty], true);
            if (node) node.remove();
            me.fireEvent('afterWampWrite', me, obj);
        });
    }
});
/**
 * absessionExtJS - absession/WAMP proxy and support code for ExtJS.
 *
 * absessionExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 *
 */

// You can use this Wamp application class just by calling the Ext.application function
// as usual and specifying extend:'AB.app.WampApplication' as a property of the app config 
// object.  The connection properties below have to be specified in the app config object as well
Ext.define('AB.app.WampApplication', {
    extend: 'Ext.app.Application',

    // connection config 
    // namespaces: ['AB'],
    cookieDomain: null,
    websocketURI: null,
    appKey: null,
    appSecret: null,
    maxRetries: 10,
    retryDelay: 300,

    // optional URI abreviation for topic specification (see WebMQ documentation)
    topicToPrefix: null,
    topicPrefix: null,
    onWebmqReady: function() {
        this.resumeLaunch();
    },

    // will be set by the constructor for your information
    permissions: null,
    absession: null, // the session object is also created as a global variable "abssession"

    resumeLaunch: function() {
        var me = this;
        if (!this.isLaunched)
            AB.app.WampApplication.superclass.constructor.apply(me, arguments);
        this.isLaunched = true;

    },

    constructor: function(config) {
        var me = this;
        console.log('Starting WampApplication', me.websocketURI);
        var extra = null;
        if (document.cookie != "") {
            extra = {
                cookies: {}
            };
            // extra.cookies[document.domain] = document.cookie; // non-working, need to figure out ..
            extra.cookies[me.cookieDomain] = document.cookie;
        }


        // the reason why the WebMQ init is not done in the init function of the Extjs Application object
        // is because the session creation is asynchronous. -> The app class does not wait for the session to be created.
        // This is here ensured by calling the app class constructor only after successful connection.
        // (The init function of the app class is also called after this constructor.)
        ab.connect(me.websocketURI,

        //success

        function(sess) {
            me.absession = sess;
            // set global variable
            absession = sess;

            console.log("WebMQ connected!");
            if (me.appKey !== null) // anonymous auth
                me.absession.authreq(me.appKey, extra).then(function(challenge) {
                    var signature = me.absession.authsign(challenge, me.appSecret);
                    me.absession.auth(signature).then(

                    function(permissions) {
                        me.permissions = permissions;
                        // console.log("Connection authenticated with permissions: ", permissions);
                        if (me.topicToPrefix != null && me.topicPrefix != null) me.absession.prefix(me.topicPrefix, me.topicToPrefix);

                        // WebMQ ready. Call callback.
                        me.onWebmqReady();


                    }, ab.log);
                }, ab.log);
            else
                sess.authreq().then(function() {
                    sess.auth().then(function(permissions) {
                        me.permissions = permissions;
                        // console.log("Connection authenticated with permissions: ", permissions);
                        if (me.topicToPrefix != null && me.topicPrefix != null) me.absession.prefix(me.topicPrefix, me.topicToPrefix);

                        // WebMQ ready. Call callback.
                        me.onWebmqReady();
                    }, ab.log);


                }, ab.log);



        },
        //failure

        function(code, reason, detail) {
            console.log("WebMQ connection failed!", code, reason, detail);


            me.absession = null;
            switch (code) {
                case ab.CONNECTION_UNSUPPORTED:
                    window.location = "http://absession.ws/unsupportedbrowser";
                    break;
                case ab.CONNECTION_CLOSED:
                    window.location.reload();
                    break;
                default:
                    console.log(code, reason, detail);
                    break;
            }
        },
        //params
        {
            'maxRetries': me.maxRetries,
            'retryDelay': me.retryDelay
        });



    }
});
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
    extend: Ext.data.proxy.Server,
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

            if (typeof callback === 'function') {
                callback.call(scope || me, operation);
            }
            me.afterRequest(request, success);
        });
    }
}, function() {});
/**
 * AutobahnExtJS - Autobahn/WAMP proxy and support code for ExtJS.
 *
 * AutobahnExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 */

Ext.define('AB.form.action.WampSubmit', {
    extend: Ext.form.action.Submit,
    // requires: ['Ext.direct.Manager'],
    alternateClassName: 'AB.form.Action.WampSubmit',
    alias: 'formaction.wampsubmit',

    type: 'wampsubmit',

    doSubmit: function() {

        var me = this;
        var params = me.getParams();

        if (me.api.debug) {
            console.log("AB.form.action.WampSubmit.doSubmit", me.api, params);
        }

        if (!(me.api.session && me.api.session._websocket_connected && me.api.submit)) {

            me.failureType = Ext.form.action.Action.CONNECT_FAILURE;
            me.form.afterAction(me, false);

        } else {

            me.api.session.call(me.api.submit, params).then(

            function(res) {
                if (me.api.debug) {
                    console.log('Form Submit Success', res);
                }
                me.result = res;
                me.form.afterAction(me, true);
            },

            function(err) {
                if (me.api.debug) {
                    console.log('Form Submit Error', err);
                }
                if (err.details) {
                    // FIXME
                    // form.markInvalid(..);
                }
                me.failureType = Ext.form.action.Action.SERVER_INVALID;
                me.result = err;
                me.form.afterAction(me, false);
            });
        }
    }
});
/**
 * AutobahnExtJS - Autobahn/WAMP proxy and support code for ExtJS.
 *
 * AutobahnExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 */

Ext.define('AB.form.action.WampLoad', {
    extend: Ext.form.action.Load,
    // requires: ['Ext.direct.Manager'],
    alternateClassName: 'AB.form.Action.WampLoad',
    alias: 'formaction.wampload',

    type: 'wampload',

    run: function() {
        console.log('where is the wamp load?');

        var me = this;
        var params = me.getParams();

        if (me.api.debug) {
            console.log("AB.form.action.WampLoad.run", me.api, params);
        }

        if (!(me.api.session && me.api.session._websocket_connected && me.api.load)) {

            me.failureType = Ext.form.action.Action.CONNECT_FAILURE;
            me.form.afterAction(me, false);

        } else {

            me.api.session.call(me.api.load, params).then(

            function(res) {
                if (me.api.debug) {
                    console.log('Form Load Success', res);
                }
                me.form.clearInvalid();
                me.form.setValues(res);
                me.form.afterAction(me, true);
            },

            function(err) {
                if (me.api.debug) {
                    console.log('Form Load Error', err);
                }
                me.failureType = Ext.form.action.Action.LOAD_FAILURE;
                me.form.afterAction(me, false);
            });
        }
    }
});

/**
 * AutobahnExtJS - Autobahn/WAMP proxy and support code for ExtJS.
 *
 * AutobahnExtJS is dual-licensed and may be used under the terms of
 * the "GPLv3" or the "Sencha Model Extension License v1.0".
 *
 * http://opensource.org/licenses/GPL-3.0
 * https://market.sencha.com/licenses/77
 */
// Ext.require('Ext.form.Basic');
// Ext.Loader.setPath('AB', 'packages/autobahnextjs/src');

//@tag packageOverrides
Ext.define('AB.form.Basic', {
    override: 'Ext.form.Basic',
    // requires: ['AB.form.action.WampSubmit',  'AB.form.action.WampLoad'],



    // constructor: function(){
    //     console.log('form basic override applied');
    //     this.callParent(arguments);
    // },
    submit: function(options) {
        if (this.api && this.api.type === 'wamp') {
            return this.doAction('wampsubmit', options);
        } else {
            return this.doAction(this.standardSubmit ? 'standardsubmit' : this.api ? 'directsubmit' : 'submit', options);
        }
    },

    load: function(options) {
        if (this.api && this.api.type === 'wamp') {
            return this.doAction('wampload', options);
        } else {
            return this.doAction(this.api ? 'directload' : 'load', options);
        }
    },

    doAction: function(action, options) {
        if (Ext.isString(action)) {
            var config = {
                form: this
            };
            if (this.api && this.api.type === 'wamp') {
                config.api = this.api;
            }
            // console.log('calling wampsubmit', 'formaction.' + action);
            action = Ext.ClassManager.instantiateByAlias('formaction.' + action, Ext.apply({}, options, config));
        }
        if (this.fireEvent('beforeaction', this, action) !== false) {
            this.beforeAction(action);
            //Ext.defer(action.run, 100, action); // FIXME / Why defer by 100ms?
            action.run();
        }
        return this;
    }
});