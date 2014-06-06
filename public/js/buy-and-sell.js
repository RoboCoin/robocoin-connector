'use strict';

var PriceUpdater = function (updateElementid) {

    this._element = $('#' + updateElementid);
};

PriceUpdater.prototype._update = function (updateElement) {

    $.ajax({
        url: '/exchange/last-price',
        success: function (data) {
            updateElement.html(data.price);
        },
        dataType: 'json'
    });
};

PriceUpdater.prototype.start = function () {

    var updateElement = this._element;
    var self = this;

    this._update(updateElement);
    setInterval(function () { self._update(updateElement); }, 30000);
};
