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
    requires: ['Ext.form.Basic', 'Ext.util.MixedCollection', 'Ext.form.action.Load', 'Ext.form.action.Submit',
            'Ext.window.MessageBox', 'Ext.data.Errors', 'Ext.util.DelayedTask',
            'AB.form.action.WampSubmit','AB.form.action.WampLoad'
    ],
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