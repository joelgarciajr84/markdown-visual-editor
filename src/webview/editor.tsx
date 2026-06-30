import React, { useCallback, useRef, useState } from "react";
import { EditorContent, BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { CalloutVariant } from "./extensions/callout";

interface VisualEditorProps {
  editor: Editor;
  onToggleSource: () => void;
  onTogglePreview: () => void;
  previewVisible: boolean;
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function VisualEditor({
  editor,
  onToggleSource,
  onTogglePreview,
  previewVisible,
}: VisualEditorProps): JSX.Element {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageValue, setImageValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggle = (fn: () => void) => () => {
    fn();
    editor.commands.focus();
  };

  const openLink = () => {
    const previous = (editor.getAttributes("link").href as string) ?? "";
    setLinkValue(previous);
    setLinkOpen(true);
    setImageOpen(false);
  };

  const applyLink = () => {
    const url = linkValue.trim();
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setLinkOpen(false);
    setLinkValue("");
  };

  const applyImage = () => {
    const url = imageValue.trim();
    if (url !== "") {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setImageOpen(false);
    setImageValue("");
  };

  const insertImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      for (const file of list) {
        try {
          const dataUrl = await readImageAsDataUrl(file);
          editor.chain().focus().setImage({ src: dataUrl }).run();
        } catch {
          /* ignora erros de leitura */
        }
      }
    },
    [editor]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const images = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (images.length > 0) {
        e.preventDefault();
        void insertImageFiles(images);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void insertImageFiles(files);
    }
  };

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs) ? "mve-btn mve-btn--active" : "mve-btn";

  const insertCallout = (type: CalloutVariant) => {
    editor.chain().focus().insertContent({
      type: "callout",
      attrs: { type },
      content: [{ type: "paragraph" }],
    }).run();
  };

  const insertToggle = () => {
    editor.chain().focus().insertContent({
      type: "toggle",
      attrs: { summary: "Clique para expandir" },
      content: [{ type: "paragraph" }],
    }).run();
  };

  return (
    <div className="mve-root">
      {/* ── Bubble Menu (aparece ao selecionar texto) ─────────────────── */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 80, placement: "top" }}
        shouldShow={({ state }) => {
          const { selection } = state;
          if (selection.empty) return false;
          if (editor.isActive("codeBlock")) return false;
          return true;
        }}
        className="mve-bubble-menu"
      >
        <button
          className={editor.isActive("bold") ? "mve-bm-btn mve-bm-btn--active" : "mve-bm-btn"}
          title="Negrito"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        >
          <b>B</b>
        </button>
        <button
          className={editor.isActive("italic") ? "mve-bm-btn mve-bm-btn--active" : "mve-bm-btn"}
          title="Itálico"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        >
          <i>I</i>
        </button>
        <button
          className={editor.isActive("strike") ? "mve-bm-btn mve-bm-btn--active" : "mve-bm-btn"}
          title="Tachado"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
        >
          <s>S</s>
        </button>
        <button
          className={editor.isActive("code") ? "mve-bm-btn mve-bm-btn--active" : "mve-bm-btn"}
          title="Código inline"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
        >
          {"</>"}
        </button>
        <span className="mve-bm-sep" />
        <button
          className={editor.isActive("link") ? "mve-bm-btn mve-bm-btn--active" : "mve-bm-btn"}
          title="Link"
          onMouseDown={(e) => { e.preventDefault(); openLink(); }}
        >
          🔗
        </button>
      </BubbleMenu>

      {/* ── Toolbar principal ─────────────────────────────────────────── */}
      <div className="mve-toolbar" role="toolbar" aria-label="Formatação">
        <div className="mve-toolbar-group">
          <button
            className={isActive("bold")}
            title="Negrito (Ctrl+B)"
            onClick={toggle(() => editor.chain().focus().toggleBold().run())}
          >
            <b>B</b>
          </button>
          <button
            className={isActive("italic")}
            title="Itálico (Ctrl+I)"
            onClick={toggle(() => editor.chain().focus().toggleItalic().run())}
          >
            <i>I</i>
          </button>
          <button
            className={isActive("strike")}
            title="Tachado"
            onClick={toggle(() => editor.chain().focus().toggleStrike().run())}
          >
            <s>S</s>
          </button>
          <button
            className={isActive("code")}
            title="Código inline"
            onClick={toggle(() => editor.chain().focus().toggleCode().run())}
          >
            {"</>"}
          </button>
        </div>

        <span className="mve-sep" />

        <div className="mve-toolbar-group">
          <button
            className={isActive("heading", { level: 1 })}
            title="Título 1"
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          >
            H1
          </button>
          <button
            className={isActive("heading", { level: 2 })}
            title="Título 2"
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          >
            H2
          </button>
          <button
            className={isActive("heading", { level: 3 })}
            title="Título 3"
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          >
            H3
          </button>
        </div>

        <span className="mve-sep" />

        <div className="mve-toolbar-group">
          <button
            className={isActive("bulletList")}
            title="Lista com marcadores"
            onClick={toggle(() => editor.chain().focus().toggleBulletList().run())}
          >
            • —
          </button>
          <button
            className={isActive("orderedList")}
            title="Lista numerada"
            onClick={toggle(() => editor.chain().focus().toggleOrderedList().run())}
          >
            1. —
          </button>
          <button
            className={isActive("blockquote")}
            title="Citação"
            onClick={toggle(() => editor.chain().focus().toggleBlockquote().run())}
          >
            ❝
          </button>
          <button
            className={isActive("codeBlock")}
            title="Bloco de código"
            onClick={toggle(() => editor.chain().focus().toggleCodeBlock().run())}
          >
            {"{ }"}
          </button>
        </div>

        <span className="mve-sep" />

        {/* ── Callouts ─────────────────────────────────────────────── */}
        <div className="mve-toolbar-group">
          <button
            className={isActive("callout", { type: "info" })}
            title="Note (ℹ️)"
            onClick={() => insertCallout("info")}
          >
            ℹ️
          </button>
          <button
            className={isActive("callout", { type: "tip" })}
            title="Tip (💡)"
            onClick={() => insertCallout("tip")}
          >
            💡
          </button>
          <button
            className={isActive("callout", { type: "warning" })}
            title="Warning (⚠️)"
            onClick={() => insertCallout("warning")}
          >
            ⚠️
          </button>
          <button
            className="mve-btn"
            title="Toggle colapsável"
            onClick={() => insertToggle()}
          >
            ▶
          </button>
        </div>

        <span className="mve-sep" />

        <div className="mve-toolbar-group">
          <button
            className={editor.isActive("link") ? "mve-btn mve-btn--active" : "mve-btn"}
            title="Inserir/editar link"
            onClick={openLink}
          >
            🔗
          </button>
          <button
            className="mve-btn"
            title="Inserir imagem por URL"
            onClick={() => { setImageOpen(true); setLinkOpen(false); }}
          >
            🖼
          </button>
          <button
            className="mve-btn"
            title="Enviar imagem do computador"
            onClick={() => fileInputRef.current?.click()}
          >
            ⤒
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) void insertImageFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mve-toolbar-spacer" />

        <div className="mve-toolbar-group">
          <button
            className={previewVisible ? "mve-btn mve-btn--active" : "mve-btn"}
            title="Preview Markdown lado a lado"
            onClick={onTogglePreview}
          >
            ⇆ Preview
          </button>
          <button
            className="mve-btn mve-btn--accent"
            title="Abrir como código (Alt+M)"
            onClick={onToggleSource}
          >
            {"</>"} Source
          </button>
        </div>
      </div>

      {linkOpen && (
        <div className="mve-inline-form">
          <input
            autoFocus
            type="text"
            placeholder="https://exemplo.com (vazio remove o link)"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink();
              if (e.key === "Escape") setLinkOpen(false);
            }}
          />
          <button className="mve-btn" onClick={applyLink}>Aplicar</button>
          <button className="mve-btn" onClick={() => setLinkOpen(false)}>Cancelar</button>
        </div>
      )}

      {imageOpen && (
        <div className="mve-inline-form">
          <input
            autoFocus
            type="text"
            placeholder="URL da imagem (https://...)"
            value={imageValue}
            onChange={(e) => setImageValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyImage();
              if (e.key === "Escape") setImageOpen(false);
            }}
          />
          <button className="mve-btn" onClick={applyImage}>Inserir</button>
          <button className="mve-btn" onClick={() => setImageOpen(false)}>Cancelar</button>
        </div>
      )}

      <div
        className="mve-editor-scroll"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
      >
        <EditorContent editor={editor} className="mve-editor" />
      </div>
    </div>
  );
}
