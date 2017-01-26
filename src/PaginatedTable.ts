//TODO: sorting, scrollbar, formatting

module powerbi.extensibility.visual {
    /**
     * Interface for PaginatedTables viewmodel.
     *
     * @interface
     * @property {PaginatedTableDataPoint[]} dataPoints - Set of data points the visual will render.
     * @property {number} dataMax                 - Maximum data value in the set of data points.
     */
    interface PaginatedTableViewModel {
        columns: PaginatedTableColumn[];
        rows: PaginatedTableRow[];
        settings: PaginatedTableSettings;
        navigationitems: PaginatedTableNavigationItems[];
    };

    interface PaginatedTableColumn {
        header: string;
    //    selectionId: ISelectionId;
    };

    interface PaginatedTableNavigationItems {
        svg: string;
        selectionId: ISelectionId;
    };

    interface PaginatedTableRow {
        cells: DataViewTableRow;
  //      selectionId: ISelectionId;
    };
    /**
     * Interface for PaginatedTable settings.
     *
     * @interface
     * @property {{show:boolean}} enableAxis - Object property that allows axis to be enabled.
     */
    interface PaginatedTableSettings {
        pageSize: {
            pagesize: number;
        };
        default: {
            textsize: number;
        };
        startingRow: number;
    }

    /**
     * Function that converts queried data into a view model that will be used by the visual.
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     * @param {IVisualHost} host            - Contains references to the host which contains services
     */
    function visualTransform(options: VisualUpdateOptions, host: IVisualHost): PaginatedTableViewModel {
        let dataViews = options.dataViews;
        let defaultSettings: PaginatedTableSettings = {
            pageSize:
            {
                pagesize:20
            },
            default:
            {
                textsize:8
            },
            startingRow:0
        };
        let viewModel: PaginatedTableViewModel = {
            columns: [],
            rows:[],
            settings: <PaginatedTableSettings>{},
            navigationitems: []
        };

        if (!dataViews
            || !dataViews[0]
            || !dataViews[0].table
            || !dataViews[0].table.rows
            || !dataViews[0].table.columns
            )
            return viewModel;

        let table = dataViews[0].table;
        let columns = table.columns;
        let data = table.rows;

        let PaginatedTableRows: PaginatedTableRow[] = [];
        let PaginatedTableColumns: PaginatedTableColumn[] = [];
        let PaginatedTableNavigationItems: PaginatedTableNavigationItems[] = [];

        let colorPalette: IColorPalette = host.colorPalette;
        let objects = dataViews[0].metadata.objects;
        let PaginatedTableSettings: PaginatedTableSettings = {
            pageSize: {
                pagesize: getValue<number>(objects, 'pagesize', 'numberofrows', defaultSettings.pageSize.pagesize),
            },
            default: {
                textsize: getValue<number>(objects,'general','textsize',defaultSettings.default.textsize),
            },
            startingRow: 0
        }

        /*for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
            let defaultColor: Fill = {
                solid: {
                    color: colorPalette.getColor(category.values[i] + '').value
                }
            }
        
            /*PaginatedTableRows.push({
                title: title.values[i]+'',
                //category: category.values[i] + '',
                //value: dataValue.values[i],
                //color: getCategoricalObjectValue<Fill>(category, i, 'colorSelector', 'fill', defaultColor).solid.color,
                selectionId: host.createSelectionIdBuilder()
                    .withCategory(category, i)
                    .createSelectionId()
            });*/

        //push the columns
        for (let i = 0; i < columns.length; i++) {
            PaginatedTableColumns.push({
                header: columns[i].displayName
            });
        }
        //push the rows
        for (let i = 0; i < data.length; i++) {
            PaginatedTableRows.push({
                cells: data[i]
            });
        }
        //push the navigationitems
        PaginatedTableNavigationItems.push({
            svg: '<svg width="15px" height="20px" viewBox="0 0 50 80" xml:space="preserve"><polyline class="paginatedTableNavigationButtonArrow" points= "45.63,75.8 0.375, 38.087 45.63, 0.375 "/>< /svg>',
            selectionId:'PREV'
        });
        PaginatedTableNavigationItems.push({
            svg: '<svg width="15px" height="20px" viewBox="0 0 50 80" xml:space="preserve"><polyline class="paginatedTableNavigationButtonArrow" points= "0.375,0.375 45.63, 38.087 0.375, 75.8 "/></svg>',
            selectionId: 'NEXT'
        });

        return {
            columns:PaginatedTableColumns,
            rows: PaginatedTableRows,
            settings: PaginatedTableSettings,
            navigationitems: PaginatedTableNavigationItems
        };
    }

