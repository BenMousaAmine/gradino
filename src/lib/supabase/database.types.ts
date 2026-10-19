
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "client_at": string | null,"created_at": string,"id": number,"payload": NonNullable<Json>,"session_id": string | null,"skill_id": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_at"?: string | null,"created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"session_id"?: string | null,"skill_id"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "client_at"?: string | null,"created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"session_id"?: string | null,"skill_id"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_events_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"areas": {
                  Row: {
                    "id": string,"position": number,"subject_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"position"?: number,"subject_id": string,"title": string
                  }
                  Update: {
                    "id"?: string,"position"?: number,"subject_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "areas_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"assessment_items": {
                  Row: {
                    "item_id": string,"position": number,"section_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "item_id": string,"position": number,"section_id": string
                  }
                  Update: {
                    "item_id"?: string,"position"?: number,"section_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_items_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "assessment_sections"
      referencedColumns: ["id"]
    }
                  ]
                },"assessment_sections": {
                  Row: {
                    "area_id": string,"assessment_id": string,"code": string,"id": string,"optional_question": string | null,"part": number,"position": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"assessment_id": string,"code": string,"id": string,"optional_question"?: string | null,"part"?: number,"position": number,"title": string
                  }
                  Update: {
                    "area_id"?: string,"assessment_id"?: string,"code"?: string,"id"?: string,"optional_question"?: string | null,"part"?: number,"position"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_sections_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_sections_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "assessments"
      referencedColumns: ["id"]
    }
                  ]
                },"assessments": {
                  Row: {
                    "config": NonNullable<Json>,"description": string,"id": string,"kind": string,"subject_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"description"?: string,"id": string,"kind": string,"subject_id": string,"title": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"description"?: string,"id"?: string,"kind"?: string,"subject_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessments_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"attempts": {
                  Row: {
                    "assessment_id": string,"completed_at": string | null,"current_part": number,"id": string,"result": Json | null,"section_choices": NonNullable<Json>,"started_at": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assessment_id": string,"completed_at"?: string | null,"current_part"?: number,"id"?: string,"result"?: Json | null,"section_choices"?: NonNullable<Json>,"started_at"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "assessment_id"?: string,"completed_at"?: string | null,"current_part"?: number,"id"?: string,"result"?: Json | null,"section_choices"?: NonNullable<Json>,"started_at"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "assessments"
      referencedColumns: ["id"]
    }
                  ]
                },"item_keys": {
                  Row: {
                    "item_id": string,"key": NonNullable<Json>,"solution": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "item_id": string,"key": NonNullable<Json>,"solution"?: NonNullable<Json>
                  }
                  Update: {
                    "item_id"?: string,"key"?: NonNullable<Json>,"solution"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_keys_item_id_fkey"
      columns: ["item_id"]
isOneToOne: true
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"item_templates": {
                  Row: {
                    "generator": string,"id": string,"level": string,"params": NonNullable<Json>,"skill_id": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "generator": string,"id": string,"level": string,"params"?: NonNullable<Json>,"skill_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "generator"?: string,"id"?: string,"level"?: string,"params"?: NonNullable<Json>,"skill_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_templates_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "content": NonNullable<Json>,"created_at": string,"id": string,"kind": string,"level": string,"skill_id": string,"status": string,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"created_at"?: string,"id": string,"kind"?: string,"level": string,"skill_id": string,"status"?: string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"kind"?: string,"level"?: string,"skill_id"?: string,"status"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "content": NonNullable<Json>,"skill_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"skill_id": string,"updated_at"?: string
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"skill_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: true
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"practice_answers": {
                  Row: {
                    "answer": NonNullable<Json>,"content": NonNullable<Json>,"created_at": string,"details": NonNullable<Json>,"error_tag": string | null,"id": string,"level": string,"purpose": string,"score": number,"seed": number | null,"session_id": string | null,"skill_id": string,"source": string,"source_id": string,"time_ms": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"content": NonNullable<Json>,"created_at"?: string,"details"?: NonNullable<Json>,"error_tag"?: string | null,"id"?: string,"level": string,"purpose": string,"score": number,"seed"?: number | null,"session_id"?: string | null,"skill_id": string,"source": string,"source_id": string,"time_ms": number,"user_id": string
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"content"?: NonNullable<Json>,"created_at"?: string,"details"?: NonNullable<Json>,"error_tag"?: string | null,"id"?: string,"level"?: string,"purpose"?: string,"score"?: number,"seed"?: number | null,"session_id"?: string | null,"skill_id"?: string,"source"?: string,"source_id"?: string,"time_ms"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "practice_answers_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "practice_answers_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"role"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"role"?: string
                  }
                  Relationships: [
                    
                  ]
                },"responses": {
                  Row: {
                    "answer": NonNullable<Json>,"attempt_id": string,"created_at": string,"details": NonNullable<Json>,"error_tag": string | null,"id": string,"item_id": string,"score": number,"time_ms": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": NonNullable<Json>,"attempt_id": string,"created_at"?: string,"details"?: NonNullable<Json>,"error_tag"?: string | null,"id"?: string,"item_id": string,"score": number,"time_ms": number,"user_id": string
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"attempt_id"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"error_tag"?: string | null,"id"?: string,"item_id"?: string,"score"?: number,"time_ms"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "responses_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "responses_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"skill_prerequisites": {
                  Row: {
                    "prerequisite_id": string,"skill_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "prerequisite_id": string,"skill_id": string
                  }
                  Update: {
                    "prerequisite_id"?: string,"skill_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skill_prerequisites_prerequisite_id_fkey"
      columns: ["prerequisite_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "skill_prerequisites_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"skill_progress": {
                  Row: {
                    "lesson_done_at": string | null,"level": string,"next_review_on": string | null,"review_step": number,"skill_id": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "lesson_done_at"?: string | null,"level"?: string,"next_review_on"?: string | null,"review_step"?: number,"skill_id": string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "lesson_done_at"?: string | null,"level"?: string,"next_review_on"?: string | null,"review_step"?: number,"skill_id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skill_progress_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"skills": {
                  Row: {
                    "area_id": string,"id": string,"position": number,"school_year": number | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"id": string,"position"?: number,"school_year"?: number | null,"title": string
                  }
                  Update: {
                    "area_id"?: string,"id"?: string,"position"?: number,"school_year"?: number | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skills_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    }
                  ]
                },"study_sessions": {
                  Row: {
                    "block": number,"block_started_at": string,"completed_at": string | null,"created_at": string,"day": string,"id": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block"?: number,"block_started_at"?: string,"completed_at"?: string | null,"created_at"?: string,"day": string,"id"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "block"?: number,"block_started_at"?: string,"completed_at"?: string | null,"created_at"?: string,"day"?: string,"id"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subjects": {
                  Row: {
                    "id": string,"position": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"position"?: number,"title": string
                  }
                  Update: {
                    "id"?: string,"position"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
