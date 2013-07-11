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
    extend: 'Ext.form.action.Submit',
    // requires: ['Ext.direct.Manager'],
    alternateClassName: 'AB.form.Action.WampSubmit',
    alias: 'formaction.wampsubmit',

    type: 'wampsubmit',

    doSubmit: function() {

        var me = this;
        var params = me.getParams('jsonData');

        me.api.session = me.api.session || absession;
        
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