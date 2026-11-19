export type SocialNetwork =
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "YouTube"
  | "Facebook"
  | "Outro";

export type PostFormat =
  | "Reels"
  | "Carrossel"
  | "Estático"
  | "Stories"
  | "Shorts"
  | "Outro";

export type PostStatus =
  | "Aprovado"
  | "Publicado"
  | "Pendente"
  | "Em Revisão"
  | "Ajustar"
  | "Reprovado";

export interface PostItem {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  socialNetwork: SocialNetwork;
  format: PostFormat;
  theme: string;
  caption: string;
  status: PostStatus;
}

export interface LogoData {
  base64: string;
  format: "PNG" | "JPEG" | "WEBP";
  width: number;
  height: number;
  fileName?: string;
}

export interface ExportConfig {
  brandName: string;
  periodLabel: string;
  primaryColorHex: string;
  logo?: LogoData | null;
  statusFilter: "Todos" | PostStatus;
  networkFilter: "Todas" | SocialNetwork;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Facebook",
  "Outro",
];

export const POST_FORMATS: PostFormat[] = [
  "Reels",
  "Carrossel",
  "Estático",
  "Stories",
  "Shorts",
  "Outro",
];

export const POST_STATUSES: PostStatus[] = [
  "Pendente",
  "Em Revisão",
  "Aprovado",
  "Publicado",
  "Ajustar",
  "Reprovado",
];

export const MOCK_CRONOGRAMA_POSTS: PostItem[] = [
  {
    id: "mock-1",
    scheduledDate: "2026-11-20",
    scheduledTime: "18:00",
    socialNetwork: "Instagram",
    format: "Reels",
    theme: "Bastidores de Ensaio Externo",
    caption:
      "Mostre em 25s a preparação de luz natural no pôr do sol e o resultado final em alta definição. CTA: 'Agende seu ensaio pelo link da bio'.",
    status: "Aprovado",
  },
  {
    id: "mock-2",
    scheduledDate: "2026-11-22",
    scheduledTime: "11:30",
    socialNetwork: "Instagram",
    format: "Carrossel",
    theme: "5 Dicas para Escolher o Look do Ensaio",
    caption:
      "Carrossel educativo de 6 lâminas com paleta neutra, tecidos fluidos e erros comuns a evitar. CTA: 'Salve este guia para o dia das fotos'.",
    status: "Pendente",
  },
  {
    id: "mock-3",
    scheduledDate: "2026-11-24",
    scheduledTime: "19:00",
    socialNetwork: "TikTok",
    format: "Reels",
    theme: "Transição Antes & Depois (Color Grading)",
    caption:
      "Vídeo curto comparando arquivo RAW direto da câmera com a colorização final cinematográfica. CTA: 'Comente QUAL LUT prefere'.",
    status: "Em Revisão",
  },
  {
    id: "mock-4",
    scheduledDate: "2026-11-26",
    scheduledTime: "09:00",
    socialNetwork: "LinkedIn",
    format: "Estático",
    theme: "Posicionamento Visual para Empresas",
    caption:
      "Estudo de caso mostrando como retratos corporativos consistentes aumentam a percepção de autoridade da marca. CTA: 'Solicite uma proposta'.",
    status: "Ajustar",
  },
  {
    id: "mock-5",
    scheduledDate: "2026-11-28",
    scheduledTime: "12:00",
    socialNetwork: "Instagram",
    format: "Stories",
    theme: "Caixinha de Perguntas — Agenda de Dezembro",
    caption:
      "Sequência de 3 stories abrindo as últimas datas de dezembro com enquete rápida e link direto para WhatsApp.",
    status: "Publicado",
  },
];
