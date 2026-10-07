# Radar Mobile

Página para ver suas posições da Hyperliquid no celular. **Somente leitura**: ela só consulta a API pública da Hyperliquid pelo endereço que você digitar; nunca pede chave privada e não envia ordens. O endereço fica guardado só no celular.

## Publicar grátis no GitHub Pages (uma vez, ~10 min)

1. Crie uma conta em **github.com** (se ainda não tiver).
2. Clique em **+ → New repository**. Nome: `radar-mobile`. Marque **Public**. Clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file** (ou **Add file → Upload files**).
4. Clique em **choose your files**, selecione **todos os 12 arquivos** desta pasta (Ctrl+A) e clique em **Abrir**. Não há subpastas. Clique em **Commit changes**.
5. Vá em **Settings → Pages**. Em *Branch*, escolha **main** e **/ (root)**. Clique em **Save**.
6. Espere 1–2 minutos. O endereço aparece no topo da página de Settings → Pages, algo como `https://SEU-USUARIO.github.io/radar-mobile/`.

> O repositório é público, mas ele **não contém nenhum dado seu**: só o código da página. O endereço da carteira você digita no celular e ele fica só lá.

## Instalar no celular

- **Android (Chrome):** abra o endereço → menu **⋮** → **Adicionar à tela inicial** (ou **Instalar app**).
- **iPhone (Safari):** abra o endereço → botão **Compartilhar** → **Adicionar à Tela de Início**.

Abra pelo ícone, digite o endereço da carteira (0x…) e toque em **Ver posições**.

## Padrão vinculado (opcional)

Em **Ajustes → Importar backup**, escolha o arquivo `radar-backup-ultimo.json` (fica em `Downloads/Radar Grafico/backups/` no computador; mande para o celular pelo Drive, e-mail ou WhatsApp). A página guarda só os padrões vinculados (nome, tempo gráfico e origem), nada mais.

## Atualizar a página depois

Quando eu mandar uma versão nova, repita o passo 3–4 (Upload files) substituindo os arquivos. O celular pega a versão nova na próxima abertura.
