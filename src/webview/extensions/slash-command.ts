import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { SlashMenu } from "../SlashMenu";
import type { SlashItem } from "../SlashMenu";
import type { CalloutVariant } from "./callout";

const ALL_COMMANDS: SlashItem[] = [
  {
    title: "Heading 1",
    description: "Título grande (H1)",
    icon: "H1",
    keywords: ["h1", "heading", "titulo", "title", "grande"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run(),
  },
  {
    title: "Heading 2",
    description: "Título médio (H2)",
    icon: "H2",
    keywords: ["h2", "heading2", "subtitulo", "medio"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run(),
  },
  {
    title: "Heading 3",
    description: "Título pequeno (H3)",
    icon: "H3",
    keywords: ["h3", "heading3", "pequeno"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run(),
  },
  {
    title: "Lista",
    description: "Lista com marcadores",
    icon: "•",
    keywords: ["bullet", "list", "lista", "ul", "marcador"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        .run(),
  },
  {
    title: "Lista Numerada",
    description: "Lista ordenada por números",
    icon: "1.",
    keywords: ["ordered", "numbered", "ol", "numerada", "numero"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .toggleOrderedList()
        .run(),
  },
  {
    title: "Citação",
    description: "Bloco de citação (blockquote)",
    icon: "❝",
    keywords: ["quote", "blockquote", "citacao", "aspas"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .run(),
  },
  {
    title: "Código",
    description: "Bloco de código com syntax highlight",
    icon: "</>",
    keywords: ["code", "codeblock", "codigo", "pre", "snippet"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock()
        .run(),
  },
  {
    title: "Divisor",
    description: "Linha horizontal separadora",
    icon: "—",
    keywords: ["hr", "divider", "divisor", "rule", "linha", "separador"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .setHorizontalRule()
        .run(),
  },
  {
    title: "Note",
    description: "Bloco de nota informativa",
    icon: "ℹ️",
    keywords: ["note", "info", "callout", "nota", "informacao"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { type: "info" as CalloutVariant },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "Tip",
    description: "Bloco de dica ou sugestão",
    icon: "💡",
    keywords: ["tip", "dica", "callout", "sugestao", "hint"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { type: "tip" as CalloutVariant },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "Warning",
    description: "Bloco de aviso ou alerta",
    icon: "⚠️",
    keywords: ["warning", "aviso", "callout", "alert", "cuidado"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { type: "warning" as CalloutVariant },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "Danger",
    description: "Bloco de alerta crítico",
    icon: "🔴",
    keywords: ["danger", "error", "critico", "callout", "perigo"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { type: "danger" as CalloutVariant },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "Toggle",
    description: "Seção colapsável (clique para expandir)",
    icon: "▶",
    keywords: ["toggle", "collapse", "accordion", "details", "colapsar", "expandir"],
    command: ({ editor, range }) =>
      (editor as any)
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "toggle",
          attrs: { summary: "Clique para expandir" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
];

function positionPopup(el: HTMLDivElement, rect: DOMRect) {
  const margin = 8;
  const menuWidth = 300;
  const menuMaxHeight = 400;
  let left = rect.left;
  let top = rect.bottom + 4;

  if (left + menuWidth > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - menuWidth - margin);
  }
  if (top + menuMaxHeight > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - menuMaxHeight - 4);
  }

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        allowedPrefixes: null,

        items({ query }) {
          const q = query.toLowerCase().trim();
          if (!q) return ALL_COMMANDS;
          return ALL_COMMANDS.filter(
            (cmd) =>
              cmd.title.toLowerCase().includes(q) ||
              cmd.keywords.some((k) => k.includes(q))
          );
        },

        render() {
          let renderer: ReactRenderer<any>;
          let popup: HTMLDivElement;

          return {
            onStart(props) {
              renderer = new ReactRenderer(SlashMenu as any, {
                props: {
                  items: props.items,
                  command: (item: SlashItem) => props.command(item),
                },
                editor: props.editor,
              });

              popup = document.createElement("div");
              popup.className = "mve-slash-popup";
              document.body.appendChild(popup);
              popup.appendChild(renderer.element);

              const rect = props.clientRect?.();
              if (rect) positionPopup(popup, rect);
            },

            onUpdate(props) {
              renderer.updateProps({
                items: props.items,
                command: (item: SlashItem) => props.command(item),
              });

              const rect = props.clientRect?.();
              if (rect) positionPopup(popup, rect);
            },

            onKeyDown({ event }) {
              if (event.key === "Escape") {
                popup.style.display = "none";
                return true;
              }
              return (renderer.ref as any)?.onKeyDown({ event }) ?? false;
            },

            onExit() {
              if (popup?.parentNode) popup.remove();
              renderer?.destroy();
            },
          };
        },

        command({ editor, range, props }) {
          (props as SlashItem).command({ editor, range });
        },
      }),
    ];
  },
});
