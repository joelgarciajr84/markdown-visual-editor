import MarkdownIt from "markdown-it";
import type { Editor } from "@tiptap/core";

/**
 * Instância única de markdown-it, configurada com as MESMAS opções do
 * serializer (ver schema.ts) para manter o round-trip o mais estável possível.
 *
 * É usada em dois lugares:
 *  - como motor de parse do editor (a extensão tiptap-markdown delega a ele);
 *  - no preview lado a lado (App.tsx), que renderiza Markdown -> HTML.
 */
export const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
});

/** Markdown -> HTML. Usado pelo preview lateral (extra opcional). */
export function markdownToHtml(markdown: string): string {
  return md.render(markdown ?? "");
}

/**
 * Markdown -> editor.
 *
 * A extensão tiptap-markdown intercepta `setContent` quando recebe uma string e
 * a interpreta como Markdown (parse via markdown-it -> documento ProseMirror).
 * Passamos `emitUpdate = false` para que a atualização programática NÃO dispare
 * o callback `onUpdate` (que reenviaria a edição para a extensão, criando loop).
 */
export function setEditorMarkdown(editor: Editor, markdown: string): void {
  editor.commands.setContent(markdown ?? "", false, {
    preserveWhitespace: "full",
  });
}

/**
 * Editor -> Markdown.
 *
 * `editor.storage.markdown.getMarkdown()` é fornecido pela extensão
 * tiptap-markdown e serializa o documento atual de volta para Markdown válido.
 */
export function getEditorMarkdown(editor: Editor): string {
  const storage = editor.storage as {
    markdown?: { getMarkdown: () => string };
  };
  if (!storage.markdown) {
    // Salvaguarda: se a extensão Markdown não estiver registrada, evita crash.
    return "";
  }
  return storage.markdown.getMarkdown();
}
