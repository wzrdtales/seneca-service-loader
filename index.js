'use strict';

const Promise = require('bluebird');
const glob = Promise.promisify(require('glob'));
const path = require('path');
const EventEmitter = require('events');

class ServiceEvents extends EventEmitter {}

const RESERVED = ['server', 'seneca'];

module.exports = class Services {
  constructor (seneca) {
    this.events = new ServiceEvents();
    this.request = {
      chainLoader: this.chainLoader.bind(this),
      server: {
        plugins: {},
        events: this.events
      },
      decorate: this.decorate.bind(this),
      seneca: seneca
    };
    this.chain = [];
    this.seneca = seneca;
  }

  expose (key, value) {
    this.request.server.plugins[key] = value;
  }

  decorate (key, value) {
    if (RESERVED.indexOf(key) !== -1) {
      throw new Error(`Invalid name! "${key}" is a reserved keyword.`);
    }

    this.request[key] = value;
  }

  chainLoader (fn) {
    this.chain.push(fn);
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
      .map(service => ({ name: service, service: require(service) }))
      .each(({ service, name }) => {
        if (typeof service.request !== 'function') {
          console.error(`The service ${name} does not have a request payload!`);
          return;
        }

        this.seneca.add(service.pin, (msg, reply) => {
          const auth = { auth: { credentials: msg.session } } || {};
          const optional =
            typeof addOptions === 'function' ? addOptions(msg) : {};

          if (this.chain.length) {
            const chain = this.chain
              .map(n => n(service.pin))
              .filter(n => n !== null);
            const PChain = Promise.resolve();

            for (let loader of chain) {
              PChain.then(() => loader());
            }

            return PChain.then(() =>
              service.request(
                { ...this.request, ...auth, msg, ...optional },
                msg.data
              )
            ).asCallback(reply);
          } else {
            return Promise.resolve(
              service.request(
                { ...this.request, ...auth, msg, ...optional },
                msg.data
              )
            ).asCallback(reply);
          }
        });
      });
  }

  stop () {
    this.events.emit('stop');
    this.seneca.close();
  }
};
