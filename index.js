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
      let attributes;
      let name;
      if (typeof plugin === 'string') {
        plugin = {
          register: require(plugin)
        };
      }

      attributes = plugin.register.register.attributes;
      name = attributes.name || attributes.pkg.name;
      plugin.options = plugin.options || {};
      this.request.server.plugins[name] = {};

      return new Promise((resolve, reject) => {
        const overwrite = {
          expose: (key, value) => {
            this.request.server.plugins[name][key] = value;
          }
        };
        const serverInstance = { ...this.request, ...overwrite };
        plugin.register.register(serverInstance, plugin.options, err => {
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
            service.request(
              { ...this.request, ...auth, msg, ...optional },
              msg.data
            )
          ).asCallback(reply);
        });
      });
  }
};
