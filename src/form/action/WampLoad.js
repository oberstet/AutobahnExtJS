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
    extend: 'Ext.form.action.Load',
    // requires: ['Ext.direct.Manager'],
    alternateClassName: 'AB.form.Action.WampLoad',
    alias: 'formaction.wampload',

    type: 'wampload',

    run: function() {
        // console.log('where is the wamp load?');

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
