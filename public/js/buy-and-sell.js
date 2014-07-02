'use strict';

var PriceUpdater = function (updateElementid) {

    this._element = $('#' + updateElementid);
};

PriceUpdater.prototype._update = function (updateBuyElement, updateSellElement) {

    $.ajax({
        url: '/exchange/last-prices',
        success: function (data) {
            updateBuyElement.html(data.prices.buyPrice);
            updateSellElement.html(data.prices.sellPrice);
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
