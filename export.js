Ext.define("GridExporter", {
    //dateFormat : 'Y-m-d g:i',
    dateFormat : 'Y-m-d',

    exportCSV: function(grid) {
        var data = this._getCSV(grid);
        // fix: ' character was causing termination of csv file
        data = data.replace(/\'/g, "");
        this.downloadFiles(
            [
                'export.csv', 'data:text/csv;charset=utf8', data,
                'export.csv', 'data:text/csv;charset=utf8', data
            ]
        );

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

        if (fieldData === null || fieldData === undefined) {
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
            return c!==undefined && c!==null && c.locked === true;
        });
        return cols.length;
    },

    _getCSV: function (grid) {
        var cols    = grid.columns;
        var store   = grid.store;
        var data    = '';

        var that = this;
        Ext.Array.each(cols, function(col, index) {
        // Ext.Array.each(sortedCols, function(col, index) { 
            if (col.hidden !== true) {
                // fix the issue with the "SYLK" warning in excel by prepending "Item" to the ID column
                var colLabel = (index === 0 ? "Item " : "") + col.dataIndex;
                colLabel = colLabel.replace(/<br\/?>/,'');
                data += that._getFieldTextAndEscape(colLabel) + ',';
            }
        });
        data += "\n";

        _.each( store.data.items, function(record,i) {

            Ext.Array.each(cols, function(col, index) {
            
                if (col.hidden !== true) {
                    var fieldName   = col.dataIndex;
                    var text        = record.get(fieldName);
                    data += that._getFieldTextAndEscape(text,record,col,index) + ',';
                }
            });
            data += "\n";
        });

        return data;
    },

    downloadFiles: function( files ) {
        if ( files.length )
        {
            var data = files.pop();
            var format = files.pop();
            var file = files.pop();

            var href = "<a href='" + format + "," + encodeURIComponent(data) + "' download='" + file + "'></a>";

            var ml = Ext.DomHelper.insertAfter(window.document.getElementById('tsGrid'), href);
            ml.click();
            ml.remove();
            this.downloadFiles(files);
        }
    }

});