/*
 * Copyright (c) 2015, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var groupId, user;

(function () {
    var cache = {};
    var permissionSet = {};
    var validateAndReturn = function (value) {
        return (value == undefined || value == null) ? "Unspecified" : value;
    };
    Handlebars.registerHelper("groupMap", function (group) {
        group.id = validateAndReturn(group.id);
    });
    Handlebars.registerHelper("deviceMap", function (device) {
        device.owner = validateAndReturn(device.owner);
        device.ownership = validateAndReturn(device.ownership);
        var arr = device.properties;
        if (arr) {
            device.properties = arr.reduce(function (total, current) {
                total[current.name] = validateAndReturn(current.value);
                return total;
            }, {});
        }
    });
    Handlebars.registerHelper("if_owner", function (owner, opts) {
        if (owner == user) {
            return opts.fn(this);
        } else {
            opts.inverse(this);
        }
    });

    //This method is used to setup permission for device listing
    $.setPermission = function (permission) {
        permissionSet[permission] = true;
    };

    $.hasPermission = function (permission) {
        return permissionSet[permission];
    };
})();

/*
 * Setting-up global variables.
 */
var deviceCheckbox = "#ast-container-parent .ctrl-wr-asset .itm-select input[type='checkbox']";
var assetContainerParent = "#ast-container-parent";

/*
 * DOM ready functions.
 */
$(document).ready(function () {
    /* Adding selected class for selected devices */
    $(deviceCheckbox).each(function () {
        addDeviceSelectedClass(this);
    });

    var i;
    user = $("#permission").data("user");
    var permissionList = $("#permission").data("permission");
    for (i = 0; i < permissionList.length; i++) {
        $.setPermission(permissionList[i]);
    }

    /* for device list sorting drop down */
    $(".ctrl-filter-type-switcher").popover({
        html: true,
        content: function () {
            return $("#content-filter-types").html();
        }
    });

    groupId = $("#request-group-id").data("groupid");
    loadDevices();
});

/*
 * On Select All Device button click function.
 *
 * @param button: Select All Device button
 */
function selectAllDevices(button) {
    if (!$(button).data('select')) {
        $(deviceCheckbox).each(function (index) {
            $(this).prop('checked', true);
            addDeviceSelectedClass(this);
        });
        $(button).data('select', true);
        $(button).html('Deselect All Devices');
    } else {
        $(deviceCheckbox).each(function (index) {
            $(this).prop('checked', false);
            addDeviceSelectedClass(this);
        });
        $(button).data('select', false);
        $(button).html('Select All Devices');
    }
}

/*
 * On listing layout toggle buttons click function.
 *
 * @param view: Selected view type
 * @param selection: Selection button
 */
function changeDeviceView(view, selection) {
    $(".view-toggle").each(function () {
        $(this).removeClass("selected");
    });
    $(selection).addClass("selected");
    if (view == "list") {
        $(assetContainerParent).addClass("list-view");
    } else {
        $(assetContainerParent).removeClass("list-view");
    }
}

/*
 * Add selected style class to the parent element function.
 *
 * @param checkbox: Selected checkbox
 */
function addDeviceSelectedClass(checkbox) {
    if ($(checkbox).is(":checked")) {
        $(checkbox).closest(".ctrl-wr-asset").addClass("selected device-select");
    } else {
        $(checkbox).closest(".ctrl-wr-asset").removeClass("selected device-select");
    }
}

function loadDevices() {
    var groupListing = $("#group-listing");
    var groupListingSrc = groupListing.attr("src");
    $.template("group-listing", groupListingSrc, function (template) {
        var serviceURL;
        if (groupId && groupId != "0") {
            serviceURL = "/iotserver/api/group/id/" + groupId + "/device/all";
        } else {
            serviceURL = "/iotserver/api/devices/all";
        }
        var successCallback = function (data) {
            data = JSON.parse(data);
            var viewModel = {};
            var groups;
            if (groupId && groupId != "0") {
                groups = data;
            } else {
                groups = data.data;
            }
            viewModel.groups = groups;
            var content = template(viewModel);
            $("#ast-container-parent").html(content);
            var deviceListing = $("#device-listing");
            var deviceListingSrc = deviceListing.attr("src");
            var imageResource = deviceListing.data("image-resource");
            $.template("device-listing", deviceListingSrc, function (template) {
                for (var g in groups) {
                    if (groups[g].devices && groups[g].devices.length > 0) {
                        viewModel = {};
                        viewModel.devices = groups[g].devices;
                        viewModel.imageLocation = imageResource;
                        content = template(viewModel);
                    } else {
                        if (groupId && groupId != "0") {
                            content = $("#no-grouped-devices-div-content").html();
                        } else if (groups[g].id == 0 && g == 0) {
                            content = $("#no-devices-div-content").html();
                        } else {
                            content = $("#no-devices-in-group-div-content").html();
                        }
                    }
                    $("#ast-container-" + groups[g].id).html(content);
                }
                /*
                 * On device checkbox select add parent selected style class
                 */
                $(deviceCheckbox).click(function () {
                    addDeviceSelectedClass(this);
                });
                attachEvents();
                formatDates();
            });
        };
        invokerUtil.get(serviceURL,
            successCallback, function (message) {
                console.log(message);
            });
    });
}

