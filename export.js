Ext.define("GridExporter", {
    //dateFormat : 'Y-m-d g:i',
    dateFormat : 'Y-m-d',

    inheritableStatics: {
        XmlFileHeader: '<?xml version="1.0"?>',
        XmlFileExtension: '.xml.txt'
    },

    _downloadFiles: function( files ) {
        if ( files.length )
        {
            var data = files.pop();
            var format = files.pop();
            var file = files.pop();

            var href = "<a href='" + format + "," + encodeURIComponent(data) + "' download='" + file + "'></a>";

            var ml = Ext.DomHelper.insertAfter(window.document.getElementById('tsGrid'), href);
            ml.click();
//            ml.remove();
            this._downloadFiles(files);
        }
    },

    exportCSV: function(grid) {
        var data = this._getCSV(grid);
        // fix: ' character was causing termination of csv file
        data = data.replace(/\'/g, "");
        this._downloadFiles(
            [
                'export.csv', 'data:text/csv;charset=utf8', data
            ]
        );

    },

    _XMLIndent: function(index, tag, leaf, data) {
        var text = '\n';
        for (var i = 0; i < index; i++) text += '\t';
        text += '<' + tag + '>';
        text += data;
        if (!leaf) { text += '\n'; for (i = 0; i < index; i++) text += '\t';}
        text += '</' + tag + '>';
        return text;

    },

    _addSAPTrailerFile: function(data) {

        var file = 'E1BPCATS8';
        var format = 'data:text/text;charset=utf8';
        var text = this.self.XmlFileHeader;

        text += "\n<" + file + ">";
        _.each(data, function(record) {
            text += this._XMLIndent(1, 'Datarow', false,
                this._XMLIndent(2, 'GUID', true, record.get('ObjectID')) +
                this._XMLIndent(2, 'ROW', true, '') +
                this._XMLIndent(2, 'FORMAT_COL', true, '*') +
                this._XMLIndent(2, 'TEXT_LINE', true, '')
            );
        }, this);

        text += "</" + file + ">\n";
        file += this.self.XmlFileExtension;
        return [ file, format, text ];
    },

    _addSAPHeaderFile: function(data) {

        var file = 'E1CATS_INSERT';
        var format = 'data:text/text;charset=utf8';
        var text = this.self.XmlFileHeader;

        text += "\n<" + file + ">";
        _.each(data, function(record) {
            text += this._XMLIndent(1, 'Datarow', false,
                this._XMLIndent(2, 'GUID', true, record.get('ObjectID')) +
                this._XMLIndent(2, 'PROFILE', true, '') +
                this._XMLIndent(2, 'TEXT_FORMAT_IMP', true, 'ITF')
            );
        }, this);

        text += "</" + file + ">\n";
        file += this.self.XmlFileExtension;
        return [ file, format, text ];
    },

    _addSAPDataFile: function(data) {

        var file = 'E1BPCATS1';
        var format = 'data:text/text;charset=utf8';
        var text = this.self.XmlFileHeader;

        text += "\n<" + file + ">";
        _.each(data, function(record) {
            text += this._XMLIndent(1, 'Datarow', false,
                this._XMLIndent(2, 'GUID', true, record.get('ObjectID') || '') +
                this._XMLIndent(2, 'WORKDATE', true, Ext.Date.format(record.get('Date'), 'Ymd')) +
                this._XMLIndent(2, 'EMPLOYEENUMBER', true, record.get('c_KMDEmployeeID') || '') +
                this._XMLIndent(2, 'ACTTYPE', true, '') +
                this._XMLIndent(2, 'NETWORK', true, record.get('c_SAPNetwork') || '') +
                this._XMLIndent(2, 'ACTIVITY', true, record.get('c_SAPOperation') || '') +
                this._XMLIndent(2, 'SUB_ACTIVITY', true, record.get('c_SAPSubOperation') || '') +
                this._XMLIndent(2, 'CATSHOURS', true, record.get('Hours')) +
                this._XMLIndent(2, 'UNIT', true, 'H') +
                this._XMLIndent(2, 'SHORTTEXT', true, record.get('TaskDisplayString') || record.get('WorkProductDisplayString') || '') +
                this._XMLIndent(2, 'LONGTEXT', true, '')
            );
        }, this);
        text += "</" + file + ">\n";
        file += this.self.XmlFileExtension;
        return [ file, format, text ];

    },

    exportSAPXML: function(grid) {

        var filesToSave = [];

        if ( grid && grid.store && grid.store.data ) {
            var data = grid.store.data.items;
            this._downloadFiles( filesToSave.concat( this._addSAPHeaderFile(data), this._addSAPDataFile(data), this._addSAPTrailerFile(data) ));
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
                var colLabel = col.dataIndex;
//                var colLabel = (index === 0 ? "Item " : "") + col.dataIndex;
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
    }
});