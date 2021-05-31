import React, {forwardRef} from 'react';
import {ClientSideRowModelModule} from '@ag-grid-community/client-side-row-model';
import {AgGridReact} from '@ag-grid-community/react';

import '@ag-grid-community/core/dist/styles/ag-grid.css';
import '@ag-grid-community/core/dist/styles/ag-theme-alpine.css';

const Grid = forwardRef((props, ref) => {
    return (
        <div className="ag-theme-alpine" style={{height: "100vh", width: "100%"}}>
            <AgGridReact ref={ref} {...props} modules={[ClientSideRowModelModule]}></AgGridReact>
        </div>
    );
});

export default Grid;



