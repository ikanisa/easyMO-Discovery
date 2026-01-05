import type { Widgets } from "./types";

export const action = (type: string, payload?: Record<string, unknown>): Widgets.ActionConfig => ({
  type,
  ...(payload ? { payload } : {}),
});

export const title = (value: string, opts: Partial<Widgets.Title> = {}): Widgets.Title => ({
  type: "Title",
  value,
  ...opts,
});

export const text = (value: string, opts: Partial<Widgets.TextComponent> = {}): Widgets.TextComponent => ({
  type: "Text",
  value,
  ...opts,
});

export const markdown = (value: string, opts: Partial<Widgets.Markdown> = {}): Widgets.Markdown => ({
  type: "Markdown",
  value,
  ...opts,
});

export const caption = (value: string, opts: Partial<Widgets.Caption> = {}): Widgets.Caption => ({
  type: "Caption",
  value,
  ...opts,
});

export const spacer = (size: number | string = 8): Widgets.Spacer => ({
  type: "Spacer",
  size,
});

export const divider = (): Widgets.Divider => ({ type: "Divider" });

export const row = (children: Widgets.WidgetComponent[], opts: Partial<Widgets.Row> = {}): Widgets.Row => ({
  type: "Row",
  children,
  ...opts,
});

export const col = (children: Widgets.WidgetComponent[], opts: Partial<Widgets.Col> = {}): Widgets.Col => ({
  type: "Col",
  children,
  ...opts,
});

export const box = (children: Widgets.WidgetComponent[], opts: Partial<Widgets.Box> = {}): Widgets.Box => ({
  type: "Box",
  children,
  ...opts,
});

export const button = (
  label: string,
  onClickAction?: Widgets.ActionConfig,
  opts: Partial<Widgets.Button> = {}
): Widgets.Button => ({
  type: "Button",
  label,
  ...(onClickAction ? { onClickAction } : {}),
  ...opts,
});

export const form = (
  children: Widgets.WidgetComponent[],
  onSubmitAction?: Widgets.ActionConfig,
  opts: Partial<Widgets.Form> = {}
): Widgets.Form => ({
  type: "Form",
  children,
  ...(onSubmitAction ? { onSubmitAction } : {}),
  ...opts,
});

export const input = (
  name: string,
  placeholder?: string,
  opts: Partial<Widgets.Input> = {}
): Widgets.Input => ({
  type: "Input",
  name,
  ...(placeholder ? { placeholder } : {}),
  ...opts,
});

export const textarea = (
  name: string,
  placeholder?: string,
  opts: Partial<Widgets.Textarea> = {}
): Widgets.Textarea => ({
  type: "Textarea",
  name,
  ...(placeholder ? { placeholder } : {}),
  rows: 4,
  ...opts,
});

export const select = (
  name: string,
  options: Widgets.SelectOption[],
  opts: Partial<Widgets.Select> = {}
): Widgets.Select => ({
  type: "Select",
  name,
  options,
  ...opts,
});

export const card = (
  children: Widgets.WidgetComponent[],
  opts: Partial<Widgets.Card> = {}
): Widgets.Card => ({
  type: "Card",
  children,
  ...opts,
});

// ListView and ListViewItem helpers (for broadcast widgets)
export const listView = (
  items: Widgets.ListViewItem[],
  opts: Partial<Widgets.ListView> = {}
): Widgets.ListView => ({
  type: "ListView",
  items,
  ...opts,
});

export const listItem = (
  children: Widgets.WidgetComponent[],
  opts: Partial<Widgets.ListViewItem> = {}
): Widgets.ListViewItem => ({
  type: "ListViewItem",
  children,
  ...opts,
});

/**
 * Enhanced form helper with validation support
 */
export interface FormField {
  name: string;
  label?: string;
  type: "text" | "email" | "tel" | "number" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  validation?: Widgets.ValidationRule;
  options?: Widgets.SelectOption[]; // For select fields
  defaultValue?: string;
  rows?: number; // For textarea
}

/**
 * Create a form with validation support
 */
export function createForm(
  fields: FormField[],
  onSubmitAction: Widgets.ActionConfig,
  title?: string,
  opts: Partial<Widgets.Form> = {}
): Widgets.Card {
  const formChildren: Widgets.WidgetComponent[] = fields.map(field => {
    const baseProps = {
      name: field.name,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required || field.validation?.required,
      validation: field.validation,
      defaultValue: field.defaultValue,
    };

    switch (field.type) {
      case "textarea":
        return textarea(field.name, field.placeholder, {
          ...baseProps,
          rows: field.rows || 4,
        });
      case "select":
        if (!field.options) {
          throw new Error(`Select field ${field.name} requires options`);
        }
        return select(field.name, field.options, baseProps);
      default:
        return input(field.name, field.placeholder, {
          ...baseProps,
          inputType: field.type as "text" | "email" | "tel" | "number",
        });
    }
  });

  const cardChildren: Widgets.WidgetComponent[] = [];
  
  if (title) {
    cardChildren.push(title(title));
    cardChildren.push(spacer(8));
  }
  
  cardChildren.push(form(formChildren, onSubmitAction, opts));

  return card(cardChildren);
}

