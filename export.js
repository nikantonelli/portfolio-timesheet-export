Ext.define("GridExporter", {
    //dateFormat : 'Y-m-d g:i',
    dateFormat : 'Y-m-d',

    exportGrid: function(grid) {
        if (Ext.isIE) {
            this._ieToExcel(grid);

        } else {
            var data = this._getCSV(grid);
            // window.location = 'data:text/csv;charset=utf8,' + encodeURIComponent(data);
            return "<a href='data:text/csv;charset=utf8," + encodeURIComponent(data) + "' download='export.csv'>Click to download file</a>";
        }
    },

    _escapeForCSV: function(string) {
        string = "" + string;
        if (string.match(/,/)) {
            if (!string.match(/"/)) {
                string = '"' + string + '"';
            } else {
                string = string.replace(/,/g, ''); // comma's and quotes-- sorry, just loose the commas
            }
        }
        return string;
    },

    _getFieldText: function(fieldData,record,col,index) {
        var text;

        // console.log("record",record);

        // User Hours   Last Updated    Epic    Feature
        if (!_.isUndefined(col) && col.text === "Date")
            return record.raw.DateVal;

        if (!_.isUndefined(col) && col.text === "Cost Center")
            return record.get("UserObject").get("CostCenter");

        if (!_.isUndefined(col) && col.text === "Project")
            return record.get("TimeEntryItemObject").get("Project")._refObjectName;
        // Time Entry Item Task    User    Hours   Last Updated    Epic    Feature
        if (!_.isUndefined(col) && col.text === "Time Entry Item")
            return record.get("TimeEntryItemObject").get("WorkProductDisplayString");
        if (!_.isUndefined(col) && col.text === "Task")
            return record.get("TimeEntryItemObject").get("TaskDisplayString");
        if (!_.isUndefined(col) && col.text === "User")
            return record.get("UserObject").get("UserName");
        if (!_.isUndefined(col) && col.text === "Epic")
            return record.get("EpicObject") ? record.get("EpicObject").get("FormattedID") + ":" + record.get("EpicObject").get("Name") : "" ;
        if (!_.isUndefined(col) && col.text === "Feature")
            return record.get("FeatureObject") ? record.get("FeatureObject").get("FormattedID") + ":" + record.get("FeatureObject").get("Name") : "" ;


        if (fieldData == null || fieldData == undefined) {
            text = '';

        } else if (fieldData._refObjectName && !fieldData.getMonth) {
            text = fieldData._refObjectName;

        } else if (fieldData instanceof Date) {
            text = Ext.Date.format(fieldData, this.dateFormat);

        } /*else if (!fieldData.match) { // not a string or object we recognize...bank it out
            text = '';
        } */ else {
            text = fieldData;
        }

        return text;
    },

    _getFieldTextAndEscape: function(fieldData,record,col,index) {
        var string  = this._getFieldText(fieldData,record,col,index);

        return this._escapeForCSV(string);
    },

    // have to add the colIdx to the count of locked columns
    fixedColumnCount : function(columns) {
        var cols = _.filter(columns,function(c) { 
            return c!==undefined && c!==null && c.locked == true;
        });
        return cols.length;
    },

    _getCSV: function (grid) {
        var cols    = grid.columns;
        var store   = grid.store;
        var data    = '';
        console.log("cols",cols);

        cols.push({ text : "Cost Center"});

        var that = this;
        Ext.Array.each(cols, function(col, index) {
        // Ext.Array.each(sortedCols, function(col, index) { 
            if (col.hidden != true) {
                // fix the issue with the "SYLK" warning in excel by prepending "Item" to the ID column
                var colLabel = (index === 0 ? "Item " : "") + col.text;
                colLabel = colLabel.replace(/<br\/?>/,'');
                data += that._getFieldTextAndEscape(colLabel) + ',';
            }
        });
        data += "\n";

        _.each( store.data.items, function(record) {

            Ext.Array.each(cols, function(col, index) {
            // Ext.Array.each(sortedCols, function(col) {

                // var index = headerIndex[col.text];
            
                if (col.hidden != true) {
                    var fieldName   = col.dataIndex;
                    var text        = record.get(fieldName);
                    data += that._getFieldTextAndEscape(text,record,col,index) + ',';
                }
            });
            data += "\n";
        });

        return data;
    },

    _ieGetGridData : function(grid, sheet) {
        var that            = this;
        var resourceItems   = grid.store.data.items;
        var cols            = grid.columns;

        Ext.Array.each(cols, function(col, colIndex) {
            if (col.hidden != true) {
                
                sheet.cells(1,colIndex + 1).value = col.text;
            }
        });

        var rowIndex = 2;
        grid.store.each(function(record) {
            var entry   = record.getData();

            Ext.Array.each(cols, function(col, colIndex) {
                if (col.hidden != true) {
                    var fieldName   = col.dataIndex;
                    var text        = entry[fieldName];
                    var value       = that._getFieldText(text);

                    sheet.cells(rowIndex, colIndex+1).value = value;
                }
            });
            rowIndex++;
        });
    },

    _ieToExcel: function (grid) {
        if (window.ActiveXObject){
            var  xlApp, xlBook;
            try {
                xlApp = new ActiveXObject("Excel.Application"); 
                xlBook = xlApp.Workbooks.Add();
            } catch (e) {
                Ext.Msg.alert('Error', 'For the export to work in IE, you have to enable a security setting called "Initialize and script ActiveX control not marked as safe" from Internet Options -> Security -> Custom level..."');
                return;
            }

            xlBook.worksheets("Sheet1").activate;
            var XlSheet = xlBook.activeSheet;
            xlApp.visible = true; 

           this._ieGetGridData(grid, XlSheet);
           XlSheet.columns.autofit; 
        }
    }
});