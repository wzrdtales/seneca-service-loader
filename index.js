'use strict';

const Promise = require('bluebird');
const glob = Promise.promisify(require('glob'));
const path = require('path');

module.exports = class Services {
  constructor (seneca) {
    this.request = {
      server: {
        plugins: {}
      },
      seneca: seneca
    };
    this.seneca = seneca;
  }

  expose (key, value) {
    this.request.server.plugins[key] = value;
  }

  register (plugins) {
    return Promise.resolve(plugins).each(plugin => {
      if (typeof plugin === 'string') {
        plugin = {
          register: plugin
        };
      }

      plugin.options = plugin.options || {};

      return new Promise((resolve, reject) => {
        plugin.register.register(this, plugin.options, err => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
  }

  load (options = {}, addOptions) {
    return glob(options.globPath || path.resolve('./lib/controllers/**/*.js'))
      .map(service => require(service))
      .each(service => {
        this.seneca.add(service.pin, (msg, reply) => {
          const auth = { auth: { credentials: msg.session } } || {};
          const optional =
            typeof addOptions === 'function' ? addOptions(msg) : {};
          return Promise.resolve(
            service.request({ ...this.request, ...auth, ...optional }, msg.data)
          ).asCallback(reply);
        });
      });
  }
};
