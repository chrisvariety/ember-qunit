"use strict";
var Ember = require("ember")["default"] || require("ember");
var QUnit = require("qunit")["default"] || require("qunit");
var testContext = require("./test-context")["default"] || require("./test-context");
var isolatedContainer = require("./isolated-container")["default"] || require("./isolated-container");
var testResolver = require("./test-resolver")["default"] || require("./test-resolver");

exports["default"] = function moduleFor(fullName, description, callbacks, delegate) {
  callbacks = callbacks || { };

  var needs = [fullName].concat(callbacks.needs || []);
  var resolver = callbacks.resolver || testResolver.get();
  var container = isolatedContainer(resolver, needs);

  callbacks.subject = callbacks.subject || defaultSubject;

  callbacks.setup    = callbacks.setup    || function() { };
  callbacks.teardown = callbacks.teardown || function() { };

  function factory() {
    return container.lookupFactory(fullName);
  }

  function subject(options) {
    return callbacks.subject(factory(), options);
  }

  testContext.set({
    container: container,
    subject: subject,
    factory: factory,
    __setup_properties__: callbacks
  });

  if (delegate) {
    delegate(container, testContext.get(), defaultSubject);
  }

  var context = testContext.get();
  // TODO: move this to component|view callbacks when infrastructure is added
  // to make it simpler
  var dispatcher = Ember.EventDispatcher.create();
  var _callbacks = {
    setup: function(){
      container = isolatedContainer(resolver, needs);
      dispatcher.setup();
      if (Ember.$('#ember-testing').length === 0) {
        Ember.$('<div id="ember-testing"/>').appendTo(document.body);
      }
      buildContextVariables(context);
      callbacks.setup.call(context, container);
    },

    teardown: function(){
      Ember.run(function(){
        container.destroy();
        dispatcher.destroy();
      });
      Ember.$('#ember-testing').empty();
      callbacks.teardown(container);
    }
  };

  QUnit.module(description || fullName, _callbacks);
}

function defaultSubject(factory, options) {
  return factory.create(options);
}

// allow arbitrary named factories, like rspec let
function buildContextVariables(context) {
  var cache = { };
  var callbacks = context.__setup_properties__;
  var factory = context.factory;
  var container = context.container;

  Ember.keys(callbacks).filter(function(key){
    // ignore the default setup/teardown keys
    return key !== 'setup' && key !== 'teardown';
  }).forEach(function(key){
    context[key] = function(options) {
      if (cache[key]) {
        return cache[key];
      }

      var result = callbacks[key](factory(), options, container);
      cache[key] = result;
      return result;
    };
  });
}