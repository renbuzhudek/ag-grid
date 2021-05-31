import Vue from 'vue';
import {AgGridVue} from '@ag-grid-community/vue';

import {AllCommunityModules} from '@ag-grid-community/all-modules';

import '@ag-grid-community/core/dist/styles/ag-grid.css';
import '@ag-grid-community/core/dist/styles/ag-theme-alpine.css';

import 'styles.css';


const VueExample = {
    template: /* html */ `
        <div class="top-container">
            <div class="example-toolbar panel panel-default">
                <div class="panel-body">
                    <input type="radio" name="radio" checked ref="eMoveRadio">
                    <label for="move">Remove Source Rows</label>
                    <input type="radio" name="radio" ref="eDeselectRadio">
                    <label for="deselect">Only Deselect Source Rows</label>
                    <input type="radio" name="radio">
                    <label for="none">None</label>
                    <input type="checkbox" checked ref="eSelectCheckbox" @change="checkboxSelectChange()">
                    <label for="toggleCheck">Checkbox Select</label>
                    <span class="input-group-button">
                        <button type="button" class="btn btn-default reset" style="margin-left: 5px;" @click="reset()">
                            <i class="fas fa-redo" style="margin-right: 5px;"></i>Reset
                        </button>
                    </span>
                </div>
            </div>
            <div class="grid-wrapper ag-theme-alpine">
                <div class="panel panel-primary" style="margin-right: 10px;">
                    <div class="panel-heading">Athletes</div>
                    <div class="panel-body">
                        <ag-grid-vue
                            style="height: 100%;"
                            :defaultColDef="defaultColDef"
                            rowSelection="multiple"
                            :enableMultiRowDragging="true"
                            :suppressRowClickSelection="true"
                            :getRowNodeId="getRowNodeId"
                            :rowDragManaged="true"
                            :suppressMoveWhenRowDragging="true"
                            :animateRows="true"
                            :rowData="leftRowData"
                            :columnDefs="leftColumns"
                            @grid-ready="onGridReady($event, 0)"
                            :modules="modules">
                        </ag-grid-vue>
                    </div>
                </div>
                <div class="panel panel-primary" style="margin-left: 10px;">
                    <div class="panel-heading">Selected Athletes</div>
                    <div class="panel-body">
                        <ag-grid-vue
                            style="height: 100%;"
                            :defaultColDef="defaultColDef"
                            :getRowNodeId="getRowNodeId"
                            :rowDragManaged="true"
                            :animateRows="true"
                            :rowData="rightRowData"
                            :columnDefs="rightColumns"
                            @grid-ready="onGridReady($event, 1)"
                            :modules="modules">
                        </ag-grid-vue>
                    </div>
                </div>
            </div>
        </div>`,
    components: {
        'ag-grid-vue': AgGridVue
    },
    data: function () {
        return {
            modules: AllCommunityModules,
            leftRowData: null,
            rightRowData: [],
            leftApi: null,
            leftColumnApi: null,
            rightApi: null,

            defaultColDef: {
                flex: 1,
                minWidth: 100,
                sortable: true,
                filter: true,
                resizable: true
            },
            leftColumns: [
                {
                    rowDrag: true,
                    maxWidth: 50,
                    suppressMenu: true,
                    rowDragText: function(params, dragItemCount) {
                        if (dragItemCount > 1) {
                            return dragItemCount + ' athletes';
                        }
                        return params.rowNode.data.athlete;
                    },
                },
                {
                    colId: 'checkbox',
                    maxWidth: 50,
                    checkboxSelection: true,
                    suppressMenu: true,
                    headerCheckboxSelection: true
                },
                { field: "athlete" },
                { field: "sport" }
            ],
            rightColumns: [
                {
                    rowDrag: true,
                    maxWidth: 50,
                    suppressMenu: true,
                    rowDragText: function(params, dragItemCount) {
                        if (dragItemCount > 1) {
                            return dragItemCount + ' athletes';
                        }
                        return params.rowNode.data.athlete;
                    },
                },
                { field: "athlete" },
                { field: "sport" },
                {
                    suppressMenu: true,
                    maxWidth: 50,
                    cellRenderer: (params) => {
                        var button = document.createElement('i');
            
                        button.addEventListener('click', function() {
                            params.api.applyTransaction({ remove: [params.node.data] });
                        });
            
                        button.classList.add('far', 'fa-trash-alt');
                        button.style.cursor = 'pointer';
            
                        return button;
                    }
                }
            ]
        };
    },
    beforeMount() {
        fetch('https://www.ag-grid.com/example-assets/olympic-winners.json')
            .then(resp => resp.json())
            .then(data => {
                const athletes = [];
                let i = 0;
    
                while (athletes.length < 20 && i < data.length) {
                    var pos = i++;
                    if (athletes.some(rec => rec.athlete === data[pos].athlete)) { continue; }
                    athletes.push(data[pos]);
                }
                this.rawData = athletes;
                this.loadGrids();
            });
    },
    methods: {
        getRowNodeId(data) {
            return data.athlete;
        },

        loadGrids() {
            this.leftRowData = [...this.rawData];
            this.rightRowData = [];
        },

        reset() {
            this.$refs.eMoveRadio.checked = true;

            if (!this.$refs.eSelectCheckbox.checked) {
                this.$refs.eSelectCheckbox.click();
            }

            this.loadGrids();
        },

        checkboxSelectChange() {
            const checked = this.$refs.eSelectCheckbox.checked;
            this.leftColumnApi.setColumnVisible('checkbox', checked);
            this.leftApi.setSuppressRowClickSelection(checked);
        },

        onGridReady(params, side) {
            if (side === 0) {
                this.leftApi = params.api
                this.leftColumnApi = params.columnApi;
            }
    
            if (side === 1) {
                this.rightApi = params.api;
                this.addGridDropZone();
            }
        },

        addGridDropZone() {
            const dropZoneParams = this.rightApi.getRowDropZoneParams({
                onDragStop: params => {
                    var deselectCheck = this.$refs.eDeselectRadio.checked;
                    var moveCheck = this.$refs.eMoveRadio.checked;
                    var nodes = params.nodes;
        
                    if (moveCheck) {
                        this.leftApi.applyTransaction({
                            remove: nodes.map(function(node) { return node.data; })
                        });
                    } else if (deselectCheck) {
                        nodes.forEach(function(node) {
                            node.setSelected(false);
                        });
                    }
                }
            });
        
            this.leftApi.addRowDropZone(dropZoneParams);
        }
    }
};

new Vue({
    el: '#app',
    components: {
        'my-component': VueExample
    }
});