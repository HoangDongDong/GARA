using System.Data;
using System.Globalization;
using System.Text.Json;
using FastReport;
#if OPEN_SOURCE_RENDERER
using FastReport.Export.PdfSimple;
#else
using FastReport.Export.Pdf;
#endif

namespace Garage.FastReportDesigner;

/// <summary>
/// Renders an .frx template headlessly using a JSON payload produced by the API:
/// { "parameters": { "NAME": "...", "TONGCONG": 1000 }, "tables": { "Table0": [ {..}, .. ] } }
/// Header values are injected as report parameters (the legacy templates reference them as
/// bare [FIELD] names); detail rows are registered as the "Data" dataset so that the
/// template's TableDataSource ReferenceName="Data.Table0" binds without modification.
/// </summary>
internal static class ReportRenderer
{
    public static int Render(string templatePath, string dataPath, string outputPath)
    {
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(dataPath));
            using var report = new Report();
            report.Load(templatePath);

            var dataSet = new DataSet("Data");
            if (doc.RootElement.TryGetProperty("tables", out var tables))
            {
                foreach (var table in tables.EnumerateObject())
                    dataSet.Tables.Add(BuildTable(table.Name, table.Value, report));
            }
            report.RegisterData(dataSet, "Data");
            foreach (DataTable table in dataSet.Tables)
            {
                var source = report.GetDataSource(table.TableName);
                if (source != null) source.Enabled = true;
            }

            if (doc.RootElement.TryGetProperty("parameters", out var parameters))
            {
                foreach (var prop in parameters.EnumerateObject())
                {
                    var value = ToClr(prop.Value);
                    var parameter = report.Dictionary.Parameters.FindByName(prop.Name);
                    if (parameter == null)
                    {
                        parameter = new FastReport.Data.Parameter(prop.Name);
                        report.Dictionary.Parameters.Add(parameter);
                    }
                    parameter.DataType = value?.GetType() ?? typeof(string);
                    parameter.Value = value ?? string.Empty;
                }
            }

            ApplyPrintVisibility(report);
            if (!report.Prepare()) throw new InvalidOperationException("FastReport không tạo được bản in.");
#if OPEN_SOURCE_RENDERER
            using var export = new PDFSimpleExport { ImageDpi = 300, ShowProgress = false };
#else
            using var export = new PDFExport { EmbeddingFonts = true, ShowProgress = false };
#endif
            report.Export(export, outputPath);
            return 0;
        }
        catch (Exception error)
        {
            File.WriteAllText(outputPath + ".error.txt", error.ToString());
            return 1;
        }
    }

    // FRX owns the layout. A shared boolean parameter controls each optional row.
    // Remove table rows before Prepare: Open Source otherwise retains their height.
    private static void ApplyPrintVisibility(Report report)
    {
        bool Hidden(string expression)
        {
            if (!expression.StartsWith("[PrintShow_", StringComparison.Ordinal) || !expression.EndsWith("]", StringComparison.Ordinal)) return false;
            var name = expression[1..^1];
            var parameter = report.Dictionary.Parameters.FindByName(name);
            return parameter != null && parameter.Value is bool visible && !visible;
        }
        var hidden = report.AllObjects.OfType<ReportComponentBase>().Where(component => Hidden(component.VisibleExpression)).ToList();
        var hiddenRows = report.AllObjects.OfType<FastReport.Table.TableRow>().Where(row => Hidden(row.VisibleExpression)).ToList();

        foreach (var rows in hiddenRows.GroupBy(row => row.Parent).ToList())
        {
            if (rows.Key is not FastReport.Table.TableBase table) continue;
            var height = table.Height;
            var bottom = table.Top + height;
            foreach (var row in rows) { table.Rows.Remove(row); row.Dispose(); }
            CompactBand(table.Parent as BandBase, bottom, height - table.Height);
        }

        foreach (var band in hidden.Where(component => component.Parent is BandBase).GroupBy(component => (BandBase)component.Parent).ToList())
        {
            // Labels and values at the same Top form one absolute-positioned row.
            foreach (var row in band.GroupBy(component => component.Top).OrderByDescending(row => row.Key))
            {
                var height = row.Max(component => component.Height);
                var bottom = row.Key + height;
                foreach (var component in row) component.Dispose();
                CompactBand(band.Key, bottom, height);
            }
        }
    }

    private static void CompactBand(BandBase? band, float bottom, float height)
    {
        if (band == null || height <= 0) return;
        foreach (var component in band.ChildObjects.OfType<ReportComponentBase>())
            if (component.Top >= bottom - 0.1f) component.Top = Math.Max(0, component.Top - height);
        band.Height = Math.Max(0, band.Height - height);
    }

    private static DataTable BuildTable(string name, JsonElement rows, Report report)
    {
        var table = new DataTable(name);
        // Seed columns from the template definition so every column the layout references exists.
        if (report.Dictionary.FindByName(name) is FastReport.Data.DataSourceBase declared)
        {
            foreach (FastReport.Data.Column column in declared.Columns)
                if (!table.Columns.Contains(column.Name)) table.Columns.Add(column.Name, column.DataType ?? typeof(string));
        }
        foreach (var row in rows.EnumerateArray())
        {
            foreach (var prop in row.EnumerateObject())
            {
                if (table.Columns.Contains(prop.Name)) continue;
                table.Columns.Add(prop.Name, prop.Value.ValueKind == JsonValueKind.Number ? typeof(decimal) : typeof(string));
            }
        }
        foreach (var row in rows.EnumerateArray())
        {
            var dataRow = table.NewRow();
            foreach (DataColumn column in table.Columns)
            {
                if (!row.TryGetProperty(column.ColumnName, out var cell) || cell.ValueKind == JsonValueKind.Null)
                {
                    dataRow[column] = column.DataType == typeof(decimal) ? 0m : column.DataType == typeof(string) ? string.Empty : DBNull.Value;
                    continue;
                }
                var value = ToClr(cell);
                dataRow[column] = value == null ? DBNull.Value : Convert.ChangeType(value, column.DataType, CultureInfo.InvariantCulture);
            }
            table.Rows.Add(dataRow);
        }
        return table;
    }

    private static object? ToClr(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Number => value.GetDecimal(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null or JsonValueKind.Undefined => null,
        JsonValueKind.String when value.TryGetDateTime(out var date) && value.GetString()!.Contains('T') => date,
        _ => value.ToString(),
    };
}
