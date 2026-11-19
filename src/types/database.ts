export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EventStatus =
  | "budget_lead"
  | "scheduled"
  | "captured"
  | "post_production"
  | "finished";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "todo" | "in_progress" | "done";

export type FinancialTransactionType = "entrada" | "saida";

export type FinancialCategory = "Receita" | "Custo Fixo" | "Custo Variável";

export type FinancialStatus = "Recebido" | "Pago" | "Pendente";

export type SocialNetworkDb =
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "YouTube"
  | "Facebook"
  | "Outro";

export type PostFormatDb =
  | "Reels"
  | "Carrossel"
  | "Estático"
  | "Stories"
  | "Shorts"
  | "Outro";

export type PostStatusDb =
  | "Aprovado"
  | "Publicado"
  | "Pendente"
  | "Em Revisão"
  | "Ajustar"
  | "Reprovado";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          google_refresh_token: string | null;
          google_access_token: string | null;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
          google_access_token?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
          google_access_token?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          title: string;
          date: string;
          location: string | null;
          status: EventStatus;
          price: number;
          google_event_id: string | null;
          drive_folder_url: string | null;
          drive_folder_id: string | null;
          meet_link: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          title: string;
          date: string;
          location?: string | null;
          status?: EventStatus;
          price?: number;
          google_event_id?: string | null;
          drive_folder_url?: string | null;
          drive_folder_id?: string | null;
          meet_link?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          title?: string;
          date?: string;
          location?: string | null;
          status?: EventStatus;
          price?: number;
          google_event_id?: string | null;
          drive_folder_url?: string | null;
          drive_folder_id?: string | null;
          meet_link?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          title: string;
          description: string | null;
          priority: TaskPriority;
          status: TaskStatus;
          due_date: string | null;
          is_done: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id?: string | null;
          title: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          is_done?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          is_done?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          last_notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          last_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          last_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_transactions: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          date: string;
          description: string;
          type: FinancialTransactionType;
          category: FinancialCategory;
          amount: number;
          status: FinancialStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id?: string | null;
          date: string;
          description: string;
          type: FinancialTransactionType;
          category: FinancialCategory;
          amount: number;
          status: FinancialStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string | null;
          date?: string;
          description?: string;
          type?: FinancialTransactionType;
          category?: FinancialCategory;
          amount?: number;
          status?: FinancialStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_transactions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      profit_pillar_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          percentage: number;
          sort_order: number;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          percentage: number;
          sort_order?: number;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          percentage?: number;
          sort_order?: number;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      social_posts: {
        Row: {
          id: string;
          user_id: string;
          client_id: string | null;
          scheduled_date: string;
          scheduled_time: string;
          social_network: SocialNetworkDb;
          format: PostFormatDb;
          theme: string;
          caption: string;
          status: PostStatusDb;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id?: string | null;
          scheduled_date: string;
          scheduled_time?: string;
          social_network: SocialNetworkDb;
          format: PostFormatDb;
          theme: string;
          caption?: string;
          status?: PostStatusDb;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string | null;
          scheduled_date?: string;
          scheduled_time?: string;
          social_network?: SocialNetworkDb;
          format?: PostFormatDb;
          theme?: string;
          caption?: string;
          status?: PostStatusDb;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_posts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      event_status: EventStatus;
      task_priority: TaskPriority;
      task_status: TaskStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Domain Models convenience shortcuts
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type FinancialTransaction = Database["public"]["Tables"]["financial_transactions"]["Row"];
export type ProfitPillarRule = Database["public"]["Tables"]["profit_pillar_rules"]["Row"];
export type SocialPost = Database["public"]["Tables"]["social_posts"]["Row"];

export type ClientWithEvents = Client & {
  events?: Event[];
};

export type EventWithClient = Event & {
  client?: Client;
};

export type TaskWithEvent = Task & {
  event?: Event | null;
};

export type FinancialTransactionWithEvent = FinancialTransaction & {
  event?: {
    id: string;
    title: string;
    client?: {
      id: string;
      name: string;
    } | null;
  } | null;
};
