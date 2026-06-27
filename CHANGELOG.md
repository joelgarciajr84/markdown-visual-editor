# Changelog

Todas as mudanças relevantes desta extensão são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.0] - 2026-06-22

### Adicionado

- Editor visual WYSIWYG para arquivos `.md` / `.markdown` via
  `CustomTextEditorProvider`, no estilo Notion/Typora.
- Sincronização bidirecional com o arquivo, com proteção contra loops de
  atualização (dedupe por conteúdo).
- Toolbar com negrito, itálico, tachado, código inline, H1/H2/H3, lista com
  marcadores, lista numerada, citação, bloco de código, link e imagem.
- Alternância entre modo visual e modo código (botão `</> Source` e atalho
  `Alt+M`).
- Conversão Markdown ⇄ documento com markdown-it + tiptap-markdown.
- Dark mode automático usando as variáveis de tema do VS Code.
- Preview Markdown lado a lado (opcional).
- Inserção de imagem por URL, upload e drag-and-drop / colar (embutida como
  data URL).
