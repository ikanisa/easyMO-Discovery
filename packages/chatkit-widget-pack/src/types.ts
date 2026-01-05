/**
 * ChatKit Widget Types
 * 
 * Type definitions for OpenAI ChatKit widgets.
 * These types will be replaced when @openai/chatkit is published.
 */

export namespace Widgets {
  export type ActionConfig = {
    type: string;
    payload?: Record<string, unknown>;
    handler?: "server" | "client";
    loadingBehavior?: "container" | "button" | "none";
  };

  export type WidgetComponent =
    | Title
    | TextComponent
    | Markdown
    | Caption
    | Spacer
    | Divider
    | Row
    | Col
    | Box
    | Button
    | Form
    | Input
    | Textarea
    | Select
    | Card
    | ListView;

  export type Title = {
    type: "Title";
    value: string;
    size?: "sm" | "md" | "lg";
  };

  export type TextComponent = {
    type: "Text";
    value: string;
    size?: "sm" | "md" | "lg";
    weight?: "normal" | "semibold" | "bold";
  };

  export type Markdown = {
    type: "Markdown";
    value: string;
  };

  export type Caption = {
    type: "Caption";
    value: string;
    size?: "sm" | "md";
  };

  export type Spacer = {
    type: "Spacer";
    size: number | string;
  };

  export type Divider = {
    type: "Divider";
  };

  export type Row = {
    type: "Row";
    children: WidgetComponent[];
    gap?: number;
    wrap?: "wrap" | "nowrap";
    justify?: "start" | "end" | "center" | "space-between" | "space-around";
    align?: "start" | "end" | "center" | "stretch";
  };

  export type Col = {
    type: "Col";
    children: WidgetComponent[];
    flex?: number;
    gap?: number;
  };

  export type Box = {
    type: "Box";
    children: WidgetComponent[];
    padding?: number;
    margin?: number;
  };

  export type Button = {
    type: "Button";
    label: string;
    onClickAction?: ActionConfig;
    submit?: boolean;
    color?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "discovery";
    style?: "primary" | "secondary" | "outline";
    block?: boolean;
    iconStart?: string;
    iconEnd?: string;
    loadingBehavior?: "container" | "button" | "none";
  };

  export type Form = {
    type: "Form";
    children: WidgetComponent[];
    onSubmitAction?: ActionConfig;
    direction?: "row" | "col";
    gap?: number;
  };

  export type ValidationRule = {
    required?: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    message?: string;
    validator?: (value: any) => boolean | string;
  };

  export type Input = {
    type: "Input";
    name: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
    inputType?: "text" | "number" | "email" | "tel" | "password";
    validation?: ValidationRule;
    defaultValue?: string;
  };

  export type Textarea = {
    type: "Textarea";
    name: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
    validation?: ValidationRule;
    rows?: number;
    defaultValue?: string;
  };

  export type SelectOption = {
    label: string;
    value: string;
  };

  export type Select = {
    type: "Select";
    name: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    options: SelectOption[];
    validation?: ValidationRule;
    defaultValue?: string;
  };

  export type Card = {
    type: "Card";
    children: WidgetComponent[];
    padding?: number;
    border?: number;
    radius?: "sm" | "md" | "lg";
    metadata?: {
      realtime_channel?: string;
      realtime_table?: string;
      realtime_filter?: string;
      [key: string]: any;
    };
  };

  export type ListView = {
    type: "ListView";
    items: ListViewItem[];
    status?: { text: string };
    limit?: number | "auto";
  };

  export type ListViewItem = {
    type: "ListViewItem";
    children: WidgetComponent[];
    onClickAction?: ActionConfig;
  };
}