function formatDates() {
    $(".formatDate").each(function () {
        var timeStamp = $(this).html();
        $(this).html(new Date(parseInt(timeStamp)).toUTCString());
    });
}

/**
 * Sorting function of users
 * listed on User Management page in WSO2 MDM Console.
 */
$(function () {
    var sortableElem = '.wr-sortable';
    $(sortableElem).sortable({
        beforeStop: function () {
            var sortedIDs = $(this).sortable('toArray');
            console.log(sortedIDs);
        }
    });
    $(sortableElem).disableSelection();
});

var modalPopup = ".wr-modalpopup";
var modalPopupContainer = modalPopup + " .modalpopup-container";
var modalPopupContent = modalPopup + " .modalpopup-content";
var body = "body";

/*
 * set popup maximum height function.
 */
function setPopupMaxHeight() {
    $(modalPopupContent).css('max-height', ($(body).height() - ($(body).height() / 100 * 30)));
    $(modalPopupContainer).css('margin-top', (-($(modalPopupContainer).height() / 2)));
}

/*
 * show popup function.
 */
function showPopup() {
    $(modalPopup).show();
    setPopupMaxHeight();
}

/*
 * hide popup function.
 */
function hidePopup() {
    $(modalPopupContent).html('');
    $(modalPopup).hide();
}


/**
 * Following functions should be triggered after AJAX request is made.
 */
