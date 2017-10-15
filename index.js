'use strict';

const Promise = require('bluebird');
const glob = Promise.promisifyAll(require('glob'));

module.exports = class Services {
  constructor (seneca) {
    this.request = {
      server: {
        plugins: {}
      },
      seneca: seneca
    };
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

  load (options, addOptions) {
    return globAsync(
      options.globPath || './lib/controllers/**/*.js'
    ).each(service => {
      seneca.add(service.pin, (msg, reply) => {
        const auth = { auth: { credentials: msg.session } } || {};
        const module = require(service.request);
        const optional =
          typeof addOptions === 'function' ? addOptions(msg) : {};

        return Promise.resolve(
          module.request({ ...this.request, ...auth, ...optional }, msg.data)
        ).asCallback(reply);
      });
    });
  }
};
