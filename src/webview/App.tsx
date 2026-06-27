import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import { VisualEditor } from "./editor";
import { buildExtensions } from "./schema";
import {
  getEditorMarkdown,
  setEditorMarkdown,
  markdownToHtml,
} from "./markdownParser";

// ---- API do VS Code (injetada no webview) ---------------------------------

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

// acquireVsCodeApi só pode ser chamado uma vez por webview.
const vscode: VsCodeApi = acquireVsCodeApi();

type ExtensionMessage =
  | { type: "init"; text: string }
  | { type: "update"; text: string };

const DEBOUNCE_MS = 250;

export function App(): JSX.Element {
  const [ready, setReady] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  // "Verdade" mais recente conhecida do documento, do ponto de vista do webview.
  // Usado para deduplicar os ecos das nossas próprias edições e evitar loops.
  const lastKnownRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRef = useRef<boolean>(false);

  const extensions = useMemo(() => buildExtensions(), []);

  const editor = useEditor({
    extensions,
    content: "",
    editorProps: {
      attributes: {
        class: "mve-prose",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Ignora atualizações originadas de setContent programático.
      if (applyingRef.current) {
        return;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        const markdown = getEditorMarkdown(ed);
        if (markdown === lastKnownRef.current) {
          return;
        }
        lastKnownRef.current = markdown;
        if (previewVisible) {
          setPreviewHtml(markdownToHtml(markdown));
        }
        vscode.postMessage({ type: "edit", text: markdown });
      }, DEBOUNCE_MS);
    },
  });

  // Aplica markdown vindo da extensão sem disparar onUpdate (evita loop).
  const applyExternal = (text: string) => {
    if (!editor) {
      return;
    }
    applyingRef.current = true;
    setEditorMarkdown(editor, text);
    lastKnownRef.current = text;
    if (previewVisible) {
      setPreviewHtml(markdownToHtml(text));
    }
    // Libera o flag após o ciclo de transações do ProseMirror.
    setTimeout(() => {
      applyingRef.current = false;
    }, 0);
  };

  // Listener das mensagens da extensão.
  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      switch (message.type) {
        case "init":
          applyExternal(message.text);
          setReady(true);
          break;
        case "update":
          // Eco da nossa própria edição? Ignora.
          if (message.text === lastKnownRef.current) {
            return;
          }
          applyExternal(message.text);
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
    // editor é necessário dentro de applyExternal; recria handler quando pronto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, previewVisible]);

  // Sinaliza para a extensão que o webview está pronto para receber o conteúdo.
  useEffect(() => {
    if (editor) {
      vscode.postMessage({ type: "ready" });
    }
  }, [editor]);

  // Atualiza o preview ao ligá-lo.
  useEffect(() => {
    if (previewVisible && editor) {
      setPreviewHtml(markdownToHtml(getEditorMarkdown(editor)));
    }
  }, [previewVisible, editor]);

  if (!editor) {
    return <div className="mve-loading">Carregando editor…</div>;
  }

  return (
    <div className={previewVisible ? "mve-layout mve-layout--split" : "mve-layout"}>
      <VisualEditor
        editor={editor}
        previewVisible={previewVisible}
        onTogglePreview={() => setPreviewVisible((v) => !v)}
        onToggleSource={() => vscode.postMessage({ type: "switchToSource" })}
      />
      {previewVisible && (
        <div className="mve-preview">
          <div className="mve-preview-label">Markdown renderizado</div>
          <div
            className="mve-prose mve-preview-body"
            // O conteúdo vem de markdown-it sobre o próprio arquivo do usuário.
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}
      {!ready && <div className="mve-loading-overlay">Sincronizando…</div>}
    </div>
  );
}
