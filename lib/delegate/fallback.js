'use strict';

// Refactor of code originally authored by jden <jason@denizac.org>
// git://github.com/jden/fallback.git

module.exports = function fallback (array, iterator, callback) {

    function wrapper(item, next) {
        try {

            iterator(item, function (err, result) {
                if (err) {
                    err.arrayItem = item;
                    return callback(err);
                } else if (result === false || result === undefined) {
                    return next();
                }
                // item was successful
                return callback(null, result, item, array);

            });

        } catch (e) {
            e.arrayItem = item;
            callback(e);
        }
    }

    function complete(err) {
        if (err) {
            callback(err);
            return;
        }

        // no arrayItem was successful
        callback(null, false, null, array);
    }

    forEachSerial(array, wrapper, complete);

};


function forEachSerial(array, iterator, callback) {
    var arr, next;

    if (!array.length) {
        callback();
        return;
    }

    arr = array.slice();
    next = arr.shift();

    process.nextTick(function () {

        iterator(next, function (err) {
            if (err) {
                callback(err);
                return;
            }
            forEachSerial(arr, iterator, callback)
        });

    })
}