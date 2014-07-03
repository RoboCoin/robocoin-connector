'use strict';

var PriceUpdater = function (updateBuyElementId, updateSellElementId) {

    this._buyElement = $('#' + updateBuyElementId);
    this._sellElement = $('#' + updateSellElementId);
};

PriceUpdater.prototype._update = function (updateBuyElement, updateSellElement) {

    $.ajax({
        url: '/exchange/last-prices',
        success: function (data) {
            updateBuyElement.html(data.buyPrice);
            updateSellElement.html(data.sellPrice);
        },
        dataType: 'json'
    });
};

PriceUpdater.prototype.start = function () {

    var self = this;

    this._update(this._buyElement, this._sellElement);
    setInterval(function () { self._update(self._buyElement, self._sellElement); }, 30000);
};
