import { google, sheets_v4 } from "googleapis";
import { getAuthenticatedGoogleClient } from "./auth";
import {
  parseSpreadsheetMatrices,
  SheetMatrixInput,
  SpreadsheetParseResult,
} from "@/lib/finance/spreadsheet-parser";
import {
  FinancialSummary,
  formatFinanceDateDisplay,
  PillarDivisionItem,
} from "@/lib/finance/calculations";
import { FinancialTransactionWithEvent } from "@/types/database";

export function extractSpreadsheetId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export async function readGoogleSpreadsheetTransactions(
  userId: string,
  urlOrId: string,
  defaultYear = 2026
): Promise<SpreadsheetParseResult & { spreadsheetTitle: string; spreadsheetId: string }> {
  const spreadsheetId = extractSpreadsheetId(urlOrId);
  if (!spreadsheetId) {
    throw new Error(
      "Link ou ID da Planilha Google inválido. Cole a URL completa do Google Planilhas."
    );
  }

  const auth = await getAuthenticatedGoogleClient(userId);
  const sheetsApi = google.sheets({ version: "v4", auth });

  const metaRes = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties.title",
  });

  const spreadsheetTitle = metaRes.data.properties?.title || "Planilha Google";
  const sheetTitles = (metaRes.data.sheets || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  if (sheetTitles.length === 0) {
    return {
      spreadsheetTitle,
      spreadsheetId,
      transactions: [],
      skippedRows: 0,
      sheetsRead: [],
      warnings: ["Nenhuma aba encontrada na planilha."],
    };
  }

  const ranges = sheetTitles.map((title) => `'${title.replace(/'/g, "''")}'`);
  const valuesRes = await sheetsApi.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });

  const valueRanges = valuesRes.data.valueRanges || [];
  const matrices: SheetMatrixInput[] = sheetTitles.map((name, idx) => ({
    name,
    rows: (valueRanges[idx]?.values as unknown[][]) || [],
  }));

  const parsed = parseSpreadsheetMatrices(matrices, defaultYear);
  return {
    spreadsheetTitle,
    spreadsheetId,
    ...parsed,
  };
}

export async function exportFinanceToGoogleSheet(
  userId: string,
  params: {
    title: string;
    periodLabel: string;
    transactions: FinancialTransactionWithEvent[];
    summary: FinancialSummary;
    pillars: PillarDivisionItem[];
  }
): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}> {
  const auth = await getAuthenticatedGoogleClient(userId);
  const sheetsApi = google.sheets({ version: "v4", auth });

  const createRes = await sheetsApi.spreadsheets.create({
    requestBody: {
      properties: {
        title: params.title,
        locale: "pt_BR",
      },
      sheets: [
        { properties: { title: "Fluxo de Caixa", index: 0 } },
        { properties: { title: "Resumo e Pilares", index: 1 } },
      ],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  const spreadsheetUrl =
    createRes.data.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  if (!spreadsheetId) {
    throw new Error("Não foi possível criar a planilha no Google Planilhas.");
  }

  const sheetMap = new Map<string, number>();
  for (const s of createRes.data.sheets || []) {
    if (s.properties?.title && typeof s.properties.sheetId === "number") {
      sheetMap.set(s.properties.title, s.properties.sheetId);
    }
  }

  const sortedTx = [...params.transactions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const cashFlowValues: (string | number)[][] = [
    [
      "Data",
      "Descrição",
      "Trabalho Vinculado",
      "Categoria",
      "Entrada (R$)",
      "Saída (R$)",
      "Status",
    ],
    ...sortedTx.map((tx) => [
      formatFinanceDateDisplay(tx.date),
      tx.description,
      tx.event?.title || "",
      tx.category,
      tx.type === "entrada" ? Number(tx.amount) : 0,
      tx.type === "saida" ? Number(tx.amount) : 0,
      tx.status,
    ]),
  ];

  const lastDataRow = sortedTx.length + 1;
  if (sortedTx.length > 0) {
    cashFlowValues.push([
      "",
      "TOTAL",
      "",
      "",
      `=SUM(E2:E${lastDataRow})`,
      `=SUM(F2:F${lastDataRow})`,
      "",
    ]);
  }

  const summaryValues: (string | number)[][] = [
    [`Resumo Financeiro — ${params.periodLabel}`, "", ""],
    ["Indicador", "Valor (R$)", "Observação"],
    ["Entradas Confirmadas", params.summary.confirmedIncome, "Recebido"],
    ["A Receber (Pendente)", params.summary.pendingIncome, "Pendente"],
    ["Saídas Pagas", params.summary.paidExpenses, "Pago"],
    ["A Pagar (Pendente)", params.summary.pendingExpenses, "Pendente"],
    ["Custo Fixo (Total)", params.summary.totalFixedCosts, `Pago: R$ ${params.summary.paidFixedCosts.toFixed(2)}`],
    ["Custo Variável (Total)", params.summary.totalVariableCosts, `Pago: R$ ${params.summary.paidVariableCosts.toFixed(2)}`],
    ["Saldo Líquido (Lucro)", params.summary.netBalance, `Margem: ${params.summary.netMargin.toFixed(1)}%`],
    ["", "", ""],
    ["Divisão dos Pilares", "Percentual", "Valor (R$)"],
    ...params.pillars.map((p) => [p.name, p.percentage / 100, p.amount]),
  ];

  await sheetsApi.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: "'Fluxo de Caixa'!A1", values: cashFlowValues },
        { range: "'Resumo e Pilares'!A1", values: summaryValues },
      ],
    },
  });

  const cashFlowSheetId = sheetMap.get("Fluxo de Caixa");
  const summarySheetId = sheetMap.get("Resumo e Pilares");
  const formatRequests: sheets_v4.Schema$Request[] = [];

  if (typeof cashFlowSheetId === "number") {
    formatRequests.push(
      {
        repeatCell: {
          range: {
            sheetId: cashFlowSheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.14, green: 0.11, blue: 0.16 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 0.96, green: 0.94, blue: 0.96 },
              },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: cashFlowSheetId,
            startRowIndex: 1,
            endRowIndex: cashFlowValues.length,
            startColumnIndex: 4,
            endColumnIndex: 6,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "CURRENCY", pattern: "R$ #,##0.00" },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      }
    );
  }

  if (typeof summarySheetId === "number") {
    formatRequests.push(
      {
        repeatCell: {
          range: {
            sheetId: summarySheetId,
            startRowIndex: 1,
            endRowIndex: 2,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.14, green: 0.11, blue: 0.16 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 0.96, green: 0.94, blue: 0.96 },
              },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: summarySheetId,
            startRowIndex: 2,
            endRowIndex: 9,
            startColumnIndex: 1,
            endColumnIndex: 2,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "CURRENCY", pattern: "R$ #,##0.00" },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: summarySheetId,
            startRowIndex: 11,
            endRowIndex: 11 + params.pillars.length,
            startColumnIndex: 1,
            endColumnIndex: 2,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "PERCENT", pattern: "0.0%" },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: summarySheetId,
            startRowIndex: 11,
            endRowIndex: 11 + params.pillars.length,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "CURRENCY", pattern: "R$ #,##0.00" },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      }
    );
  }

  if (formatRequests.length > 0) {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: formatRequests },
    });
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: params.title,
  };
}
