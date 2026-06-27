import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import type { Extensions } from "@tiptap/core";

/**
 * Define o conjunto de extensões (= schema do ProseMirror/TipTap) usado pelo
 * editor visual. O schema é a "ponte" entre o Markdown e o modelo de documento:
 *
 *   Markdown  --(tiptap-markdown / markdown-it)-->  Document Model (este schema)
 *   Document Model  --(tiptap-markdown serializer)-->  Markdown
 *
 * StarterKit já cobre: parágrafo, headings (H1-H6), negrito, itálico, código
 * inline, code block, listas (bullet/ordered), blockquote, hr, hard break, etc.
 */
export function buildExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: {
        HTMLAttributes: { class: "mve-code-block" },
      },
      // Mantemos o histórico (undo/redo) do próprio TipTap ativo.
    }),

    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        class: "mve-link",
      },
    }),

    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: { class: "mve-image" },
    }),

    // Extensão responsável pela conversão Markdown <-> documento.
    // Usa markdown-it para o parse e prosemirror-markdown para a serialização.
    Markdown.configure({
      html: true, // permite HTML embutido no markdown
      tightLists: true, // listas compactas (sem <p> dentro de <li> quando possível)
      bulletListMarker: "-", // usa "-" para itens de lista
      linkify: true, // transforma URLs cruas em links
      breaks: false, // quebras de linha simples NÃO viram <br>
      transformPastedText: true, // ao colar markdown, converte para nós ricos
      transformCopiedText: true, // ao copiar, devolve markdown
    }),
  ];
}
