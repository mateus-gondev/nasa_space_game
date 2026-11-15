# Container do pipeline de dados

O código completo de [`18juba/data`](https://github.com/18juba/data) está
clonado em `LIFE/data-pipeline/repo`. O container usa essa cópia local, incluindo
`config/reference_catalog.json`, no commit `ee68ce6bc5307c212bbcf9031306b2a4d056682c`,
e instala as dependências com Python 3.13.

O diretório `repo/data` é montado em `/app/data`, então dados existentes e novos
resultados ficam disponíveis no clone e persistem fora do container. O
repositório upstream ignora essa pasta no Git. `.git`, o ambiente Python local
e arquivos `.env` não são copiados para a imagem; nenhuma chave é incluída no
build.

Importante: esse commit público contém os scripts e o catálogo de referências,
mas não contém os arquivos brutos baixados. O `.gitignore` upstream exclui
`data/`, `.runtime/` e `work/`; por isso o clone cria `repo/data` vazio. Para
preenchê-lo, execute a coleta explicitamente escolhendo os conjuntos. O
histórico de vento pode ocupar vários GB, então não é baixado durante o build
nem na inicialização padrão do container.

Execute os comandos abaixo na raiz de `NASAJOURNEY`:

```powershell
docker compose -f LIFE\data-pipeline\compose.yaml build
docker compose -f LIFE\data-pipeline\compose.yaml run --rm data-pipeline
```

O segundo comando mostra a ajuda e não inicia downloads. Para executar apenas
um conjunto de dados:

```powershell
docker compose -f LIFE\data-pipeline\compose.yaml run --rm data-pipeline --datasets dust_opacity
```

Para processar um cache já existente sem acessar a rede:

```powershell
docker compose -f LIFE\data-pipeline\compose.yaml run --rm data-pipeline --offline
```

Use `--offline` somente depois de uma coleta que tenha criado os planos e o
cache em `output`. A coleta completa pode baixar vários gigabytes; escolha os
conjuntos explicitamente antes de executá-la.

Para abrir um shell dentro do container sem iniciar a coleta:

```powershell
docker compose -f LIFE\data-pipeline\compose.yaml run --rm --entrypoint sh data-pipeline
```

Para atualizar o código clonado, execute
`git -C LIFE\data-pipeline\repo pull` e reconstrua a imagem. A engine Node em
`LIFE` permanece separada e ainda não consome este pipeline.
