![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) Structure Plugin 

# seneca-service-loader
[![npm version][npm-badge]][npm-url]
[![Dependency Status][david-badge]][david-url]

Lead Maintainer: [Tobias Gurtzick](https://github.com/wzrdtales)

# seneca-service-loader

This module is a plugin for the Seneca framework. It provides you with capabilities to cleanly structure your
services.

# Usage

To use the service-loader first install the module via

    npm i -s seneca-service-loader

Now you can require the plugin and use it, like in the following example:

```javascript
'use strict';

const Service = require('seneca-service-loader');
const seneca = require('seneca');

const service = new Service(seneca);
service
  .register([
    {
      register: require('hapi-mariadb'),
      options: {
        mariasql: config.database,
        connectionCount: 8,
        poolAsPromised: true
      }
    }
  ])
  .then(() => service.load());
```

Now it will allow you to load any file from lib/controllers/*.js. A service looks like this:

```javascript
'use strict';

module.exports = {
  pin: 'my:pin,command:name':,
  request: async (request, data) => {
    return null;
  }
}
```

The example provided here also registers a hapi plugin. Quite simple plugins for hapi do
work with this module. Like most database modules. This is intended to produce a better
overall experience, by accessing APIs everywhere in the same way.

[npm-badge]: https://badge.fury.io/js/seneca-service-loader.svg
[npm-url]: https://badge.fury.io/js/seneca-service-loader
[david-badge]: https://david-dm.org/wzrdtales/seneca-service-loader.svg
[david-url]: https://david-dm.org/wzrdtales/seneca-service-loader
[BadgeTravis]: https://travis-ci.org/wzrdtales/seneca-service-loader.svg?branch=master