function attachEvents() {
    /**
     * Following click function would execute
     * when a user clicks on "Remove" link
     * on Device Management page in WSO2 MDM Console.
     */
    $("a.remove-device-link").click(function () {
        var deviceId = $(this).data("deviceid");
        var deviceType = $(this).data("devicetype");
        var removeDeviceAPI = "/iotserver/api/device/" + deviceType + "/" + deviceId + "/remove";

        $(modalPopupContent).html($('#remove-device-modal-content').html());
        showPopup();

        $("a#remove-device-yes-link").click(function () {
            invokerUtil.get(
                removeDeviceAPI,
                function (data, txtStatus, jqxhr) {
                    var status = jqxhr.status;
                    if (status == 200) {
                        $(modalPopupContent).html($('#remove-device-200-content').html());
                        $('div[data-deviceid="' + deviceId + '"]').remove();
                        setTimeout(function () {
                            hidePopup();
                        }, 2000);
                    } else if (status == 400) {
                        $(modalPopupContent).html($('#remove-device-400-content').html());
                        $("a#remove-device-400-link").click(function () {
                            hidePopup();
                        });
                    } else if (status == 403) {
                        $(modalPopupContent).html($('#remove-device-403-content').html());
                        $("a#remove-device-403-link").click(function () {
                            hidePopup();
                        });
                    } else if (status == 409) {
                        $(modalPopupContent).html($('#remove-device-409-content').html());
                        $("a#remove-device-409-link").click(function () {
                            hidePopup();
                        });
                    }
                },
                function () {
                    $(modalPopupContent).html($('#remove-device-unexpected-error-content').html());
                    $("a#remove-device-unexpected-error-link").click(function () {
                        hidePopup();
                    });
                }
            );
        });

        $("a#remove-device-cancel-link").click(function () {
            hidePopup();
        });

    });

    /**
     * Following click function would execute
     * when a user clicks on "Edit" link
     * on Device Management page in WSO2 MDM Console.
     */
    $("a.edit-device-link").click(function () {
        var deviceId = $(this).data("deviceid");
        var deviceType = $(this).data("devicetype");
        var deviceName = $(this).data("devicename");
        var editDeviceAPI = "/iotserver/api/device/" + deviceType + "/" + deviceId + "/update";

        $(modalPopupContent).html($('#edit-device-modal-content').html());
        $('#edit-device-name').val(deviceName);
        showPopup();

        $("a#edit-device-yes-link").click(function () {
            var newDeviceName = $('#edit-device-name').val();
            var device = {"device": {"name": newDeviceName}};
            invokerUtil.post(
                editDeviceAPI,
                device,
                function (data, txtStatus, jqxhr) {
                    var status = jqxhr.status;
                    if (status == 200) {
                        $(modalPopupContent).html($('#edit-device-200-content').html());
                        $("div[data-deviceid='" + deviceId + "'] .ast-name").html(newDeviceName);
                        setTimeout(function () {
                            hidePopup();
                        }, 2000);
                    } else if (status == 400) {
                        $(modalPopupContent).html($('#device-400-content').html());
                        $("a#device-400-link").click(function () {
                            hidePopup();
                        });
                    } else if (status == 403) {
                        $(modalPopupContent).html($('#device-403-content').html());
                        $("a#device-403-link").click(function () {
                            hidePopup();
                        });
                    } else if (status == 409) {
                        $(modalPopupContent).html($('#device-409-content').html());
                        $("a#device-409-link").click(function () {
                            hidePopup();
                        });
                    }
                },
                function () {
                    $(modalPopupContent).html($('#device-unexpected-error-content').html());
                    $("a#device-unexpected-error-link").click(function () {
                        hidePopup();
                    });
                }
            );
        });

        $("a#edit-device-cancel-link").click(function () {
            hidePopup();
        });
    });

    /**
     * Following click function would execute
     * when a user clicks on "Group" link
     * on Device Management page in WSO2 MDM Console.
     */
    if ($("a.group-device-link").length > 0) {
        $("a.group-device-link").click(function () {
            var deviceId = $(this).data("deviceid");
            var deviceType = $(this).data("devicetype");
            var endPoint = "/iotserver/api/group/all";

            $(modalPopupContent).html($('#group-device-modal-content').html());
            $('#user-groups').html("Loading...");
            $("a#group-device-yes-link").hide();
            showPopup();

            invokerUtil.get(endPoint,
                function (data, txtStatus, jqxhr) {
                    var groups = JSON.parse(data);
                    var status = jqxhr.status;
                    if (status == 200) {
                        if (groups.length <= 0) {
                            $('#user-groups').html("There is no any groups available");
                            return;
                        }
                        var str = '<br /><select id="assign-group-selector" style="color:#3f3f3f;padding:5px;width:250px;">';
                        for (var group in groups) {
                            str += '<option value="' + groups[group].id + '">' + groups[group].name + '</option>';
                        }
                        str += '</select>';
                        $('#user-groups').html(str);
                        $("a#group-device-yes-link").show();
                        $("a#group-device-yes-link").click(function () {
                            var selectedGroupId = $('#assign-group-selector').val();
                            endPoint = "/iotserver/api/group/id/" + selectedGroupId + "/assign";
                            var device = {"deviceId": deviceId, "deviceType": deviceType};
                            invokerUtil.post(
                                endPoint,
                                device,
                                function (data, txtStatus, jqxhr) {
                                    var status = jqxhr.status;
                                    if (status == 200) {
                                        $(modalPopupContent).html($('#group-associate-device-200-content').html());
                                        loadDevices();
                                        setTimeout(function () {
                                            hidePopup();
                                        }, 2000);
                                    } else if (status == 400) {
                                        $(modalPopupContent).html($('#device-400-content').html());
                                        $("a#device-400-link").click(function () {
                                            hidePopup();
                                        });
                                    } else if (status == 403) {
                                        $(modalPopupContent).html($('#device-403-content').html());
                                        $("a#device-403-link").click(function () {
                                            hidePopup();
                                        });
                                    } else if (status == 409) {
                                        $(modalPopupContent).html($('#device-409-content').html());
                                        $("a#device-409-link").click(function () {
                                            hidePopup();
                                        });
                                    }
                                },
                                function () {
                                    $(modalPopupContent).html($('#device-unexpected-error-content').html());
                                    $("a#device-unexpected-error-link").click(function () {
                                        hidePopup();
                                    });
                                });
                        });
                    }
                },
                function () {
                    $(modalPopupContent).html($('#device-unexpected-error-content').html());
                    $("a#device-unexpected-error-link").click(function () {
                        hidePopup();
                    });
                });

            $("a#group-device-cancel-link").click(function () {
                hidePopup();
            });
        });

    }
}
