import { ExcelOOXMLTemplate } from '@ag-grid-community/core';
import { NumberFormat } from '../../../assets/excelInterfaces';
import numberFormatFactory from './numberFormat';

const numberFormatsFactory: ExcelOOXMLTemplate = {
    getTemplate(numberFormats: NumberFormat[]) {
        return {
            name: "numFmts",
            properties: {
                rawMap: {
                    count: numberFormats.length
                }
            },
            children: numberFormats.map(numberFormatFactory.getTemplate)
        };
    }
};

export default numberFormatsFactory;
