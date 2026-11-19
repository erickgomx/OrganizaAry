import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ExportConfig, LogoData, PostItem } from "@/types/cronograma";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_CANVAS_DIMENSION = 1200;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/**
 * Converte cor HEX (#RRGGBB ou #RGB) para tupla RGB [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return [51, 41, 60]; // fallback #33293c
}

/**
 * Calcula largura e altura proporcionais dentro de uma caixa delimitadora em mm.
 */
export function calculateLogoBoxDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidthMm = 45,
  maxHeightMm = 18
): { width: number; height: number } {
  if (imgWidth <= 0 || imgHeight <= 0) {
    return { width: maxWidthMm, height: maxHeightMm };
  }
  const ratio = Math.min(maxWidthMm / imgWidth, maxHeightMm / imgHeight);
  return {
    width: Math.round(imgWidth * ratio * 100) / 100,
    height: Math.round(imgHeight * ratio * 100) / 100,
  };
}

/**
 * Valida o arquivo de imagem (PNG, JPG/JPEG, WEBP, máx. 2MB), converte para Base64
 * e extrai suas dimensões reais para renderização sem distorção no PDF.
 */
export async function fileToLogoData(file: File): Promise<LogoData> {
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Formato inválido. Envie uma imagem PNG, JPG/JPEG ou WEBP.");
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error("A logo deve ter no máximo 2MB.");
  }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Não foi possível ler a imagem."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao carregar arquivo de imagem."));
    reader.readAsDataURL(file);
  });

  const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler as dimensões da logo."));
    img.src = base64;
  });

  const naturalW = loadedImage.naturalWidth || loadedImage.width || 1;
  const naturalH = loadedImage.naturalHeight || loadedImage.height || 1;
  const isWebp = file.type.toLowerCase() === "image/webp";
  const isJpeg = file.type.toLowerCase() === "image/jpeg" || file.type.toLowerCase() === "image/jpg";
  const needsResize = naturalW > MAX_CANVAS_DIMENSION || naturalH > MAX_CANVAS_DIMENSION;

  if (isWebp || needsResize) {
    const scale = Math.min(1, MAX_CANVAS_DIMENSION / Math.max(naturalW, naturalH));
    const targetW = Math.max(1, Math.round(naturalW * scale));
    const targetH = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(loadedImage, 0, 0, targetW, targetH);
      const outputFormat: LogoData["format"] = isJpeg ? "JPEG" : "PNG";
      const outputMime = isJpeg ? "image/jpeg" : "image/png";
      const convertedBase64 = isJpeg
        ? canvas.toDataURL(outputMime, 0.9)
        : canvas.toDataURL(outputMime);

      return {
        base64: convertedBase64,
        format: outputFormat,
        width: targetW,
        height: targetH,
        fileName: file.name,
      };
    }
  }

  const format: LogoData["format"] = isJpeg ? "JPEG" : "PNG";

  return {
    base64,
    format,
    width: naturalW,
    height: naturalH,
    fileName: file.name,
  };
}

/**
 * Sanitiza texto para compor o nome do arquivo PDF.
 */
export function sanitizePdfSegment(value: string, fallback: string): string {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function formatDateBr(dateStr: string): string {
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getStatusRgbColor(status: string): [number, number, number] {
  if (status === "Aprovado" || status === "Publicado") {
    return [22, 163, 74]; // #16A34A
  }
  if (status === "Pendente" || status === "Em Revisão") {
    return [217, 119, 6]; // #D97706
  }
  if (status === "Ajustar" || status === "Reprovado") {
    return [220, 38, 38]; // #DC2626
  }
  return [51, 65, 85];
}

/**
 * Filtra os posts de acordo com os filtros de exportação.
 */
export function filterPostsForExport(
  posts: PostItem[],
  config: Pick<ExportConfig, "statusFilter" | "networkFilter">
): PostItem[] {
  return [...posts]
    .filter((post) => {
      if (config.statusFilter !== "Todos" && post.status !== config.statusFilter) {
        return false;
      }
      if (
        config.networkFilter !== "Todas" &&
        post.socialNetwork !== config.networkFilter
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCmp !== 0) return dateCmp;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
}

/**
 * Gera e faz o download do PDF A4 Paisagem do cronograma de postagens.
 */
export function exportarCronogramaPDF(posts: PostItem[], config: ExportConfig): string {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const primaryRgb = hexToRgb(config.primaryColorHex);

  const brandName = config.brandName.trim() || "Cliente";
  const periodLabel = config.periodLabel.trim() || "Geral";

  // ── Cabeçalho Institucional (Página 1) ──
  const headerTop = margin;
  const logoMaxW = 45;
  const logoMaxH = 18;

  if (config.logo?.base64) {
    try {
      const dims = calculateLogoBoxDimensions(
        config.logo.width,
        config.logo.height,
        logoMaxW,
        logoMaxH
      );
      const yOffset = headerTop + (logoMaxH - dims.height) / 2;
      doc.addImage(
        config.logo.base64,
        config.logo.format,
        margin,
        yOffset,
        dims.width,
        dims.height,
        undefined,
        "FAST"
      );
    } catch {
      // Caso a imagem falhe na renderização, segue sem quebrar o layout
    }
  }

  // Bloco à direita do cabeçalho
  const rightX = pageWidth - margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cronograma de Conteúdo - ${brandName}`, rightX, headerTop + 6, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Período: ${periodLabel}`, rightX, headerTop + 12, {
    align: "right",
  });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Organiza Ary", rightX, headerTop + 17, {
    align: "right",
  });

  // Linha divisória sutil abaixo do cabeçalho
  const dividerY = headerTop + 22;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // ── Tabela de Postagens ──
  const filteredPosts = filterPostsForExport(posts, config);

  const bodyRows = filteredPosts.map((post) => [
    `${formatDateBr(post.scheduledDate)}\n${post.scheduledTime || "-"}`,
    post.socialNetwork,
    post.format,
    post.theme,
    post.caption || "-",
    post.status,
  ]);

  const luminance = 0.299 * primaryRgb[0] + 0.587 * primaryRgb[1] + 0.114 * primaryRgb[2];
  const headTextColor: [number, number, number] =
    luminance > 195 ? [15, 23, 42] : [255, 255, 255];

  autoTable(doc, {
    startY: dividerY + 5,
    margin: { top: margin, right: margin, bottom: 18, left: margin },
    head: [
      [
        "Data / Horário",
        "Rede Social",
        "Formato",
        "Tema / Título",
        "Legenda / Briefing / CTA",
        "Status",
      ],
    ],
    body: bodyRows,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240], // #E2E8F0
      lineWidth: 0.2,
      valign: "top",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: primaryRgb,
      textColor: headTextColor,
      fontStyle: "bold",
      fontSize: 9,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #F8FAFC
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 45, fontStyle: "bold" },
      4: { cellWidth: "auto" },
      5: { cellWidth: 26, halign: "center", valign: "middle" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const rawStatus = String(data.cell.raw || "");
        data.cell.styles.textColor = getStatusRgbColor(rawStatus);
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── Rodapé em todas as páginas ("Página X de Y") ──
  const totalPages = doc.getNumberOfPages();
  const generatedLabel = `Gerado em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())}`;

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const footerY = pageHeight - 8;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(generatedLabel, margin, footerY);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, footerY, {
      align: "right",
    });
  }

  const safeBrand = sanitizePdfSegment(brandName, "Marca");
  const safePeriod = sanitizePdfSegment(periodLabel, "Periodo");
  const fileName = `Cronograma_${safeBrand}_${safePeriod}.pdf`;

  doc.save(fileName);
  return fileName;
}
