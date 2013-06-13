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
    override:'Ext.data.TreeStore',
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