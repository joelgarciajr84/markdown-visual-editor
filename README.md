# Markdown Visual Editor

[![Version](https://img.shields.io/visual-studio-marketplace/v/your-name.markdown-visual-editor?label=Marketplace&color=7C5CF0)](https://marketplace.visualstudio.com/items?itemName=your-name.markdown-visual-editor)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/your-name.markdown-visual-editor?color=7C5CF0)](https://marketplace.visualstudio.com/items?itemName=your-name.markdown-visual-editor)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/your-name.markdown-visual-editor?color=7C5CF0)](https://marketplace.visualstudio.com/items?itemName=your-name.markdown-visual-editor)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Edite Markdown como um documento, não como texto. WYSIWYG dentro do VS Code.

Extensão para o **Visual Studio Code** que abre arquivos `.md` / `.markdown` em
um **editor WYSIWYG** (edição visual, no estilo Notion/Typora) em vez do editor
de texto tradicional, mantendo o arquivo Markdown sincronizado em tempo real.

A solução usa apenas APIs oficiais do VS Code (nada de app externo): um
`CustomTextEditorProvider` hospeda um Webview com um editor **TipTap/ProseMirror**,
e a conversão Markdown ⇄ documento é feita com **markdown-it** + **tiptap-markdown**.

<!-- Dica: adicione um screenshot/GIF real do editor aqui. Em repositório
     GitHub público, o vsce reescreve este caminho relativo automaticamente.
![Demonstração do editor visual](media/screenshot.png)
-->


---

## Recursos

- **Edição visual inline** de títulos, parágrafos, **negrito**, _itálico_,
  ~~tachado~~, `código inline`, blocos de código, listas (com marcadores e
  numeradas), citações, links e imagens.
- **Sincronização bidirecional** com o arquivo `.md`:
  - editar no visual atualiza o documento (e o `Ctrl+S` salva normalmente);
  - editar/alterar o arquivo por fora atualiza o editor visual;
  - proteção contra **loops infinitos** de atualização (dedupe por conteúdo).
- **Toggle de modo**: botão `</> Source` (e atalho `Alt+M`) alterna entre o
  editor visual e o editor de código padrão do VS Code.
- **Toolbar**: Negrito, Itálico, Tachado, Código inline, H1/H2/H3, lista com
  marcadores, lista numerada, citação, bloco de código, link e imagem.
- **Dark mode automático**: o webview usa as variáveis de tema do VS Code.
- **Extras**: preview Markdown lado a lado, inserção de imagem por URL, upload de
  imagem e **drag-and-drop / colar** imagens (embutidas como data URL).

---

## Como rodar

Pré-requisitos: Node.js 18+ e VS Code 1.80+.

```bash
npm install
npm run compile      # gera dist/extension.js, dist/webview.js e dist/webview.css
```

Depois, no VS Code:

1. Abra a pasta do projeto.
2. Pressione `F5` (Run Extension) para abrir uma janela de _Extension Development Host_.
3. Nessa nova janela, abra qualquer arquivo `.md`. Ele abrirá no editor visual.

Scripts disponíveis:

| Script              | O que faz                                            |
| ------------------- | ---------------------------------------------------- |
| `npm run compile`   | Build de dev (com sourcemaps) + checagem de tipos    |
| `npm run watch`     | Rebuild contínuo                                     |
| `npm run package`   | Build minificada para publicação + checagem de tipos |
| `npm run typecheck` | Apenas `tsc --noEmit`                                |

Para gerar o `.vsix` (marketplace), instale o `@vscode/vsce` e rode `vsce package`.

---

## Definindo (ou revertendo) como editor padrão

A extensão registra o editor visual com prioridade `default` para `*.md`, então
arquivos Markdown abrem direto no modo visual. Para mudar esse comportamento,
use **"Reopen Editor With…"** na paleta de comandos, ou ajuste o
`settings.json`:

```jsonc
{
  "workbench.editorAssociations": {
    "*.md": "default" // volta a abrir no editor de texto;
    // use "markdownVisualEditor.editor" para forçar o visual
  }
}
```

---

## Arquitetura

```
markdown-visual-editor/
├── src/
│   ├── extension.ts            # CustomTextEditorProvider + comandos + HTML do webview
│   └── webview/
│        ├── index.tsx          # ponto de entrada do React no webview
│        ├── App.tsx            # messaging com a extensão + dedupe anti-loop + preview
│        ├── editor.tsx         # toolbar + área editável (TipTap), link/imagem, drag&drop
│        ├── markdownParser.ts  # Markdown ⇄ editor (markdown-it + tiptap-markdown)
│        ├── schema.ts          # extensões/schema do TipTap (StarterKit, Link, Image, Markdown)
│        └── styles.css         # estilo tipo Notion + variáveis de tema do VS Code
├── esbuild.js                  # bundle da extensão (Node/CJS) e do webview (browser/IIFE)
├── package.json
├── tsconfig.json
└── README.md
```

### Pipeline de conversão

```
Arquivo .md  ──(markdown-it)──►  HTML  ──(TipTap parseHTML)──►  Documento (schema)
Documento (schema)  ──(tiptap-markdown serializer)──►  Markdown válido
```

`schema.ts` define o modelo de documento; `markdownParser.ts` encapsula as duas
direções (`setEditorMarkdown` e `getEditorMarkdown`).

### Comunicação extensão ↔ webview (`postMessage`)

```
extension ──► webview : { type: "init",   text }   // conteúdo inicial do arquivo
extension ──► webview : { type: "update", text }   // arquivo mudou (qualquer origem)
webview   ──► extension: { type: "ready" }          // webview pronto
webview   ──► extension: { type: "edit",  text }    // usuário editou → salvar no doc
webview   ──► extension: { type: "switchToSource" } // botão "Source"
```

### Como o loop infinito é evitado

O webview guarda `lastKnown` (o último Markdown que ele sabe que corresponde ao
documento). Toda edição do usuário é serializada (debounce de 250 ms) e enviada
como `edit`; a extensão aplica um `WorkspaceEdit` no `TextDocument` real. Isso
dispara `onDidChangeTextDocument`, e a extensão devolve um `update` com o mesmo
texto — que o webview reconhece como **eco** (igual a `lastKnown`) e **ignora**.
Alterações externas chegam com texto diferente de `lastKnown` e são aplicadas via
`setContent(..., emitUpdate=false)`, que **não** dispara `onUpdate` — fechando o
ciclo nas duas pontas.

---

## Limitações conhecidas

- Imagens via drag-and-drop/colagem são embutidas como **data URL** (base64) no
  próprio Markdown — simples e portátil, mas aumenta o tamanho do arquivo. Salvar
  a imagem no workspace e referenciá-la por caminho relativo é uma evolução
  natural (mensagem extra extensão→disco).
- O StarterKit não inclui tabelas nem listas de tarefas; é só adicionar as
  extensões correspondentes em `schema.ts` se precisar.

## Publicação no Marketplace

O passo a passo completo (criação de publisher, Personal Access Token, `vsce`,
Open VSX e CI via GitHub Actions) está em **[PUBLISHING.md](PUBLISHING.md)**.

Resumo:

```bash
# 1. Edite o package.json: troque "your-name" pelo seu publisher ID real.
npm install
npm run vsix            # gera o .vsix para teste local
npx vsce login <publisher-id>
npm run publish         # publica a versão atual
# ou: npx vsce publish minor   (bump + publish)
```

## Licença

MIT.
