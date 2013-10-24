'use strict';


function Iterator(items, factory) {
    this._items = items;
    this._factory = factory;
    this._current = 0;
}

Iterator.prototype = {

    get complete () {
        return this._current >= this._items.length;
    },

    next: function () {
        var item;

        if (this.complete) {
            throw Error('StopIteration');
        }

        item = this._items[this._current];
        this._factory && (item = this._factory.create(item, this._current, this._items));
        this._current += 1;

        return item;
    }

};


module.exports = Iterator;