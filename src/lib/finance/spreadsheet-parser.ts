import * as XLSX from "xlsx";
import {
  FinancialCategory,
  FinancialStatus,
  FinancialTransactionType,
} from "@/types/database";

export interface ParsedSpreadsheetTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  type: FinancialTransactionType;
  category: FinancialCategory;
  amount: number;
  status: FinancialStatus;
  sourceSheet: string;
  sourceRow: number;
}

export interface SpreadsheetParseResult {
  transactions: ParsedSpreadsheetTransaction[];
  skippedRows: number;
  sheetsRead: string[];
  warnings: string[];
}

interface ColumnMap {
  dateIdx: number;
  descIdx: number;
  catIdx: number;
  typeIdx: number;
  inIdx: number;
  outIdx: number;
  amountIdx: number;
  statusIdx: number;
}

const MONTH_KEYWORDS: Record<string, number> = {
  janeiro: 1,
  jan: 1,
  fevereiro: 2,
  fev: 2,
  marco: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  junho: 6,
  jun: 6,
  julho: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setembro: 9,
  set: 9,
  outubro: 10,
  out: 10,
  novembro: 11,
  nov: 11,
  dezembro: 12,
  dez: 12,
};

const IGNORED_DESCRIPTION_PATTERNS = [
  /^total\b/i,
  /^sub\s*total\b/i,
  /^saldo\b/i,
  /^lucro\b/i,
  /^margem\b/i,
  /^resumo\b/i,
  /^divis[aã]o\b/i,
  /^reserva de emerg[eê]ncia/i,
  /^investimento$/i,
  /^pr[oó][\s-]*labore/i,
  /^entradas\s*(totais|confirmadas)?$/i,
  /^sa[ií]das\s*(totais|pagas)?$/i,
  /^a receber$/i,
  /^a pagar$/i,
  /^caixa\b/i,
  /^fluxo de caixa\b/i,
  /^data$/i,
  /^descri[cç][aã]o$/i,
];

function stripAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeHeaderCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  return stripAccents(String(val)).toLowerCase().replace(/\s+/g, " ");
}

function detectMonthAndYearHint(text: string): { month?: number; year?: number } {
  const clean = stripAccents(text).toLowerCase();
  let foundMonth: number | undefined;
  let foundYear: number | undefined;

  const yearMatch = clean.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    foundYear = Number(yearMatch[1]);
  }

  const tokens = clean.split(/[\s\-_/|,]+/);
  for (const token of tokens) {
    if (MONTH_KEYWORDS[token]) {
      foundMonth = MONTH_KEYWORDS[token];
      break;
    }
  }

  return { month: foundMonth, year: foundYear };
}

function isHeaderRow(row: unknown[]): ColumnMap | null {
  let dateIdx = -1;
  let descIdx = -1;
  let catIdx = -1;
  let typeIdx = -1;
  let inIdx = -1;
  let outIdx = -1;
  let amountIdx = -1;
  let statusIdx = -1;

  row.forEach((cell, idx) => {
    const h = normalizeHeaderCell(cell);
    if (!h) return;

    if (dateIdx === -1 && /^(data|dia|dt)\b/.test(h)) {
      dateIdx = idx;
    } else if (
      descIdx === -1 &&
      /(descri|historico|lancamento|servico|cliente|titulo|item|nome)/.test(h)
    ) {
      descIdx = idx;
    } else if (catIdx === -1 && /(categ|classif|grupo)/.test(h)) {
      catIdx = idx;
    } else if (typeIdx === -1 && /^tipo\b/.test(h)) {
      typeIdx = idx;
    } else if (inIdx === -1 && /(entrada|receita|credito|recebimento)/.test(h)) {
      inIdx = idx;
    } else if (outIdx === -1 && /(saida|despesa|debito|custo|gasto|pagamento)/.test(h)) {
      outIdx = idx;
    } else if (amountIdx === -1 && /^(valor|quantia|montante)/.test(h)) {
      amountIdx = idx;
    } else if (statusIdx === -1 && /(status|situacao|estado)/.test(h)) {
      statusIdx = idx;
    }
  });

  const hasDescription = descIdx !== -1;
  const hasMoneyCol = inIdx !== -1 || outIdx !== -1 || amountIdx !== -1;

  if (hasDescription && hasMoneyCol) {
    return {
      dateIdx,
      descIdx,
      catIdx,
      typeIdx,
      inIdx,
      outIdx,
      amountIdx,
      statusIdx,
    };
  }

  return null;
}

function parseExcelMoney(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : 0;
  }

  let str = String(val).trim();
  if (!str || str === "-" || str === "–" || str === "—") return 0;

  const isNegative = str.startsWith("-") || (str.startsWith("(") && str.endsWith(")"));
  str = str.replace(/[R$\s()]/g, "");

  if (str.includes(",") && str.includes(".")) {
    // Formato PT-BR: 1.500,00 -> remove pontos de milhar e troca vírgula por ponto
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato EN: 1,500.00
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }

  str = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

