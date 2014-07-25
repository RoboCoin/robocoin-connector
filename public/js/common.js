'use strict';

var dismissibleAlert = function (type, message) {
    return '<div role="alert" class="alert alert-dismissible alert-' + type + '">' +
        '<button type="button" data-dismiss="alert" class="close">' +
        '<span aria-hidden="true">&times;</span>' +
        '<span class="sr-only">Close</span>' +
        '</button>' + message +
        '</div>';
};
