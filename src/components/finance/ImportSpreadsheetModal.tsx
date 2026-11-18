"use client";

import { useState, useRef } from "react";
import {
  X,
  FileSpreadsheet,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  parseCaixaSpreadsheet,
  ParsedSpreadsheetTransaction,
} from "@/lib/finance/spreadsheet-parser";
import { formatFinanceDateDisplay } from "@/lib/finance/calculations";
import { bulkImportTransactionsAction } from "@/actions/finance";
import { FinancialTransactionWithEvent } from "@/types/database";
import { formatBRL } from "@/lib/utils";

interface ImportSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (imported: FinancialTransactionWithEvent[]) => void;
}

export function ImportSpreadsheetModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportSpreadsheetModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [defaultYear, setDefaultYear] = useState<number>(2026);
  const [fileName, setFileName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedSpreadsheetTransaction[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sheetsRead, setSheetsRead] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setError(null);
    setIsParsing(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseCaixaSpreadsheet(buffer, defaultYear);
      setParsedRows(result.transactions);
      setWarnings(result.warnings);
      setSheetsRead(result.sheetsRead);

      if (result.transactions.length === 0) {
        setError(
          "Não foi possível localizar lançamentos válidos nessa planilha. Verifique se há colunas de Data, Descrição e Entrada/Saída."
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? `Erro ao ler planilha: ${err.message}`
          : "Erro ao processar arquivo .xlsx."
      );
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveRow = (idx: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await bulkImportTransactionsAction(
        parsedRows.map((row) => ({
          date: row.date,
          description: row.description,
          type: row.type,
          category: row.category,
          amount: row.amount,
          status: row.status,
        }))
      );

      if (res.error) throw new Error(res.error);
      onSuccess?.(res.data || []);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao importar lançamentos.");
    } finally {
      setIsImporting(false);
    }
  };

  const totalIn = parsedRows
    .filter((r) => r.type === "entrada")
    .reduce((acc, r) => acc + r.amount, 0);
  const totalOut = parsedRows
    .filter((r) => r.type === "saida")
    .reduce((acc, r) => acc + r.amount, 0);
  const pendingCount = parsedRows.filter((r) => r.status === "Pendente").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3 shrink-0">
          <h3 className="text-sm font-semibold text-[#f4eff5] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#9fc193]" />
            Importar Planilha de Caixa (.xlsx)
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Ano padrão de referência + Dropzone */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#33293c] bg-[#120e15] p-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-[#f4eff5]">
                Compatível com <span className="text-[#bba0c1]">caixa EA REC.xlsx</span>
              </p>
              <p className="text-[11px] text-[#968a9c]">
                Ignora cabeçalhos repetidos, linhas de TOTAL e converte &quot;-&quot; em Pendente automaticamente.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-[#968a9c]">Ano base:</span>
              <select
                value={defaultYear}
                onChange={(e) => setDefaultYear(Number(e.target.value))}
                className="rounded-lg border border-[#33293c] bg-[#1a151f] px-2.5 py-1 text-xs text-[#f4eff5]"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#9873a1] bg-[#231c29]/60"
                : "border-[#33293c] bg-[#120e15]/70 hover:border-[#9873a1]/60 hover:bg-[#120e15]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {isParsing ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="w-6 h-6 text-[#9873a1] animate-spin" />
                <p className="text-xs text-[#bba0c1]">Lendo planilhas...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[#bba0c1]">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-[#f4eff5]">
                  {fileName ? `Arquivo: ${fileName}` : "Clique ou arraste sua planilha (.xlsx) aqui"}
                </p>
                <p className="text-[11px] text-[#6e6375]">
                  Processamento 100% local antes de salvar no seu banco
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-[#261514] p-3 text-xs text-[#e06b63] border border-[#4a2420] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl bg-[#211a14] p-3 text-[11px] text-[#ffb066] border border-[#ff9e3b]/30 space-y-1">
              <p className="font-semibold">Avisos durante a leitura ({warnings.length}):</p>
              <ul className="list-disc pl-4 space-y-0.5 max-h-20 overflow-y-auto">
                {warnings.slice(0, 5).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* Resumo da pré-visualização */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-[#33293c] bg-[#120e15] p-2.5">
                  <span className="text-[10px] text-[#968a9c] uppercase">Lançamentos</span>
                  <p className="text-sm font-bold text-[#f4eff5] tabular-nums">
                    {parsedRows.length}
                  </p>
                </div>
                <div className="rounded-xl border border-[#273829] bg-[#162017]/50 p-2.5">
                  <span className="text-[10px] text-[#9fc193] uppercase">Total Entradas</span>
                  <p className="text-sm font-bold text-[#9fc193] tabular-nums">
                    {formatBRL(totalIn)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#4a2420] bg-[#261514]/50 p-2.5">
                  <span className="text-[10px] text-[#e06b63] uppercase">Total Saídas</span>
                  <p className="text-sm font-bold text-[#e06b63] tabular-nums">
                    {formatBRL(totalOut)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#ff9e3b]/30 bg-[#211a14]/60 p-2.5">
                  <span className="text-[10px] text-[#ffb066] uppercase">Pendentes</span>
                  <p className="text-sm font-bold text-[#ffb066] tabular-nums">
                    {pendingCount}
                  </p>
                </div>
              </div>

              {sheetsRead.length > 0 && (
                <p className="text-[11px] text-[#968a9c]">
                  Abas lidas: <span className="text-[#bba0c1]">{sheetsRead.join(", ")}</span>
                </p>
              )}

              {/* Pré-visualização da tabela */}
              <div className="rounded-xl border border-[#33293c] bg-[#120e15] overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-[#1a151f] border-b border-[#33293c] text-[#968a9c] uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Data</th>
                        <th className="py-2 px-3">Descrição</th>
                        <th className="py-2 px-3">Categoria</th>
                        <th className="py-2 px-3 text-right">Valor</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#33293c]/50">
                      {parsedRows.map((row, idx) => (
                        <tr key={`${row.sourceSheet}-${row.sourceRow}-${idx}`} className="hover:bg-[#1a151f]/60">
                          <td className="py-2 px-3 tabular-nums text-[#968a9c] whitespace-nowrap">
                            {formatFinanceDateDisplay(row.date)}
                          </td>
                          <td className="py-2 px-3 text-[#f4eff5] max-w-[200px] truncate">
                            {row.description}
                          </td>
                          <td className="py-2 px-3 text-[#bba0c1] whitespace-nowrap">
                            {row.category}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                              row.type === "entrada" ? "text-[#9fc193]" : "text-[#e06b63]"
                            }`}
                          >
                            {row.type === "entrada" ? "+" : "-"} {formatBRL(row.amount)}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                row.status === "Pendente"
                                  ? "bg-[#211a14] text-[#ffb066] border-[#ff9e3b]/30"
                                  : row.status === "Recebido"
                                  ? "bg-[#162017] text-[#9fc193] border-[#273829]"
                                  : "bg-[#231c29] text-[#bba0c1] border-[#33293c]"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 rounded text-[#6e6375] hover:text-[#e06b63] transition-colors"
                              title="Remover linha desta importação"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#33293c] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isImporting || parsedRows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Importar {parsedRows.length} Lançamentos</span>
          </button>
        </div>
      </div>
    </div>
  );
}