function parseExcelDate(
  val: unknown,
  fallbackMonth: number,
  fallbackYear: number
): string | null {
  if (val === null || val === undefined || val === "") return null;

  // Serial numérico do Excel (ex: 46032)
  if (typeof val === "number" && val > 20000 && val < 90000) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getUTCFullYear();
    const m = val.getUTCMonth() + 1;
    const d = val.getUTCDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const str = String(val).trim();
  if (!str) return null;

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // DD/MM/YYYY ou DD-MM-YYYY ou DD/MM/YY
  const brFullMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brFullMatch) {
    const day = Number(brFullMatch[1]);
    const month = Number(brFullMatch[2]);
    let year = Number(brFullMatch[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // DD/MM (sem ano -> usa fallbackYear)
  const brShortMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (brShortMatch) {
    const day = Number(brShortMatch[1]);
    const month = Number(brShortMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${fallbackYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Apenas o dia numérico (ex: 15) dentro de uma seção mensal
  if (/^\d{1,2}$/.test(str)) {
    const day = Number(str);
    if (day >= 1 && day <= 31) {
      return `${fallbackYear}-${String(fallbackMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

function normalizeCategory(
  rawCat: unknown,
  type: FinancialTransactionType
): FinancialCategory {
  const clean = normalizeHeaderCell(rawCat);

  if (clean.includes("fixo")) return "Custo Fixo";
  if (clean.includes("variav") || clean.includes("var")) return "Custo Variável";
  if (clean.includes("receita") || clean.includes("entrada") || clean.includes("cach")) {
    return "Receita";
  }

  return type === "entrada" ? "Receita" : "Custo Variável";
}

function normalizeStatus(
  rawStatus: unknown,
  type: FinancialTransactionType
): FinancialStatus {
  if (rawStatus === null || rawStatus === undefined) {
    return "Pendente";
  }

  const rawText = String(rawStatus).trim();
  const clean = normalizeHeaderCell(rawText);

  if (
    !clean ||
    clean === "-" ||
    clean === "–" ||
    clean === "—" ||
    clean.includes("pend") ||
    clean.includes("aguard") ||
    clean.includes("aberto") ||
    clean.includes("a receber") ||
    clean.includes("a pagar") ||
    clean === "nao"
  ) {
    return "Pendente";
  }

  if (
    clean.includes("receb") ||
    clean.includes("pag") ||
    clean === "ok" ||
    clean === "sim" ||
    clean.includes("confirm") ||
    clean.includes("conclu") ||
    clean.includes("liquid") ||
    clean.includes("feito")
  ) {
    return type === "entrada" ? "Recebido" : "Pago";
  }

  return "Pendente";
}

function shouldIgnoreDescription(desc: string): boolean {
  const trimmed = desc.trim();
  if (!trimmed) return true;
  if (IGNORED_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }
  // Ignora linhas cujo texto seja apenas nome do mês (ex: "JANEIRO", "FEVEREIRO 2026")
  const normalized = stripAccents(trimmed).toLowerCase();
  const words = normalized.split(/\s+/);
  if (words.length <= 2 && MONTH_KEYWORDS[words[0]]) {
    if (words.length === 1 || /^20\d{2}$/.test(words[1])) {
      return true;
    }
  }
  return false;
}

/**
 * Lê um arquivo .xlsx (estrutura da planilha `caixa EA REC.xlsx`) e converte em lançamentos normalizados.
 */
export function parseCaixaSpreadsheet(
  fileBuffer: ArrayBuffer,
  defaultYear = 2026
): SpreadsheetParseResult {
  const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: false });
  const transactions: ParsedSpreadsheetTransaction[] = [];
  const warnings: string[] = [];
  const sheetsRead: string[] = [];
  let skippedRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (!rows.length) continue;

    const sheetHint = detectMonthAndYearHint(sheetName);
    let currentMonth = sheetHint.month || 1;
    let currentYear = sheetHint.year || defaultYear;
    let colMap: ColumnMap | null = null;
    let sheetFoundTransactions = false;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!Array.isArray(row) || row.every((c) => c === "" || c === null || c === undefined)) {
        continue;
      }

      // Verifica se a linha é um banner de mês/ano (ex: "JANEIRO 2026" ou "ABRIL")
      const nonEmptyCells = row
        .map((c) => String(c ?? "").trim())
        .filter(Boolean);
      if (nonEmptyCells.length === 1) {
        const bannerHint = detectMonthAndYearHint(nonEmptyCells[0]);
        if (bannerHint.month) currentMonth = bannerHint.month;
        if (bannerHint.year) currentYear = bannerHint.year;
      }

      // Detecta cabeçalhos (incluindo cabeçalhos repetidos entre meses)
      const detectedHeader = isHeaderRow(row);
      if (detectedHeader) {
        colMap = detectedHeader;
        continue;
      }

      // Se ainda não encontrou cabeçalho, tenta fallback padrão (Data | Descrição | Categoria | Entrada | Saída | Status)
      const activeMap: ColumnMap = colMap || {
        dateIdx: 0,
        descIdx: 1,
        catIdx: 2,
        typeIdx: -1,
        inIdx: 3,
        outIdx: 4,
        amountIdx: -1,
        statusIdx: 5,
      };

      const rawDesc = row[activeMap.descIdx];
      const description = String(rawDesc ?? "").trim();

      if (shouldIgnoreDescription(description)) {
        // Verifica se alguma outra célula dessa linha ignorada tem dica de mês (ex: "TOTAL JANEIRO")
        const joined = nonEmptyCells.join(" ");
        const hint = detectMonthAndYearHint(joined);
        if (hint.month && !/^total/i.test(description)) {
          currentMonth = hint.month;
        }
        continue;
      }

      const rawDate = activeMap.dateIdx >= 0 ? row[activeMap.dateIdx] : null;
      const parsedDate = parseExcelDate(rawDate, currentMonth, currentYear);

      if (!parsedDate) {
        // Se não há data válida e também não há valor monetário relevante, é linha decorativa
        const maybeMoney =
          (activeMap.inIdx >= 0 ? Math.abs(parseExcelMoney(row[activeMap.inIdx])) : 0) +
          (activeMap.outIdx >= 0 ? Math.abs(parseExcelMoney(row[activeMap.outIdx])) : 0) +
          (activeMap.amountIdx >= 0 ? Math.abs(parseExcelMoney(row[activeMap.amountIdx])) : 0);

        if (maybeMoney > 0) {
          skippedRows++;
          warnings.push(
            `Aba "${sheetName}", linha ${rowIdx + 1}: "${description}" ignorada por falta de data válida.`
          );
        }
        continue;
      }

      // Atualiza contexto de mês/ano conforme última data válida
      const [, yStr, mStr] = parsedDate.match(/^(\d{4})-(\d{2})/) || [];
      if (yStr && mStr) {
        currentYear = Number(yStr);
        currentMonth = Number(mStr);
      }

      // Determina Entrada / Saída e Valor
      const inAmount = activeMap.inIdx >= 0 ? parseExcelMoney(row[activeMap.inIdx]) : 0;
      const outAmount = activeMap.outIdx >= 0 ? parseExcelMoney(row[activeMap.outIdx]) : 0;
      const singleAmount = activeMap.amountIdx >= 0 ? parseExcelMoney(row[activeMap.amountIdx]) : 0;

      const rawCat = activeMap.catIdx >= 0 ? row[activeMap.catIdx] : "";
      const rawType = activeMap.typeIdx >= 0 ? row[activeMap.typeIdx] : "";
      const rawStatus = activeMap.statusIdx >= 0 ? row[activeMap.statusIdx] : "";

      let type: FinancialTransactionType | null = null;
      let amount = 0;

      if (Math.abs(inAmount) > 0 && Math.abs(outAmount) === 0) {
        type = "entrada";
        amount = Math.abs(inAmount);
      } else if (Math.abs(outAmount) > 0 && Math.abs(inAmount) === 0) {
        type = "saida";
        amount = Math.abs(outAmount);
      } else if (Math.abs(inAmount) > 0 && Math.abs(outAmount) > 0) {
        // Se por algum motivo ambas tiverem valor, gera dois registros ou prioriza
        const catIn = normalizeCategory(rawCat || "Receita", "entrada");
        const statusIn = normalizeStatus(rawStatus, "entrada");
        transactions.push({
          date: parsedDate,
          description,
          type: "entrada",
          category: catIn,
          amount: Math.round(Math.abs(inAmount) * 100) / 100,
          status: statusIn,
          sourceSheet: sheetName,
          sourceRow: rowIdx + 1,
        });

        const catOut = normalizeCategory(rawCat || "Custo Variável", "saida");
        const statusOut = normalizeStatus(rawStatus, "saida");
        transactions.push({
          date: parsedDate,
          description,
          type: "saida",
          category: catOut === "Receita" ? "Custo Variável" : catOut,
          amount: Math.round(Math.abs(outAmount) * 100) / 100,
          status: statusOut,
          sourceSheet: sheetName,
          sourceRow: rowIdx + 1,
        });
        sheetFoundTransactions = true;
        continue;
      } else if (Math.abs(singleAmount) > 0) {
        const typeStr = normalizeHeaderCell(rawType || rawCat);
        if (
          singleAmount < 0 ||
          typeStr.includes("saida") ||
          typeStr.includes("custo") ||
          typeStr.includes("despesa")
        ) {
          type = "saida";
        } else {
          type = "entrada";
        }
        amount = Math.abs(singleAmount);
      }

      if (!type || amount <= 0) {
        continue;
      }

      let category = normalizeCategory(rawCat, type);
      if (type === "entrada" && category !== "Receita") {
        category = "Receita";
      } else if (type === "saida" && category === "Receita") {
        category = "Custo Variável";
      }

      const status = normalizeStatus(rawStatus, type);

      transactions.push({
        date: parsedDate,
        description,
        type,
        category,
        amount: Math.round(amount * 100) / 100,
        status,
        sourceSheet: sheetName,
        sourceRow: rowIdx + 1,
      });
      sheetFoundTransactions = true;
    }

    if (sheetFoundTransactions) {
      sheetsRead.push(sheetName);
    }
  }

  return {
    transactions,
    skippedRows,
    sheetsRead,
    warnings,
  };
}
