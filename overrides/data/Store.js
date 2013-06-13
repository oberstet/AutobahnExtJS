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