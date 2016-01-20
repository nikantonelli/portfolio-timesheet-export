var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    stateful: true,
    id : 'app',
    cache : [],
    items : [
        {
            id : 'panel',
            xtype : 'panel',
            layout : 'column',
            items : [
                {
                    name: 'intervalType',
                    xtype: 'combo',
                    store : Ext.create("Ext.data.ArrayStore",
                                    {
                                        fields: ['interval'],
                                        data : [['Today'],['This Week'],['Last Week'],['This Month'],['Last Month']]
                                    }
                    ),
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
                            var startDateCmp = Ext.getCmp('startDate');
                            var endDateCmp = Ext.getCmp('endDate');
                            var start,end;

                            var dt = new Date();

                            switch(_.first(item).get('interval')){
                                case 'Today' :
                                    start = Ext.Date.clearTime(dt);
                                    end   = Ext.Date.clearTime(Ext.Date.add(start, Ext.Date.MILLI,((24 * 60 * 60 * 1000) - 1)));
                                    break;
                                case 'This Week':
                                    start = Ext.Date.clearTime(Ext.Date.subtract(dt, Ext.Date.DAY, dt.getDay()));   //Sunday AM
                                    end   = Ext.Date.clearTime(Ext.Date.add(start, Ext.Date.MILLI, ((7 * 24 * 60 * 60 * 1000) - 1)));   //Saturday PM
                                    break;
                                case 'Last Week':
                                    start = Ext.Date.clearTime(Ext.Date.subtract(dt, Ext.Date.DAY, 7 + dt.getDay()));   //Sunday AM
                                    end   = Ext.Date.clearTime(Ext.Date.add(start, Ext.Date.MILLI, ((7 * 24 * 60 * 60 * 1000) - 1)));   //Saturday PM
                                    break;
                                case 'This Month':
                                    start = new Date("1/" + dt.getMonth() + 1 + "/" + dt.getFullYear());
                                    end   = Ext.Date.subtract(Ext.Date.add(start, Ext.Date.MONTH,1), Ext.Date.MILLI, 1);
                                    break;
                                case 'Last Month':
                                    start = new Date("1/" + dt.getMonth() + 1 + "/" + dt.getFullYear());
                                    start = Ext.Date.subtract(start, Ext.Date.MONTH, 1);
                                    end   = Ext.Date.subtract(Ext.Date.add(start, Ext.Date.MONTH,1), Ext.Date.MILLI, 1);
                                    break;
                            }

                            startDateCmp.setValue( start );startDateCmp.getValue();
                            endDateCmp.setValue( end ); endDateCmp.getValue();
                            app.createTimeValueStore();
                        }
                     }
                },
                {
                    id : 'startDate',
                    margin: '5 5 5 5',
                    xtype: 'datefield',
                    format: 'd M Y',
                    stateful: true,
                    stateId: 'tsDate1',
                    fieldLabel: 'Start Date',
                    value: new Date(),
                    listeners: {
                        select: function (field,value) {
                            var endDateCmp = Ext.getCmp('endDate');
                            if ( endDateCmp.getValue() < value) {
                                endDateCmp.setValue(value);
                            }
                            app.createTimeValueStore();
                        }
                    }
                },
                {
                    id : 'endDate',
                    margin: '5 5 5 5',
                    xtype: 'datefield',
                    stateful: true,
                    stateId: 'tsDate2',
                    format: 'd M Y',
                    fieldLabel: 'End Date',
                    value: new Date(),
                    listeners : {
                        select : function(field,value) {
                            var startDateCmp = Ext.getCmp('startDate');
                            if ( startDateCmp.getValue() > value) {
                                startDateCmp.setValue(value);
                            }
                            app.createTimeValueStore();
                        }
                     }
                },
                {
                    id : 'exportButton',
                    margin: '5 5 5 5',
                    xtype: 'rallybutton',
                    text : 'Export',
                    handler : function() {
                        var saveDialog = Ext.create('Rally.ui.dialog.Dialog', {
                            autoShow: true,
                            draggable: true,
                            width: 300,
                            title: 'Export all records',
                            items: [
                                {
                                    xtype: 'rallybutton',
                                    text: 'CSV',
                                    handler: function () {
                                        app.exporter.exportCSV(app.grid);
                                        saveDialog.destroy();
                                    }
                                },
                                {
                                    xtype: 'rallybutton',
                                    text: 'SAP XML',
                                    handler: function () {
                                        app.exporter.exportSAPXML(app.grid);
                                        saveDialog.destroy();
                                    }
                                },

                                {
                                    xtype: 'rallybutton',
                                    text: 'Cancel',
                                    handler: function () {
                                        Ext.destroy(saveDialog);
                                    },
                                    flex: 1
                                }
                            ]

                         });
                    }
                     // export
                     // var grid = app.down("#grid");
//                     var link = app.down("#exportLink");
//                     link.update(app.exporter.exportGrid(app.grid));
//                     }
//                     },
//                     {
//                     itemId : "exportLink", margin : "12 0 0 10"

                }
            ]
        }
    ],

    launch: function() {

   app = this;

   this._onLoad();
   },

   _onLoad: function() {

   app._loadAStoreWithAPromise(
                               'TypeDefinition',
                               true,
                               [ { property:"Ordinal", operator:"!=", value:-1} ])
   .then({
         success : function(records) {
         app.piTypes = records;
         console.log("pitypes:",records);
         app.exporter = Ext.create("GridExporter");
         app.createTimeValueStore();
         }
         });
   },

    createTimeValueStore : function() {

        app.showMask("Loading Time Sheet Values");

       // clear the grid
        if (!_.isNull(app.grid)) {
            app.remove(app.grid);
        }

        var nr = null;
        if ((nr = Ext.getCmp('noRecords'))){
            nr.destroy();
        }

        var filter = app._getDateFilter();
        console.log(filter);

        Ext.create('Rally.data.wsapi.Store', {
            model : "TimeEntryValue",
            fetch : true,
            filters : filter,
            limit : 'Infinity'
        }).load({
            callback : function(records, operation, successful) {
                if (records.length===0) {
                    app.hideMask();
                    app.add({html:"No records for this date range",itemId:"norecords", id: "noRecords"});
                }
                app.readRelatedValues(records,
                    function(){
                        app.hideMask();
                        var message = app.down("#norecords");
                        if(!_.isUndefined(message)){
                            app.remove(message);
                        }
                        console.log("records",records);
                        app.createArrayStoreFromRecords(records) ;
                    }
                );
            }
        });
    },

   getFieldValue : function(record, field) {
   // returns the most specific value for a field
   // ie. Task -> Story -> Feature -> Epic
   var hasValue = function(value) {
   return !_.isUndefined(value) && !_.isNull(value) && value !== "";
   };
   if (hasValue(record.get("TaskObject")) && hasValue(record.get("TaskObject").get(field)))
   return record.get("TaskObject").get(field);
   if (hasValue(record.get("StoryObject")) && hasValue(record.get("StoryObject").get(field)))
   return record.get("StoryObject").get(field);
   if (hasValue(record.get("FeatureObject")) && hasValue(record.get("FeatureObject").get(field)))
   return record.get("FeatureObject").get(field);
   if (hasValue(record.get("EpicObject")) && hasValue(record.get("EpicObject").get(field)))
   return record.get("EpicObject").get(field);
   return null;
   },

   createArrayStoreFromRecords : function(records) {

   var fields = [
                 {displayName: 'User', name: 'UserName'},
                 {displayName: 'Task', name: 'TaskDisplayString'},
                 {displayName: 'Project', name: 'ProjectDisplayString'},
                 {displayName: 'Work Product', name: 'WorkProductDisplayString'},
                 {displayName: 'Feature ID', name: 'FeatureID'},
                 {displayName: 'Feature Title', name: 'FeatureName'},
                 {displayName: 'SAP Network', name: 'c_SAPNetwork'},
                 {displayName: 'SAP Operation', name: 'c_SAPOperation'},
                 {displayName: 'SAP Sub Operation', name: 'c_SAPSubOperation'},
                 {displayName: 'Epic ID', name: 'EpicID'},
                 {displayName: 'Epic Title', name: 'EpicName'},
                 {displayName: 'Hours Entered', name: 'Hours'},
                 {displayName: 'Unique ID', name: 'ObjectID'},
                 {displayName: 'Date', name: 'Date'},
                 {displayName: 'Employee ID', name: 'c_KMDEmployeeID'}
                 ];

   // convert records into a json data structure
   var data = _.map(records,function(r){
                    return {
                    "UserName" :               r.get("UserObject").get("UserName"),
                    "TaskDisplayString" :      r.get("TimeEntryItemObject").get("TaskDisplayString"),
                    "ProjectDisplayString" :   r.get("TimeEntryItemObject").get("ProjectDisplayString"),
                    "WorkProductDisplayString":r.get("TimeEntryItemObject").get("WorkProductDisplayString"),
                    "FeatureID" :   r.get("FeatureObject") ? r.get("FeatureObject").get("FormattedID") : null,
                    "FeatureName" : r.get("FeatureObject") ? r.get("FeatureObject").get("Name") : null,
                    'c_SAPNetwork' : app.getFieldValue(r,'c_SAPNetwork'),
                    'c_SAPOperation' : app.getFieldValue(r,'c_SAPOperation'),
                    'c_SAPSubOperation' : app.getFieldValue(r,'c_SAPSubOperation'),
                    'EpicID' : r.get("EpicObject") ? r.get("EpicObject").get("FormattedID") : null,
                    'EpicName' : r.get("EpicObject") ? r.get("EpicObject").get("Name") : null,
                    'Hours' : r.get('Hours'),
                    'ObjectID' : r.get("ObjectID"),
//                    'ObjectID' : r.get("TimeEntryItemObject").get("ObjectID"),
                    'Date' : Ext.Date.format(r.get("DateVal"),"D d M Y"),
                    'c_KMDEmployeeID' : r.get("UserObject").get("c_KMDEmployeeID")
                    };
                    });

   var store = Ext.create('Ext.data.JsonStore', {
                          fields: fields,
                          data : data
                          });

    app.grid = new Ext.grid.GridPanel(
        {
//            frame: true,
            header: false,
            id : 'tsGrid',
            title: 'TimeSheetData',
            features: [{ftype: 'grouping',  showSummaryRow: true, groupHeaderTpl: ' {name} ({children.length} items)'}],
            store: store,
            columns: _.map(fields,function(f){
                if (f.name !== 'Hours') {
                    return {
                        text:f.displayName,
                        dataIndex:f.name
                    };
                }
                else return {
                    text:f.displayName,
                    dataIndex:f.name,
                    summaryType: 'sum',
                    summaryRenderer: function(value, summaryData, dataIndex) {
                        return Ext.String.format('<div style="background-color:#E4EECF">Total: {0}</div>', value);
                    }
                };
            })
        }
    );

    this.add(app.grid);

    },

   readRelatedValues : function(values,callback) {

   // time entry items
   app.readTimeEntryItems(values).then( {
       success: function(items) {
           console.log("items",items);
           app.setValues(values,items,"TimeEntryItemObject");
           // users
           app.readUsers(items).then({
             success: function(users) {
                 console.log("users",users);
                 app.setValues(values,users,"UserObject");
                 // tasks
                 app.readTasks(items).then({
                   success: function(tasks) {
                       console.log("tasks",tasks);
                       app.setValues(values,tasks,"TaskObject");
                       // stories
                       app.readStories(items).then({
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
                                           callback();
                                           }
                                       });
                                      }
                                  });
                               }
                           });
                       }
                   });
                 }
             });
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
                                               });
                                    }
                                    });
   app.cache.push({ref : ref, promise: deferred});
   return deferred.promise;
   }
   },
   
   // passed an array of TimeEntryItems. If the entry is 
   readStories : function(items) {
   
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
   
   // passed an array of TimeEntryItems.
   readTasks : function(items) {
   
   var promises = _.map(items,function(item){
                        var deferred = Ext.create('Deft.Deferred');
                        var taskRef = item.get("Task");
                        if (_.isUndefined(taskRef) || _.isNull(taskRef)) {
                        deferred.resolve(null);
                        }
                        else {
                        app.readObject('Task',taskRef).then({
                                                            success : function(obj) {
                                                            deferred.resolve(obj);
                                                            }    
                                                            });
                        }
                        return deferred.promise;
                        });
   return Deft.Promise.all(promises);
   },
   
   readUsers : function(items) {
   var promises = _.map(items,function(item){
                        var deferred = Ext.create('Deft.Deferred');
                        var userRef = item.get("User");
                        if (_.isUndefined(userRef) || _.isNull(userRef)) {
                        deferred.resolve(null);
                        }
                        else {
                        app.readObject('User',userRef).then({
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
                        var featureType = _.first(app.piTypes).get("TypePath");
                        // app.readObject('PortfolioItem/Feature',featureRef).then({
                        app.readObject(featureType,featureRef).then({   
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
                        var epicType = app.piTypes[1].get("TypePath");
                        //app.readObject('PortfolioItem/Epic',epicRef).then({
                        app.readObject(epicType,epicRef).then({ 
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
   var startDateCmp = Ext.getCmp('startDate').getValue();
   var endDateCmp = Ext.getCmp('endDate').getValue();
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
   var grid = Ext.getCmp('tsGrid'),
   store = grid.getStore();
   
   store.clearFilter(true);
   store.filter(app._getDateFilter());
   },
   
   _onSelectDate : function(a,b,c) {
   console.log(a,b,c);
   },
   
   showMask: function(msg) {
   if ( this.getEl() ) { 
   this.getEl().unmask();
   this.getEl().mask(msg);
   }
   },
   hideMask: function() {
   this.getEl().unmask();
   },
   _loadAStoreWithAPromise: function( model_name, model_fields, filters,ctx,order) {
   
   var deferred = Ext.create('Deft.Deferred');
   var me = this;
   
   var config = {
   model: model_name,
   fetch: model_fields,
   filters: filters,
   limit: 'Infinity'
   };
   if (!_.isUndefined(ctx)&&!_.isNull(ctx)) {
   config.context = ctx;
   }
   if (!_.isUndefined(order)&&!_.isNull(order)) {
   config.order = order;
   }
   
   Ext.create('Rally.data.wsapi.Store', config ).load({
                                                      callback : function(records, operation, successful) {
                                                      if (successful){
                                                      deferred.resolve(records);
                                                      } else {
                                                      deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                                                      }
                                                      }
                                                      });
   return deferred.promise;
   }
});
