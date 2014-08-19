/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2014 eBay Software Foundation                                │
│                                                                             │
│hh ,'""`.                                                                    │
│  / _  _ \  Licensed under the Apache License, Version 2.0 (the "License");  │
│  |(@)(@)|  you may not use this file except in compliance with the License. │
│  )  __  (  You may obtain a copy of the License at                          │
│ /,'))((`.\                                                                  │
│(( ((  )) ))    http://www.apache.org/licenses/LICENSE-2.0                   │
│ `\ `)(' /'                                                                  │
│                                                                             │
│   Unless required by applicable law or agreed to in writing, software       │
│   distributed under the License is distributed on an "AS IS" BASIS,         │
│   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
│   See the License for the specific language governing permissions and       │
│   limitations under the License.                                            │
\*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var util = require('util');
var stream = require('stream');


/**
 * A noop write stream for handling discarded responses
 * @constructor
 */
function DevNull() {
    DevNull.super_.apply(this, arguments);
    this.statusCode = 200;
}

util.inherits(DevNull, stream.Writable);


DevNull.prototype.setHeader = function (name, value) {
    // noop
};


DevNull.prototype._write = function (chunk, encoding, callback) {
    // noop
    callback();
};


module.exports = DevNull;