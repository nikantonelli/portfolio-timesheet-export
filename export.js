Ext.define("GridExporter", {
    //dateFormat : 'Y-m-d g:i',
    dateFormat : 'Y-m-d',

    exportGrid: function(grid) {
        var data = this._getCSV(grid);
        return "<a href='data:text/csv;charset=utf8," + encodeURIComponent(data) + "' download='export.csv'>Click to download file</a>";
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
            
                if (col.hidden != true) {
                    var fieldName   = col.dataIndex;
                    var text        = record.get(fieldName);
                    data += that._getFieldTextAndEscape(text,record,col,index) + ',';
                }
            });
            data += "\n";
        });

        return data;
    }

});