    export class PaginatedTable implements IVisual {
        private svg: d3.Selection<SVGElement>;
        private host: IVisualHost;
        private selectionManager: ISelectionManager;
        private PaginatedTableContainer: d3.Selection<SVGElement>;
        private paginatedTableContainer: d3.Selection<SVGElement>;
        private xAxis: d3.Selection<SVGElement>;
        private header: d3.Selection<SVGElement>;
        private columns: PaginatedTableColumn[];
        private rows: PaginatedTableRow[];
        private navigationItems: PaginatedTableNavigationItems[];
        private PaginatedTableSettings: PaginatedTableSettings;
        //private tooltipServiceWrapper: ITooltipServiceWrapper;

        static Config = {
            xScalePadding: 0.1,
            solidOpacity: 1,
            transparentOpacity: 0.5,
            margins: {
                top: 0,
                right: 0,
                bottom: 25,
                left: 30,
            },
            xAxisFontMultiplier: 0.04,
        };

        /**
         * Creates instance of PaginatedTable. This method is only called once.
         *
         * @constructor
         * @param {VisualConstructorOptions} options - Contains references to the element that will
         *                                             contain the visual and a reference to the host
         *                                             which contains services.
         */
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            //this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
            let svg = this.svg = d3.select(options.element)
                .append('div')
                .classed('paginatedTableVisual', true);

            this.paginatedTableContainer = svg.append('div')
                .classed('paginatedTableContainer', true);
            
        }

