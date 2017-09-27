odoo.define('incomplete.packing.products', function (require) {
    "use strict";

    var core = require('web.core');
    var Widget = require('web.Widget');
    var Model = require('web.Model');
    var session = require('web.session');
    var framework = require('web.framework');
    var form_widgets = require('web.form_widgets');
    var ajax = require('web.ajax');
    var crash_manager = require('web.crash_manager');
    var datepicker = require('web.datepicker');
    var dom_utils = require('web.dom_utils');
    var Priority = require('web.Priority');
    var ProgressBar = require('web.ProgressBar');
    var Dialog = require('web.Dialog');
    var formats = require('web.formats');
    var pyeval = require('web.pyeval');
    var utils = require('web.utils');
    var FormRenderingEngine = require('web.FormRenderingEngine');
    var Pager = require('web.Pager');
    var Sidebar = require('web.Sidebar');

    var mymodel = new Model('incomplete.packing.lot');

    var _t = core._t;

    var apps_client = null;
    var qweb = core.qweb;

    var myPackage = '';
    var write = false;

    var IncompletePackingProducts = Widget.extend({
        template: 'IncompletePackingProducts',
        init: function (parent, action) {
            var self = this;
            this._super.apply(this, arguments);
        },
        start: function () {
            var self = this;
            //整板或单个
            this.singleAll();
            //正常或异常
            this.normalAbnoemal();
            //点击提交按钮
            this.$el.find('.submit').click(function () {
                self.submit_click(self);
            });

            //点击保存按钮
            this.$el.find('.save').click(function () {
                self.save_click(self);
            })
        },
        singleAll: function () {
            this.$el.find('.single-all').bootstrapSwitch({
                onText: "整板",
                offText: "单个",
                onColor: "success",
                offColor: "info",
                onSwitchChange: function (event, state) {
                    if (state == true) {
                        //console.log(state);
                    } else {
                        //console.log(state);
                    }
                }
            });
        },
        normalAbnoemal: function () {
            this.$el.find('.normal-abnoemal').bootstrapSwitch({
                onText: "正常",
                offText: "异常",
                onColor: "success",
                offColor: "info",
                onSwitchChange: function (event, state) {
                    if (state == true) {
                        //console.log(state);
                    } else {
                        //console.log(state);
                    }
                }
            });
        },
        submit_click: function (obj) {
            //获取行数，并判断行数是否为空
            var self = this;

            var inputRow = Number(obj.$el.find('.input-row').val());
            if (inputRow == '') {
                alert('行数不能为空，请输入行数！');
                return;
            }

            //获取列数，并判断列数是否为空
            var inputCol = Number(obj.$el.find('.input-col').val());
            if (inputCol == '') {
                alert('列数不能为空，请输入列数！');
                return;
            }

            var enterData = new Array();
            var enter = obj.$el.find('.enter').val();
            enter = new String(enter);
            if (enter == '') {
                alert('您好，您的输入数据不能为空！');
                return;
            }
            enterData = enter.split('@');
            if (enterData.length > 1) {
                write = true;
                myPackage = enterData[0];
                var mylots = enterData[1].split(',');
                self.autoTable(inputRow, inputCol, mylots);
            } else {
                //提交编辑好的数据
                mymodel.call("batch_scan_lot", [{
                    'package': myPackage,
                    'lots': '',
                    'inputRow': '',
                    'inputCol': ''
                }]).then(function (res) {
                    //self.autoTable(inputRow, inputCol, mylots);
                });
            }

            //表格数据可编辑
            if (write == true) {
                var content;
                obj.$el.find('tbody td').click(function () {
                    var clickObj = $(this);
                    content = clickObj.html();
                    self.changeToEdit(clickObj, content);
                });
            }
        },
        save_click: function (obj) {
            var self = this;

            //获取新数据（编辑以后）
            var newData = self.getNewData();
            if (!newData) {
                return;
            }

            //获取行数，并判断是否为空
            var inputRow = Number(obj.$el.find('.input-row').val());
            if (inputRow == '') {
                alert('行数不能为空，请输入行数！');
                return;
            }

            //获取列数，并判断列数是否为空
            var inputCol = Number(obj.$el.find('.input-col').val());
            if (inputCol == '') {
                alert('列数不能为空，请输入列数！');
                return;
            }

            console.log({
                package: myPackage,
                lots: newData,
                inputRow: inputRow,
                inputCol: inputCol
            });

            //提交编辑好的数据
            mymodel.call("batch_scan_lot", [{
                'package': myPackage,
                'lots': newData,
                'inputRow': inputRow,
                'inputCol': inputCol
            }]).then(function (res) {
                console.log(res);
                if (res.state == 'S') {
                    setTimeout(function () {
                        alert('批号提交成功！')
                    }, 1000);
                } else {
                    var message = '';
                    for (var i = 0; i < res.message.length; i++) {
                        message += res.message[i];
                    }
                    alert('您的批号输入有错，错误信息如下：' + '\n' + message);
                }
            });
        },
        autoTable: function (row, col, data) {
            var self = this;
            var autoTable = this.$el.find('.autoTable')[0];
            var str = "";
            var data = data;
            var dataLength = data.length;
            var ai = 0;
            str = str + "<table id='table' class='table table-responsive table-bordered'>";
            for (var i = 0; i < col + 1; ++i) {
                if (i == 0) {
                    str = str + "<tr><th style='text-align: center' scope='col'> " + '坐标' + "</th>";
                }
                else {
                    str = str + "<th scope='col'> " + (i) + "</th>";
                }
            }

            str = self.tableValue(data, ai, row - 1, col, str);

            str = str + "</table>";
            autoTable.innerHTML = str;
        },
        tableValue: function (data, ai, rows, col, str) {
            var dataLength = data.length;
            for (var i = 0; i < rows + 1; ++i) {
                for (var j = 0; j < col + 1; ++j) {
                    if (ai >= dataLength) {
                        if (j == 0) {
                            str = str + "<tr><th scope='col'> " + (i + 1) + "</th>";
                        }
                        else {
                            str = str + "<td scope='col'> </td>";
                        }
                    }
                    else {
                        if (j == 0) {
                            str = str + "<tr><th scope='col'> " + (i + 1) + "</th>";
                        }
                        else {
                            if (j == col - 1) {
                                str = str + "<td scope='col'> " + (data[ai++]) + "</td>";
                            }
                            else {
                                str = str + "<td scope='col'> " + (data[ai++]) + "</td>";
                            }
                        }
                    }
                }
                str = str + "</tr>";
            }
            return str;
        },
        changeToEdit: function (node, content) {
            node.html("");
            var inputObj = $("<input class='form-control' type='text'/>");
            inputObj.val(content).appendTo(node)
                .get(0).select();
            inputObj.click(function () {
                return false;
            }).keyup(function (event) {
                var keyvalue = event.which;
                if (keyvalue == 13) {
                    node.html(node.children("input").val());
                }
                if (keyvalue == 27) {
                    node.html(content);
                }
            }).blur(function () {
                node.html(node.children("input").val());
            });
        },
        getNewData: function () {
            // 遍历所有的table数据
            var newData = '';
            if ($('.table').length == 0) {
                alert('请先进行提交，才有数据可以保存！');
                return newData;
            }
            $('.table').find('tbody').each(function () {
                //遍历每个tr
                $(this).find('tr').each(function () {
                    //遍历每个td
                    $(this).find('td').each(function () {
                        newData += $(this).text() + ',';
                    });
//                newData += '|';
                });
            });
            return newData;
        },
    });

    core.action_registry.add("incomplete.packing.products", IncompletePackingProducts);

    return {
        IncompletePackingProducts: IncompletePackingProducts
    };

});
