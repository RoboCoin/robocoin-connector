'use strict';

var PriceUpdater = function (updateBuyElementId, updateSellElementId, kioskSelectorId) {

    this._buyElement = $('#' + updateBuyElementId);
    this._sellElement = $('#' + updateSellElementId);
    this._kioskSelector = $('#' + kioskSelectorId);
};

PriceUpdater.prototype.update = function (updateBuyElement, updateSellElement) {

    var self = this;

    $.ajax({
        url: '/exchange/last-prices',
        data: {
            kioskId: this._kioskSelector.val()
        },
        success: function (data) {
            self._buyElement.html(data.buyPrice);
            self._sellElement.html(data.sellPrice);
        },
        dataType: 'json'
    });
};

PriceUpdater.prototype.start = function () {

    var self = this;

    this.update();
    setInterval(function () { self.update(); }, 30000);
};