        /**
         * Updates the state of the visual. Every sequential databinding and resize will call update.
         *
         * @function
         * @param {VisualUpdateOptions} options - Contains references to the size of the container
         *                                        and the dataView which contains all the data
         *                                        the visual had queried.
         */
        public update(options: VisualUpdateOptions, startingrow=0) {
            let viewModel: PaginatedTableViewModel = visualTransform(options, this.host);
            let settings = this.PaginatedTableSettings = viewModel.settings;
            this.columns = viewModel.columns;
            this.rows = viewModel.rows;
            this.navigationItems = viewModel.navigationitems;
            let pageSize = settings.pageSize.pagesize;
            
            //somehow need to store starting row
            console.log("startingrow (begin of update): " + startingrow);
            console.log("pagesize (begin of update): " + pageSize);
            let stoppingrow = startingrow + pageSize;
            let width = options.viewport.width;
            let height = options.viewport.height;

            this.svg.attr({
                width: width,
                height: height
            });
            this.paginatedTableContainer.attr({
                width: width,
                height: height
            });

            this.paginatedTableContainer.selectAll("*").remove();
            let table = this.paginatedTableContainer.append('table')
            table.attr('class', 'paginatedTable');
            table.attr('style', 'font-size: ' + settings.default.textsize + 'px;');
            table.attr('height', height - 30);
            table.attr('width', width);
            let thead = table.append('thead');
            thead.attr('class', 'paginatedTableHeader');
            let tbody = table.append('tbody');
            tbody.attr('class', 'paginatedTableBody');
            
            //create the header
            thead
                .selectAll('th')
                .data(this.columns).enter()
                .append('th')
                .attr('class','paginatedTableHeaderCell')
                .text(function (row) { return row.header; })
                .append('i')
                .attr('class', 'tablixSortIconContainer future powervisuals-glyph caret-up')

                //.attr('class', function (r) { return r.cl; })

            tbody
                .selectAll('tr')
                .data(this.rows.slice(startingrow,stoppingrow)).enter()
                .append('tr')
                .attr('class','paginatedTableRow')
                .html(function (row) {
                    let cells = row.cells;
                    let html = "<tr class='paginatedTableRow'>";
                    for (let i = 0; i < cells.length; i++) {
                        html += "<td class='paginatedTableCell'>";
                        html += cells[i];
                        html += "</td>";
                    }
                    html += "</tr>";
                    return html;
                });

            //add the pagination
            let navigation = this.paginatedTableContainer.append('div')
            navigation.attr('width', width);
            navigation.attr('class', 'paginatedTableNavigation');
            let selectionManager = this.selectionManager;
            let myObject = this;
            navigation
                .selectAll('button')
                .data(this.navigationItems).enter()
                .append('button')
                .attr('class', 'paginatedTableNavigationButton')
                .html(function (d) {
                    return d.svg;
                })
                .on('click', function (d) {
                    let newstartingRow = 0;
                    if (d.selectionId == "PREV") {
                        newstartingRow = Math.max(0,startingrow - pageSize);
                    }
                    if(d.selectionId == "NEXT") {
                        newstartingRow = startingrow + pageSize;
                    }
                    console.log("newstartingRow: " + newstartingRow);
                    (<Event>d3.event).stopPropagation();
                    //force update
                    myObject.update(options, newstartingRow);
                    
                });
            
            /*navigation.html('LEFT PAGE RIGHT');
            navigation.on('click', function (d) {
                selectionManager.select(d.selectionId).then((
            });
            */

            

            /*rows.attr({
                width: xScale.rangeBand(),
                height: d => height - yScale(<number>d.value),
                y: d => yScale(<number>d.value),
                x: d => xScale(d.category),
                fill: d => d.color,
                'fill-opacity': viewModel.settings.generalView.opacity / 100
            });*/

            /*this.tooltipServiceWrapper.addTooltip(this.paginatedTableContainer.selectAll('.row'), 
                (tooltipEvent: TooltipEventArgs<number>) => PaginatedTable.getTooltipData(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<number>) => null);

            let selectionManager = this.selectionManager;
            */
            //This must be an anonymous function instead of a lambda because
            //d3 uses 'this' as the reference to the element that was clicked.
            /*rows.on('click', function(d) {
                selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                    rows.attr({
                        'fill-opacity': ids.length > 0 ? PaginatedTable.Config.transparentOpacity : PaginatedTable.Config.solidOpacity
                    });

                    d3.select(this).attr({
                        'fill-opacity': PaginatedTable.Config.solidOpacity
                    });
                });

                (<Event>d3.event).stopPropagation();
            });
            */
            /*
            rows.exit()
               .remove();
            */
        }

        /**
         * Enumerates through the objects defined in the capabilities and adds the properties to the format pane
         *
         * @function
         * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];
            switch(objectName) {
                case 'pagesize': 
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            numberofrows: this.PaginatedTableSettings.pageSize.pagesize,
                        },
                        validValues: {
                            numberofrows: {
                                numberRange: {
                                    min: 1,
                                    max: 500
                                }
                            }
                        },
                        selector: null
                    });
                    break;
                case 'general':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            textsize: this.PaginatedTableSettings.default.textsize,
                        },
                        validValues: {
                            textsize: {
                                numberRange: {
                                    min:8,
                                    max:40
                                    }
                            }
                        },
                        selector:null
                    });
                    break;
            };

            return objectEnumeration;
        }

        /**
         * Destroy runs when the visual is removed. Any cleanup that the visual needs to
         * do should be done here.
         *
         * @function
         */
        public destroy(): void {
            //Perform any cleanup tasks here
        }

        private static getTooltipData(value: any): VisualTooltipDataItem[] {
            return [{
                displayName: value.category,
                value: value.value.toString(),
                color: value.color
            }];
        }
    }
}
