'use strict'

import React, {Component} from 'react';
import {render} from 'react-dom';
import {AgGridReact} from '@ag-grid-community/react';
import {AllModules} from '@ag-grid-enterprise/all-modules';
import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-alpine.css';
import MySimpleEditor from './mySimpleEditor.jsx';

class GridExample extends Component {
    constructor(props) {
        super(props);

        this.state = {
            modules: AllModules,
            columnDefs: [
                {
                    field: "first_name",
                    headerName: "First Name",
                    width: 120,
                    editable: true
                },
                {
                    field: "last_name",
                    headerName: "Last Name",
                    width: 120,
                    editable: true
                },
                {
                    field: "gender",
                    width: 100,
                    cellEditor: "mySimpleEditor"
                },
                {
                    field: "age",
                    width: 80,
                    cellEditor: "mySimpleEditor"
                },
                {
                    field: "mood",
                    width: 90,
                    cellEditor: "mySimpleEditor"
                },
                {
                    field: "country",
                    width: 110,
                    cellEditor: "mySimpleEditor"
                },
                {
                    field: "address",
                    width: 502,
                    cellEditor: "mySimpleEditor"
                }
            ],
            defaultColDef: {
                editable: true,
                sortable: true,
                flex: 1,
                minWidth: 100,
                filter: true,
                resizable: true
            },
            rowData: this.createRowData(),
            frameworkComponents: {mySimpleEditor: MySimpleEditor}
        };
    }

    onGridReady = params => {
        this.setState({
            interval: window.setInterval(() => {
                const instances = params.api.getCellEditorInstances();
                if (instances.length > 0) {
                    const instance = instances[0];
                    if (instance.getFrameworkComponentInstance && instance.getFrameworkComponentInstance().myCustomFunction) {
                        const result = instance.getFrameworkComponentInstance().myCustomFunction();
                        console.log(`found editing cell: row index = ${result.rowIndex}, column = ${result.colId}.`);
                    } else {
                        console.log('found editing cell, but method myCustomFunction not found, must be the default editor.');
                    }
                } else {
                    console.log('found not editing cell.');
                }
            }, 1000)
        })
    }

    componentWillUnmount() {
        clearInterval(this.state.interval);
    }

    createRowData() {
        const cloneObject = obj => JSON.parse(JSON.stringify(obj));
        const students = [
            {
                first_name: 'Bob',
                last_name: 'Harrison',
                gender: 'Male',
                address: '1197 Thunder Wagon Common, Cataract, RI, 02987-1016, US, (401) 747-0763',
                mood: 'Happy',
                country: 'Ireland'
            },
            {
                first_name: 'Mary',
                last_name: 'Wilson',
                gender: 'Female',
                age: 11,
                address: '3685 Rocky Glade, Showtucket, NU, X1E-9I0, CA, (867) 371-4215',
                mood: 'Sad',
                country: 'Ireland'
            },
            {
                first_name: 'Sadiq',
                last_name: 'Khan',
                gender: 'Male',
                age: 12,
                address: '3235 High Forest, Glen Campbell, MS, 39035-6845, US, (601) 638-8186',
                mood: 'Happy',
                country: 'Ireland'
            },
            {
                first_name: 'Jerry',
                last_name: 'Mane',
                gender: 'Male',
                age: 12,
                address: '2234 Sleepy Pony Mall , Drain, DC, 20078-4243, US, (202) 948-3634',
                mood: 'Happy',
                country: 'Ireland'
            }
        ];
        students.forEach(item => {
            students.push(cloneObject(item));
        });
        students.forEach(item => {
            students.push(cloneObject(item));
        });
        students.forEach(item => {
            students.push(cloneObject(item));
        });
        return students;
    }

    render() {
        return (
            <div style={{width: '100%', height: '100%'}}>
                <div
                    style={{
                        height: '100%',
                        width: '100%'
                    }}
                    className="ag-theme-alpine">
                    <AgGridReact
                        modules={this.state.modules}
                        columnDefs={this.state.columnDefs}
                        defaultColDef={this.state.defaultColDef}
                        rowData={this.state.rowData}
                        frameworkComponents={this.state.frameworkComponents}
                        onGridReady={this.onGridReady}
                    />
                </div>
            </div>
        );
    }
}

render(
    <GridExample></GridExample>,
    document.querySelector('#root')
)
