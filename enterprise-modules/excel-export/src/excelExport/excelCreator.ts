import {
    _,
    Autowired,
    Bean,
    Column,
    ColumnModel,
    ExcelCell,
    ExcelExportParams,
    ExcelFactoryMode,
    ExcelStyle,
    GridOptions,
    GridOptionsWrapper,
    IExcelCreator,
    PostConstruct,
    RowNode,
    StylingService,
    ValueService,
    ExcelExportMultipleSheetParams,
} from '@ag-grid-community/core';
import { ExcelXmlSerializingSession } from './excelXmlSerializingSession';
import { ExcelXlsxSerializingSession } from './excelXlsxSerializingSession';
import { ExcelXlsxFactory } from './excelXlsxFactory';
import { BaseCreator, Downloader, GridSerializer, RowType, ZipContainer } from "@ag-grid-community/csv-export";
import { ExcelGridSerializingParams } from './baseExcelSerializingSession';
import { ExcelXmlFactory } from './excelXmlFactory';

type SerializingSession = ExcelXlsxSerializingSession | ExcelXmlSerializingSession;

export const getMultipleSheetsAsExcel = (params: ExcelExportMultipleSheetParams): Blob | undefined => {
    const { data, fontSize = 11, author = 'AG Grid' } = params;

    const hasImages = ExcelXlsxFactory.images.size > 0;

    ZipContainer.addFolders([
        '_rels/',
        'docProps/',
        'xl/',
        'xl/theme/',
        'xl/_rels/',
        'xl/worksheets/'
    ]);

    if (hasImages) {
        ZipContainer.addFolders([
            'xl/worksheets/_rels',
            'xl/drawings/',
            'xl/drawings/_rels',
            'xl/media/',

        ]);

        let imgCounter = 0;
        ExcelXlsxFactory.images.forEach(value => {
            const firstImage = value[0].image[0];
            const ext = firstImage.imageType;
            ZipContainer.addFile(`xl/media/image${++imgCounter}.${ext}`, firstImage.base64, true);
        });
    }

    if (!data || data.length === 0) {
        console.warn("AG Grid: Invalid params supplied to getMultipleSheetsAsExcel() - `ExcelExportParams.data` is empty.");
        ExcelXlsxFactory.resetFactory();
        return;
    }

    const sheetLen = data.length;
    let imageRelationCounter = 0;
    data.forEach((value, idx) => {
        ZipContainer.addFile(`xl/worksheets/sheet${idx + 1}.xml`, value);
        if (hasImages && ExcelXlsxFactory.worksheetImages.get(idx)) {
            createImageRelationsForSheet(idx, imageRelationCounter++);
        }
    });

    ZipContainer.addFile('xl/workbook.xml', ExcelXlsxFactory.createWorkbook());
    ZipContainer.addFile('xl/styles.xml', ExcelXlsxFactory.createStylesheet(fontSize));
    ZipContainer.addFile('xl/sharedStrings.xml', ExcelXlsxFactory.createSharedStrings());
    ZipContainer.addFile('xl/theme/theme1.xml', ExcelXlsxFactory.createTheme());
    ZipContainer.addFile('xl/_rels/workbook.xml.rels', ExcelXlsxFactory.createWorkbookRels(sheetLen));
    ZipContainer.addFile('docProps/core.xml', ExcelXlsxFactory.createCore(author));
    ZipContainer.addFile('[Content_Types].xml', ExcelXlsxFactory.createContentTypes(sheetLen));
    ZipContainer.addFile('_rels/.rels', ExcelXlsxFactory.createRels());

    ExcelXlsxFactory.resetFactory();

    return ZipContainer.getContent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export const exportMultipleSheetsAsExcel = (params: ExcelExportMultipleSheetParams) => {
    const { fileName = 'export.xlsx' } = params;
    const contents =  getMultipleSheetsAsExcel(params);
    if (contents) {
        Downloader.download(fileName, contents);
    }
}

const createImageRelationsForSheet = (sheetIndex: number, currentRelationIndex: number) => {
    const drawingFolder = 'xl/drawings';
    const drawingFileName = `${drawingFolder}/drawing${currentRelationIndex + 1}.xml`;
    const relFileName = `${drawingFolder}/_rels/drawing${currentRelationIndex + 1}.xml.rels`;
    const worksheetRelFile = `xl/worksheets/_rels/sheet${sheetIndex + 1}.xml.rels`;

    ZipContainer.addFile(relFileName, ExcelXlsxFactory.createDrawingRel(sheetIndex));
    ZipContainer.addFile(drawingFileName, ExcelXlsxFactory.createDrawing(sheetIndex));
    ZipContainer.addFile(worksheetRelFile, ExcelXlsxFactory.createWorksheetDrawingRel(currentRelationIndex))
}

@Bean('excelCreator')
export class ExcelCreator extends BaseCreator<ExcelCell[][], SerializingSession, ExcelExportParams> implements IExcelCreator {

    @Autowired('columnModel') private columnModel: ColumnModel;
    @Autowired('valueService') private valueService: ValueService;
    @Autowired('gridOptions') private gridOptions: GridOptions;
    @Autowired('stylingService') private stylingService: StylingService;

    @Autowired('gridSerializer') private gridSerializer: GridSerializer;
    @Autowired('gridOptionsWrapper') gridOptionsWrapper: GridOptionsWrapper;

    private exportMode: string = 'xlsx';

    @PostConstruct
    public postConstruct(): void {
        this.setBeans({
            gridSerializer: this.gridSerializer,
            gridOptionsWrapper: this.gridOptionsWrapper
        });
    }

    protected getDefaultExportParams(): ExcelExportParams | undefined {
        return this.gridOptionsWrapper.getDefaultExportParams('excel');
    }

    public export(userParams?: ExcelExportParams): string {
        if (this.isExportSuppressed()) {
            console.warn(`ag-grid: Export cancelled. Export is not allowed as per your configuration.`);
            return '';
        }

        const { mergedParams, data } = this.getMergedParamsAndData(userParams);

        const packageFile = this.packageFile({
            data: [data],
            fontSize: mergedParams.fontSize,
            author: mergedParams.author
        });

        if (packageFile) {
            Downloader.download(this.getFileName(mergedParams.fileName), packageFile);
        }

        return data;
    }

    public exportDataAsExcel(params?: ExcelExportParams): string {
        let exportMode = 'xlsx';

        if (params && params.exportMode) {
            exportMode = params.exportMode;
        }

        this.setExportMode(exportMode);

        return this.export(params);
    }

    public getDataAsExcel(params?: ExcelExportParams): Blob | string | undefined {
        const { mergedParams, data } =  this.getMergedParamsAndData(params);

        if (params && params.exportMode === 'xml') { return data; }

        return this.packageFile({
            data: [data],
            fontSize: mergedParams.fontSize,
            author: mergedParams.author
        });
    }

    public setFactoryMode(factoryMode: ExcelFactoryMode, exportMode: 'xml' | 'xlsx' = 'xlsx'): void {
        const factory = exportMode === 'xlsx' ? ExcelXlsxFactory : ExcelXmlFactory;
        factory.factoryMode = factoryMode;
    }

    public getFactoryMode(exportMode: 'xml' | 'xlsx'): ExcelFactoryMode {
        const factory = exportMode === 'xlsx' ? ExcelXlsxFactory : ExcelXmlFactory;
        return factory.factoryMode;
    }

    public getSheetDataForExcel(params: ExcelExportParams): string {
        return this.getMergedParamsAndData(params).data;
    }

    public getMultipleSheetsAsExcel(params: ExcelExportMultipleSheetParams): Blob | undefined {
        return getMultipleSheetsAsExcel(params);
    }

    public exportMultipleSheetsAsExcel(params: ExcelExportMultipleSheetParams) {
        return exportMultipleSheetsAsExcel(params);
    }

    public getMimeType(): string {
        return this.getExportMode() === 'xml' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    public getDefaultFileName(): string {
        return `export.${this.getExportMode()}`;
    }

    public getDefaultFileExtension(): string {
        return this.getExportMode();
    }

    public createSerializingSession(params: ExcelExportParams): SerializingSession {
        const { columnModel, valueService, gridOptionsWrapper } = this;
        const isXlsx = this.getExportMode() === 'xlsx';

        let sheetName = 'ag-grid';

        if (params.sheetName != null) {
            sheetName = _.utf8_encode(params.sheetName.toString().substr(0, 31));
        }
        const config: ExcelGridSerializingParams = {
            ...params,
            sheetName,
            columnModel,
            valueService,
            gridOptionsWrapper,
            headerRowHeight: params.headerRowHeight || params.rowHeight,
            baseExcelStyles: this.gridOptions.excelStyles || [],
            styleLinker: this.styleLinker.bind(this)
        };

        return new (isXlsx ? ExcelXlsxSerializingSession : ExcelXmlSerializingSession)(config);
    }

    private styleLinker(rowType: RowType, rowIndex: number, value: string, column: Column, node: RowNode): string[] | null {
        if (rowType === RowType.HEADER) { return ["header"]; }
        if (rowType === RowType.HEADER_GROUPING) { return ["header", "headerGroup"]; }

        const styles = this.gridOptions.excelStyles;

        const applicableStyles: string [] = ["cell"];

        if (!styles || !styles.length) { return applicableStyles; }

        const styleIds: string[] = styles.map((it: ExcelStyle) => {
            return it.id;
        });

        this.stylingService.processAllCellClasses(
            column.getColDef(),
            {
                value: value,
                data: node.data,
                node: node,
                colDef: column.getColDef(),
                rowIndex: rowIndex,
                api: this.gridOptionsWrapper.getApi()!,
                columnApi: this.gridOptionsWrapper.getColumnApi()!,
                $scope: null,
                context: this.gridOptionsWrapper.getContext()
            },
            (className: string) => {
                if (styleIds.indexOf(className) > -1) {
                    applicableStyles.push(className);
                }
            }
        );

        return applicableStyles.sort((left: string, right: string): number => {
            return (styleIds.indexOf(left) < styleIds.indexOf(right)) ? -1 : 1;
        });
    }

    public isExportSuppressed():boolean {
        return this.gridOptionsWrapper.isSuppressExcelExport();
    }

    private setExportMode(exportMode: string): void {
        this.exportMode = exportMode;
    }

    private getExportMode(): string {
        return this.exportMode;
    }

    private packageFile(params: ExcelExportMultipleSheetParams): Blob | undefined {
        if (this.getExportMode() === 'xml') {
            return new Blob(["\ufeff", params.data[0]], {
                // @ts-ignore
                type: window.navigator.msSaveOrOpenBlob ? this.getMimeType() : 'octet/stream'
            });
        }

        return getMultipleSheetsAsExcel(params);
    }
}
