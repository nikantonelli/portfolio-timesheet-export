var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    itemId : 'app',
    cache : [],
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
    	},
        {
            itemId : 'exportButton',
            margin: '5 5 5 5',
            xtype: 'rallybutton',
            text : 'Export',
            handler : function() {
                // export
                var grid = app.down("#grid");
                // console.log("grid",grid);
                var link = app.down("#exportLink");
                // console.log("link",link);
                link.update(app.exporter.exportGrid(grid));
            }
        },
        {
            itemId : "exportLink", margin : "12 0 0 10"
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
            var item = record.get("EpicObject");
            return item ? item.get("FormattedID") + ":" + item.get("Name") : "";
       }
    },

    featureColumn : {  
        text: "Feature",
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var item = record.get("FeatureObject");
            return item ? item.get("FormattedID") + ":" + item.get("Name") : "";
       }
    },

    taskColumn : {  
        text: "Task", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("TaskDisplayString") : "";
       }
    },

    userColumn : {  
        text: "User", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var item = record.get("TimeEntryItemObject");
            return item ? item.get("User")._refObjectName : "";
       }
    },


	_onLoad: function() {

        app.exporter = Ext.create("GridExporter");

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
            itemId : 'grid',
	        columnCfgs: cols,
	        context: this.getContext(),
	        storeConfig: {
	            model: 'TimeEntryValue'
	        },
            listeners:  {
                load : function(rows) {
                    var values = rows.data.items;
                    // time entry items
                    app.readTimeEntryItems(values).then( {
                        success: function(items) {
                            console.log("items",items);
                            app.setValues(values,items,"TimeEntryItemObject")
                            // stories
                            app.loadStories(items).then({
                                success: function(stories) {
                                    console.log("stories",stories);
                                    app.setValues(values,stories,"StoryObject");
                                    // features
                                    app.readFeatures(stories).then({
                                        success: function(features) {
                                            console.log("features",features);
                                            app.setValues(values,features,"FeatureObject");
                                            // epics
                                            app.readEpics(features).then({
                                                success: function(epics) {
                                                    console.log("epics",epics);
                                                    app.setValues(values,epics,"EpicObject");
                                                }
                                            })
                                        }
                                    })
                                }
                            });
                        }
                    });
                }
            }
	    });
    },

    setValues : function(items, values, attrName) {
        _.each(items,function(item,x){
            item.set(attrName,values[x]);
        });
    },

    // TimesheetEntryItems -> Stories -> Features -> Epics

    readObject : function(model,ref) {

        var deferred = Ext.create('Deft.Deferred');
        var obj = _.find( app.cache, function (cacheObj) {
            if (cacheObj.ref._ref === ref._ref) {
                return cacheObj.promise.promise;
            }
        });

        if (!_.isUndefined(obj)&&!_.isNull(obj)) {
            return obj.promise.promise;
        } else {
            Rally.data.ModelFactory.getModel({
                type : model,
                success: function(model) {
                    model.load(ref,{
                        fetch : true,
                        callback : function(result,operation) {
                            deferred.resolve(result);
                        }
                    })
                }
            })
            app.cache.push({ref : ref, promise: deferred});
            return deferred.promise;
        }
    },

    // passed an array of TimeEntryItems. If the entry is 
    loadStories : function(items) {

        var promises = _.map(items,function(item){
            var deferred = Ext.create('Deft.Deferred');
            var workProductRef = item.get("WorkProduct");
            if (workProductRef===null || workProductRef._type !== "HierarchicalRequirement") {
                deferred.resolve(null);
            }
            else {
                app.readObject('HierarchicalRequirement',workProductRef).then({
                    success : function(obj) {
                        deferred.resolve(obj);
                    }    
                });
            }
            return deferred.promise;
        });
        return Deft.Promise.all(promises);
    },

    readTimeEntryItems : function(values) {
        var promises = _.map(values,function(v) {
            var deferred = Ext.create('Deft.Deferred');
            var ref = v.get("TimeEntryItem");

            app.readObject('TimeEntryItem',ref).then({
                success : function(obj) {
                    deferred.resolve(obj);
                }    
            });
            return deferred.promise;
        });
        return Deft.Promise.all(promises);
    },


    readFeatures : function(stories) {
        var promises = _.map(stories,function(story){
            var deferred = Ext.create('Deft.Deferred');
            if (_.isNull(story) || _.isUndefined(story.get("Feature")) || _.isNull(story.get("Feature"))) {
                deferred.resolve(null);
            } else {
                var featureRef = story.get("Feature");
                app.readObject('PortfolioItem/Feature',featureRef).then({
                    success : function(obj) {
                        deferred.resolve(obj);
                    }    
                });
            }
            return deferred.promise;
        });
        return Deft.Promise.all(promises);
    },

    readEpics : function(features) {
        var promises = _.map(features,function(feature){
            var deferred = Ext.create('Deft.Deferred');
            if (_.isNull(feature) || _.isUndefined(feature.get("Parent")) || _.isNull(feature.get("Parent")) ) {
                deferred.resolve(null);
            } else {
                var epicRef = feature.get("Parent");
                app.readObject('PortfolioItem/Initiative',epicRef).then({
                    success : function(obj) {
                        deferred.resolve(obj);
                    }    
                });
            }
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
    },

    _export: function(){
        var grid = this.down('rallygrid');
        var me = this;

        if ( !grid ) { return; }
        
        this.logger.log('_export',grid);

        var filename = Ext.String.format('user-permissions.csv');

        this.setLoading("Generating CSV");
        Deft.Chain.sequence([
            function() { return Rally.technicalservices.FileUtilities._getCSVFromCustomBackedGrid(grid) } 
        ]).then({
            scope: this,
            success: function(csv){
                if (csv && csv.length > 0){
                    Rally.technicalservices.FileUtilities.saveCSVToFile(csv,filename);
                } else {
                    Rally.ui.notify.Notifier.showWarning({message: 'No data to export'});
                }
                
            }
        }).always(function() { me.setLoading(false); });
    },
});
