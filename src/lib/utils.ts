import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type React from "react";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Valida que links externos utilizam estritamente o protocolo http ou https,
 * prevenindo vetores de XSS via javascript:, data: ou outros esquemas maliciosos.
 */
export function sanitizeExternalUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Intercepta a tecla Enter (Retornar) em formulários para evitar que sejam
 * enviados precocemente ao preencher campos de texto.
 * Pula automaticamente para o próximo campo de baixo sem enviar ou salvar tudo.
 * Se pressionado com Shift (Shift+Enter), retorna para o campo anterior.
 */
export function handleFormKeyDownEnterToNextField(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.defaultPrevented) return;

  if (e.key === "Enter") {
    const target = e.target as HTMLElement;

    // Não intercepta se estiver digitando em uma textarea (permite quebra de linha normal)
    // ou se o foco estiver diretamente em um botão de ação.
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") {
      return;
    }

    // Previne envio acidental do formulário ao apertar Enter
    e.preventDefault();

    const form = e.currentTarget;
    const focusableSelector =
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])';
    const focusables = Array.from(form.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => el.offsetParent !== null
    );

    const currentIndex = focusables.indexOf(target);

    if (e.shiftKey) {
      // Se pressionou Shift+Enter, volta para o campo anterior
      if (currentIndex > 0) {
        const prevElement = focusables[currentIndex - 1];
        prevElement.focus();
        if (
          prevElement instanceof HTMLInputElement &&
          (prevElement.type === "text" || prevElement.type === "number" || prevElement.type === "email" || prevElement.type === "tel")
        ) {
          prevElement.select?.();
        }
      }
    } else {
      // Enter comum: avança para o campo de baixo
      if (currentIndex > -1 && currentIndex < focusables.length - 1) {
        const nextElement = focusables[currentIndex + 1];
        nextElement.focus();
        if (
          nextElement instanceof HTMLInputElement &&
          (nextElement.type === "text" || nextElement.type === "number" || nextElement.type === "email" || nextElement.type === "tel")
        ) {
          nextElement.select?.();
        }
      }
    }
  }
}

/**
 * Formata um valor numérico em moeda BRL (ex: 1500 -> "R$ 1.500,00").
 */
export function formatBRL(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
}

/**
 * Formata a digitação no campo de valor:
 * - Remove caracteres inválidos (permite dígitos e até uma vírgula/ponto para centavos)
 * - Remove zeros à esquerda indesejados (ex: "0100" -> "100", "00" -> "0")
 * - Limita os centavos a no máximo 2 casas
 */
export function formatCurrencyInput(val: string): string {
  if (!val) return "";

  // Se o valor contiver tanto ponto quanto vírgula (ex: "1.500,00"), o ponto é separador de milhar
  if (val.includes(".") && val.includes(",")) {
    val = val.replace(/\./g, "");
  } else if (val.includes(".")) {
    const parts = val.split(".");
    // Se tiver mais de um ponto ou padrão de milhar (3 dígitos finais), remove o ponto
    if (parts.length > 2 || (parts[1] && parts[1].length === 3 && parts[0].length >= 1)) {
      val = val.replace(/\./g, "");
    } else {
      // Ponto isolado funciona como separador decimal
      val = val.replace(".", ",");
    }
  }

  // Remove qualquer caractere que não seja dígito ou vírgula
  let clean = val.replace(/[^\d,]/g, "");

  // Se houver mais de uma vírgula, preserva apenas a primeira
  const commaCount = (clean.match(/,/g) || []).length;
  if (commaCount > 1) {
    const firstCommaIndex = clean.indexOf(",");
    clean =
      clean.slice(0, firstCommaIndex + 1) +
      clean.slice(firstCommaIndex + 1).replace(/,/g, "");
  }

  let [integerPart, decimalPart] = clean.split(",");

  // Remove zeros à esquerda indesejados na parte inteira:
  // "0100" -> "100", "00" -> "0", "05" -> "5"
  if (integerPart) {
    integerPart = integerPart.replace(/^0+(?=\d)/, "");
    if (integerPart === "") {
      integerPart = "0";
    }
  }

  // Limita os centavos a 2 dígitos
  if (decimalPart !== undefined) {
    decimalPart = decimalPart.slice(0, 2);
    return `${integerPart || "0"},${decimalPart}`;
  }

  return integerPart;
}

/**
 * Converte a string digitada no campo (ex: "100", "1.500,50") para número float compatível com o banco.
 */
export function parseCurrencyInput(val: string): number {
  if (!val) return 0;
  // Remove pontos de milhar e substitui vírgula decimal por ponto
  const normalized = val.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte qualquer formato de data/hora (ISO completo ou local "YYYY-MM-DDTHH:mm")
 * para string ISO 8601 UTC de forma segura, evitando que servidores com timezone UTC
 * desloquem o horário digitado no fuso horário do Brasil (-03:00 / America/Sao_Paulo).
 */
export function parseEventDateToIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  // Se já possui indicador de fuso (Z ou offset +/-HH:mm ou +/-HHmm)
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  // Se é datetime local (ex: "2026-11-10T14:00" ou "2026-11-10T14:00:00")
  // Assume fuso padrão do Brasil (-03:00 / America/Sao_Paulo)
  const withTz = `${dateStr.length === 16 ? `${dateStr}:00` : dateStr}-03:00`;
  const d = new Date(withTz);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  return new Date(dateStr).toISOString();
}

/**
 * Formata uma data/hora (ISO do banco ou string) para o formato exigido pelo
 * input HTML5 datetime-local ("YYYY-MM-DDTHH:mm") no fuso local do navegador.
 */
export function formatDateTimeForInput(dateStr?: string | null): string {
  if (!dateStr) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T14:00`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}


