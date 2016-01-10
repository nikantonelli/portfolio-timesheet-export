var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    itemId : 'app',

    items : [{
        itemId : 'panel',
    	xtype : 'panel',
    	layout : 'column',

    	items : [
    	{
            name: 'intervalType',
            xtype: 'combo',
            store : Ext.create("Ext.data.ArrayStore",{
	            fields: ['interval'],
	            data : [['Today'],['This Week'],['Last Week'],['This Month'],['Last Month']]  	
			}),
            valueField : 'interval',
            displayField : 'interval',
            queryMode : 'local',
            forceSelection : true,
            boxLabelAlign: 'after',
            fieldLabel: 'Interval',
            margin: '5 5 5 5',
            listeners : {
                scope : this,
                select : function(list,item) {
                    var panel = _.first(Ext.ComponentQuery.query("#panel"));
                    var startDateCmp = panel.down('#startDate');
                    var endDateCmp = panel.down('#endDate');
                    var start,end;

                    switch(_.first(item).get('interval')){
                        case 'Today' : 
                            start = moment().startOf('day').toDate();
                            end = moment().endOf('end').toDate();
                            break;
                        case 'This Week':
                            start = moment().startOf('week').toDate();
                            end = moment().endOf('week').toDate();
                            break;
                        case 'Last Week':
                            start = moment().subtract(1,'week').startOf('week').toDate();
                            end = moment().subtract(1,'week').endOf('week').toDate();
                            break;
                        case 'This Month':
                            start = moment().startOf('month').toDate();
                            end = moment().endOf('month').toDate();
                            break;
                        case 'Last Month':
                            start = moment().subtract(1,'month').startOf('month').toDate();
                            end = moment().subtract(1,'month').endOf('month').toDate();
                            break;
                    }
                    startDateCmp.setValue( start );startDateCmp.getValue();
                    endDateCmp.setValue( end ); endDateCmp.getValue();
                    // var app = _.first(Ext.ComponentQuery.query("#app"));
                    app._onSelect();
                }
            }
        },
    	{
            itemId : 'startDate',
            margin: '5 5 5 5',
	        xtype: 'datefield',
	        fieldLabel: 'Start Date',
	        value: new Date()
    	},
    	{
            itemId : 'endDate',
            margin: '5 5 5 5',
	        xtype: 'datefield',
	        fieldLabel: 'End Date',
	        value: new Date()
    	}
    	]
    }],

    launch: function() {

        app = this;

        this._onLoad();
    },

    timeEntryItemColumn : {  
        text: "Time Entry Item", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            if (rowIdx===0)
                console.log(record);
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("WorkProductDisplayString") : "";
       }
    },

    projectColumn : {  
        text: "Project",
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("ProjectDisplayString") : "";
       }
    },

    epicColumn : {  
        text: "Epic",
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("ProjectDisplayString") : "";
       }
    },

    featureColumn : {  
        text: "Feature",
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("ProjectDisplayString") : "";
       }
    },

    taskColumn : {  
        text: "Task", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            if (rowIdx===0)
                console.log(record);
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("TaskDisplayString") : "";
       }
    },

    userColumn : {  
        text: "User", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            if (rowIdx===0)
                console.log(record);
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("User")._refObjectName : "";
       }
    },


	_onLoad: function() {

        var cols = [
            { dataIndex : 'DateVal', text: 'Date'},
            app.projectColumn,
            app.timeEntryItemColumn,
            app.taskColumn,
            app.userColumn,
            'Hours',
            'LastUpdated',
            { dataIndex : 'TimeEntryItem', text: 'TimeEntryItem',hidden:true},
            app.epicColumn,
            app.featureColumn
        ];

	    this.add({
	        xtype: 'rallygrid',
	        columnCfgs: cols,
	        context: this.getContext(),
	        storeConfig: {
	            model: 'TimeEntryValue'
	        },
            listeners:  {
                load : function(rows) {
                    var values = rows.data.items;
                    app.loadTimeEntryItems(values).then( {
                        success: function(items) {
                            console.log("items",items);
                            _.each(values,function(v,i){
                                v.set("TimeEntryItemObject",items[i]);
                            });
                        }
                    });
                }
            }
	    });
    },

    loadTimeEntryItems : function(values) {

        var promises = _.map(values,function(v) {
            var deferred = Ext.create('Deft.Deferred');
            var objectId = v.get("TimeEntryItem");
            console.log(v,"objectId",objectId);
            
            Rally.data.ModelFactory.getModel({
                type: 'TimeEntryItem',
                success: function(model) {
                    console.log("objectId",objectId);
                    model.load(objectId,{
                        fetch : true,
                        callback : function(result,operation) {
                            deferred.resolve(result);
                        }
                    })
                }
            });
            return deferred.promise;
        });
        return Deft.Promise.all(promises);

    },

    _getDateFilter: function() {
        var panel = _.first(Ext.ComponentQuery.query("#panel"));
        var startDateCmp = panel.down('#startDate').getValue();
        var endDateCmp = panel.down('#endDate').getValue();
        var start = Rally.util.DateTime.toIsoString(startDateCmp, false);
        var end   = Rally.util.DateTime.toIsoString(endDateCmp, false);

        return [{
            property: 'DateVal',
            operator: '>=',
            value: start
        },{
            property: 'DateVal',
            operator: '<=',
            value: end
        }];
    },
            
    _onSelect: function() {
        var grid = app.down('rallygrid'),
            store = grid.getStore();

        store.clearFilter(true);
        store.filter(app._getDateFilter());
    },

    _onSelectDate : function(a,b,c) {
        console.log(a,b,c);

    }
});
