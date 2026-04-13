"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ParsedImportRow<T> = {
  rowNumber: number;
  data: T;
  previewData?: Partial<Record<keyof T, string>>;
  errors: string[];
};

type ImportResult = {
  success: boolean;
  importedCount?: number;
  failedCount?: number;
  error?: string;
};

type PreviewColumn<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: ParsedImportRow<T>) => string;
};

interface EntityImportExportActionsProps<T> {
  importLabel: string;
  exportLabel: string;
  exportTemplateLabel: string;
  exportFileName: string;
  templateFileName: string;
  templateHeaders: string[];
  templateSampleRow: string[];
  previewColumns: PreviewColumn<T>[];
  parseRows: (csvContent: string) => ParsedImportRow<T>[];
  onImport: (rows: T[]) => Promise<ImportResult>;
  onExport: () => Promise<Blob>;
  canImport?: boolean;
  canExport?: boolean;
  canExportTemplate?: boolean;
}

export function EntityImportExportActions<T>({
  importLabel,
  exportLabel,
  exportTemplateLabel,
  exportFileName,
  templateFileName,
  templateHeaders,
  templateSampleRow,
  previewColumns,
  parseRows,
  onImport,
  onExport,
  canImport = true,
  canExport = true,
  canExportTemplate = true,
}: EntityImportExportActionsProps<T>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [previewRows, setPreviewRows] = useState<ParsedImportRow<T>[]>([]);

  const validRows = useMemo(
    () => previewRows.filter((row) => row.errors.length === 0),
    [previewRows]
  );
  const invalidRows = useMemo(
    () => previewRows.filter((row) => row.errors.length > 0),
    [previewRows]
  );

  const handleTemplateDownload = () => {
    const csv = `${templateHeaders.join(",")}\n${templateSampleRow.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", templateFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportMutation = useMutation({
    mutationFn: onExport,
    onSuccess: (blob) => {
      if (!blob || blob.size === 0) {
        toast.info("No records found to export.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", exportFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to export data");
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: T[]) => onImport(rows),
    onSuccess: (result, rows) => {
      if (!result.success) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      toast.success(
        result.failedCount && result.failedCount > 0
          ? `Imported ${result.importedCount ?? 0} records. ${result.failedCount} rows failed.`
          : `Imported ${result.importedCount ?? rows.length} records successfully.`
      );
      setIsPreviewOpen(false);
      setPreviewRows([]);
      setSelectedFileName("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Import failed");
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCsv =
      file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv");
    if (!isCsv) {
      toast.error("Please upload a CSV file");
      event.target.value = "";
      return;
    }

    const content = await file.text();
    const rows = parseRows(content);
    if (rows.length === 0) {
      toast.error("No data rows found in file");
      event.target.value = "";
      return;
    }

    setSelectedFileName(file.name);
    setPreviewRows(rows);
    setIsPreviewOpen(true);
    event.target.value = "";
  };

  const handleImport = () => {
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    importMutation.mutate(validRows.map((row) => row.data));
  };

  return (
    <>
      {canImport ? (
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {canImport ? (
          <Button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 px-4 shadow-sm">
            <FileUp className="h-4 w-4" />
            {importLabel}
          </Button>
        ) : null}
        {canExport ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="h-9 px-4 shadow-sm hover:bg-accent/60"
          >
            <Download className="h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : exportLabel}
          </Button>
        ) : null}
        {canExportTemplate ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleTemplateDownload}
            className="h-9 px-4 shadow-sm hover:bg-accent/60"
          >
            <Download className="h-4 w-4" />
            {exportTemplateLabel}
          </Button>
        ) : null}
      </div>

      <Dialog open={canImport ? isPreviewOpen : false} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review rows from <span className="font-medium">{selectedFileName}</span> before import.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Total: {previewRows.length}</Badge>
            <Badge variant="default">Valid: {validRows.length}</Badge>
            <Badge variant={invalidRows.length > 0 ? "destructive" : "secondary"}>
              Invalid: {invalidRows.length}
            </Badge>
          </div>

          <div className="overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2">Row</th>
                  {previewColumns.map((column) => (
                    <th key={String(column.key)} className="text-left px-3 py-2 text-nowrap">
                      {column.label}
                    </th>
                  ))}
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.rowNumber} className="border-t align-top">
                    <td
                      className={`px-3 py-2 font-medium ${row.errors.length > 0 ? "text-destructive bg-destructive/10" : ""}`}
                    >
                      {row.rowNumber - 1}
                    </td>
                    {previewColumns.map((column) => {
                      const value = row.data[column.key];
                      const previewValue = row.previewData?.[column.key];
                      const text = column.render
                        ? column.render(value, row)
                        : previewValue != null
                          ? previewValue || "-"
                        : value == null
                          ? "-"
                          : String(value);
                      return (
                        <td key={`${row.rowNumber}-${String(column.key)}`} className="px-3 py-2 text-nowrap">
                          {text}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-nowrap">
                      <Badge variant={row.errors.length === 0 ? "default" : "destructive"}>
                        {row.errors.length === 0 ? "Valid" : "Invalid"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-destructive min-w-42">
                      {row.errors.length > 0 ? (
                        <ol className="list-decimal pl-4 space-y-1">
                          {row.errors.map((error, index) => (
                            <li key={`${row.rowNumber}-error-${index}`}>{error}</li>
                          ))}
                        </ol>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={importMutation.isPending || validRows.length === 0}
            >
              {importMutation.isPending ? "Importing..." : `Import ${validRows.length} Valid Rows`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
