import * as vscode from "vscode";

/**
 * Mantém a URI do último editor visual que esteve ativo, para que o comando
 * de "toggle" saiba qual documento reabrir como código quando o editor ativo
 * for um Webview (nesse caso `vscode.window.activeTextEditor` é `undefined`).
 */
let lastActiveVisualUri: vscode.Uri | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Registra o editor customizado para arquivos .md / .markdown.
  context.subscriptions.push(MarkdownVisualEditorProvider.register(context));

  // Abrir o documento ativo no editor visual.
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "markdownVisualEditor.openAsVisual",
      async (uri?: vscode.Uri) => {
        const target = uri ?? vscode.window.activeTextEditor?.document.uri;
        if (!target) {
          vscode.window.showInformationMessage(
            "Abra um arquivo .md para usar o Markdown Visual Editor."
          );
          return;
        }
        await vscode.commands.executeCommand(
          "vscode.openWith",
          target,
          MarkdownVisualEditorProvider.viewType
        );
      }
    )
  );

  // Abrir o documento como código (editor de texto padrão do VS Code).
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "markdownVisualEditor.openAsSource",
      async (uri?: vscode.Uri) => {
        const target =
          uri ?? lastActiveVisualUri ?? vscode.window.activeTextEditor?.document.uri;
        if (!target) {
          return;
        }
        await vscode.commands.executeCommand("vscode.openWith", target, "default");
      }
    )
  );

  // Alternar entre visual e código com base no editor ativo.
  context.subscriptions.push(
    vscode.commands.registerCommand("markdownVisualEditor.toggleMode", async () => {
      const textEditor = vscode.window.activeTextEditor;
      const isMarkdownText =
        textEditor &&
        /\.(md|markdown)$/i.test(textEditor.document.uri.path) &&
        textEditor.document.uri.scheme !== "output";

      if (isMarkdownText) {
        // Um editor de texto markdown está ativo -> abrir visual.
        await vscode.commands.executeCommand(
          "vscode.openWith",
          textEditor!.document.uri,
          MarkdownVisualEditorProvider.viewType
        );
      } else if (lastActiveVisualUri) {
        // O editor visual está ativo -> abrir como código.
        await vscode.commands.executeCommand(
          "vscode.openWith",
          lastActiveVisualUri,
          "default"
        );
      }
    })
  );
}

export function deactivate(): void {
  // Nada a limpar manualmente: tudo está em context.subscriptions.
}

/** Mensagens enviadas do webview para a extensão. */
type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "edit"; text: string }
  | { type: "switchToSource" }
  | { type: "info"; message: string };

/** Mensagens enviadas da extensão para o webview. */
type ExtensionToWebviewMessage =
  | { type: "init"; text: string }
  | { type: "update"; text: string };

class MarkdownVisualEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "markdownVisualEditor.editor";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownVisualEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      MarkdownVisualEditorProvider.viewType,
      provider,
      {
        // Mantém o webview vivo quando a aba fica em segundo plano,
        // evitando recarregar o estado do editor a cada troca de aba.
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webviewPanel.webview;

    // Permite carregar recursos do workspace inteiro (necessário para imagens locais).
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const docParent = vscode.Uri.joinPath(document.uri, "..");

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
        workspaceFolder?.uri ?? docParent,
      ],
    };

    webview.html = this.getHtmlForWebview(webview);

    // Guarda o mapeamento webviewUri → src original para reversão ao salvar.
    const uriMap = new Map<string, string>();

    // Converte caminhos relativos de imagens para URIs do webview (para exibição).
    const toWebviewMarkdown = (text: string): string =>
      text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        if (/^https?:\/\/|^data:|^vscode-webview-resource:/.test(src)) {
          return match;
        }
        try {
          const fileUri = vscode.Uri.joinPath(docParent, src);
          const wvUri = webview.asWebviewUri(fileUri).toString();
          uriMap.set(wvUri, src);
          return `![${alt}](${wvUri})`;
        } catch {
          return match;
        }
      });

    // Reverte URIs do webview de volta para os caminhos relativos originais.
    const fromWebviewMarkdown = (text: string): string =>
      text.replace(/!\[([^\]]*)\]\((vscode-webview-resource:[^)]+)\)/g,
        (match, alt, wvSrc) => {
          const original = uriMap.get(wvSrc);
          return original ? `![${alt}](${original})` : match;
        }
      );

    // Rastreia qual documento está ativo neste editor visual.
    const trackActive = () => {
      if (webviewPanel.active) {
        lastActiveVisualUri = document.uri;
      }
    };
    trackActive();
    webviewPanel.onDidChangeViewState(trackActive);

    const post = (message: ExtensionToWebviewMessage) => {
      // postMessage retorna uma Promise; ignoramos o resultado de propósito.
      void webview.postMessage(message);
    };

    // Quando o documento muda (por qualquer origem), reenvia para o webview.
    // O webview deduplica os "ecos" das próprias edições (ver editor.tsx).
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          post({ type: "update", text: toWebviewMarkdown(document.getText()) });
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
      switch (message.type) {
        case "ready":
          post({ type: "init", text: toWebviewMarkdown(document.getText()) });
          return;
        case "edit":
          await this.updateTextDocument(document, fromWebviewMarkdown(message.text));
          return;
        case "switchToSource":
          await vscode.commands.executeCommand(
            "vscode.openWith",
            document.uri,
            "default"
          );
          return;
        case "info":
          vscode.window.showInformationMessage(message.message);
          return;
      }
    });
  }

  /**
   * Aplica o novo conteúdo markdown ao TextDocument real. Como editamos o
   * documento (e não escrevemos no disco diretamente), o Ctrl+S do VS Code
   * salva normalmente e o histórico de undo/redo continua funcionando.
   */
  private updateTextDocument(
    document: vscode.TextDocument,
    newText: string
  ): Thenable<boolean> {
    if (document.getText() === newText) {
      return Promise.resolve(true);
    }
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      newText
    );
    return vscode.workspace.applyEdit(edit);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css")
    );
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Markdown Visual Editor</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
