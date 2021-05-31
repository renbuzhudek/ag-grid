import React, {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {ClientSideRowModelModule} from "@ag-grid-community/client-side-row-model"
import {AgGridReact} from "./agGridReact"
import {AgGridColumn} from "./agGridColumn"

import '@ag-grid-community/core/dist/styles/ag-grid.css';
import '@ag-grid-community/core/dist/styles/ag-theme-alpine.css';
import {useGridApis} from "./useGridApi";

const App = () => {
    const gridRef = useRef<AgGridReact>(null);
    const [gridApi, columnApi] = useGridApis(gridRef);

    const [rowData, setRowData] = useState([
        {make: "Toyota", model: "Celica", price: 35000},
        {make: "Ford", model: "Mondeo", price: 32000},
        {make: "Porsche", model: "Boxter", price: 72000}
    ]);

    useEffect(() => {
        console.log(gridApi);
        console.log(columnApi);
    }, [gridApi, columnApi])

    return (
        <div className="ag-theme-alpine" style={{height: 400, width: 600}}>
            <AgGridReact
                ref={gridRef}
                rowData={rowData}
                modules={[ClientSideRowModelModule]}>
                <AgGridColumn field="make"></AgGridColumn>
                <AgGridColumn field="model"></AgGridColumn>
                <AgGridColumn field="price"></AgGridColumn>
            </AgGridReact>
        </div>
    );
};

ReactDOM.render(
    <App/>,
    document.getElementById("root")
);
