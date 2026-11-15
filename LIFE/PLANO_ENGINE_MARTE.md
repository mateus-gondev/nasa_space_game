# Planejamento da engine de sobrevivência espacial

**Status:** base funcional offline do MVP implementada; integração externa ainda não iniciada  
**Cenário inicial:** Marte  
**Público:** crianças de 7 a 12 anos  
**Princípio de design:** toda vantagem exige recursos, tempo ou a renúncia a outra oportunidade; toda consequência importante deve ter uma causa compreensível e uma chance de resposta.

## 1. Visão da engine e limites do MVP

A engine é um núcleo determinístico que recebe comandos, valida decisões, avança o tempo da missão e devolve um estado autoritativo acompanhado de eventos e explicações educativas. Não depende da interface, de conexão externa nem do relógio real.

Separação lógica, sem microserviços:

- **Núcleo de domínio e simulação:** regras, sistemas de sobrevivência, atividades, eventos, comandos e explicações.
- **API de aplicação:** traduz requisições em comandos/consultas e publica resultados do núcleo; não contém regras de simulação.
- **Persistência:** grava snapshots e histórico de comandos aceitos; não decide consequências.
- **Adaptadores externos:** importam referências científicas de forma assíncrona e versionada; nunca são chamados no ciclo de simulação.

O MVP inclui uma missão curta configurável em um cenário versionado de Marte, equipe agregada, habitat, abrigo, equipamentos essenciais, cultivo simples, prioridades de energia, atividades com duração, um evento ambiental, uma falha técnica, comunicação atrasada, saves reproduzíveis e resumo educativo. Começa offline com parâmetros incluídos no pacote.

Ficam fora do MVP: multiplayer, comércio, vários assentamentos, agentes individuais complexos, modelos físicos detalhados, dependência de APIs NASA em tempo de jogo e punição por tempo real offline. Ao desconectar, a missão pausa.

Condições de término distintas:

- **Concluída:** objetivos de missão resolvidos e equipe em condição segura.
- **Interrompida:** segurança abaixo do limite de recuperação ou condição irrecuperável definida pelo cenário; preservar o estado e permitir revisão e nova tentativa.
- **Em andamento:** ainda há decisões ou atividades possíveis.

Pesquisa, uso eficiente de recursos e segurança são dimensões distintas no resumo. Pesquisa nunca compensa indiscriminadamente uma condição insegura da equipe.

## 2. Modelo de domínio

Entidades principais:

- **Missão:** `missionId`, `scenarioId` e versão, `rulesVersion`, relógio lógico, estado terminal, versão otimista do estado, semente e estado do gerador pseudoaleatório.
- **Equipe agregada:** quantidade de pessoas, disponibilidade, fadiga e bem-estar em escalas de cenário. Não modelar perfis individuais no MVP.
- **Local:** habitat, abrigo e região explorável, cada qual com exposição, proteção e capacidade aplicáveis.
- **Recursos:** quantidades com unidade explícita; reservas são separadas do saldo disponível.
- **Sistema:** configuração, estado atual, limites, eficiência e dependências, por exemplo, filtro, gerador, bateria, reciclador e cultivo.
- **Atividade:** plano validado, duração restante, ocupantes, equipamentos e recursos reservados, efeitos contínuos e estado de cancelamento.
- **Evento agendado:** instante lógico, tipo, origem, parâmetros e identificador estável de desempate.
- **Mensagem:** conteúdo enviado, contexto observado no envio, destino, instantes de envio/entrega e estado de canal.
- **Registro de consequência:** causas, efeitos, alternativas conhecidas e princípio educativo.
- **Objetivo:** condição verificável, progresso e resultado; objetivos de segurança não são convertidos em pontos de pesquisa.

Os números são quantidades tipadas por recurso e unidade, não barras intercambiáveis. Parâmetros de cenário distinguem valores de balanceamento de limites pedagógicos. Toda alteração mutável incrementa `stateVersion`.

### Sistemas e relações causais

Os limites numéricos concretos residem no cenário versionado. A engine valida invariantes gerais (quantidades finitas e não negativas, capacidade, reservas e dependências); o cenário define taxas, limiares e margens pedagógicas.

| Sistema | Estado e entradas/saídas | Dependências, limites e falhas | Recuperação e explicação |
|---|---|---|---|
| Energia | Geração, carga/capacidade da bateria, demanda por consumidor e prioridade; entrega energia por consumidor. | Luz, poeira e condição do gerador afetam geração; bateria não excede capacidade; geração insuficiente força cortes por ordem de prioridade. | Reduzir demanda, limpar/reparar gerador, esperar geração ou ajustar prioridades. Mostrar que energia gasta em pesquisa já não está disponível para suporte de vida. |
| Oxigênio | Reserva, produção, consumo da equipe e perdas; libera oxigênio utilizável. | Produção requer água e energia; vazamento consome reserva; reserva insuficiente reduz margem de segurança. | Reparar vazamento, produzir quando houver insumos, reduzir perda e buscar orientação atrasada. Produção não torna o ar respirável se CO₂ estiver alto. |
| Qualidade do ar | CO₂ e capacidade/condição do filtro; filtra CO₂ e altera qualidade. | A equipe produz CO₂; filtragem exige equipamento funcional e energia; excesso é risco mesmo com oxigênio disponível. | Reparar/substituir filtro, priorizar energia e reduzir ocupação da área se o cenário permitir. Explicar a diferença entre oxigênio e remoção de CO₂. |
| Água | Água limpa, água usada, capacidade e perdas; consumo, recuperação e descarte explícitos. | Equipe, cultivo e produção de oxigênio competem por água; reciclagem requer energia e equipamento. | Reciclar, ajustar uso, reparar perdas. Exibir quanto foi recuperado e quanto se perdeu, sem criação implícita de água. |
| Alimentação | Estoque, consumo, culturas em crescimento e rendimento esperado/real. | Equipe consome estoque; cultivo reserva água, energia e tempo antes da colheita; falha pode reduzir rendimento. | Plantar, colher quando madura, proteger/reparar cultivo e planejar reservas. Explicar a espera entre investimento e alimento. |
| Ambiente interno | Temperatura abstrata e capacidade térmica do habitat; aquecimento/resfriamento. | Exterior, isolamento e energia determinam variação; economizar energia pode sair da faixa habitável. | Priorizar controle térmico, reforçar abrigo/isolamento e corrigir a fonte do problema. Mostrar a troca entre economia imediata e conforto/segurança. |
| Radiação | Exposição acumulada da equipe por local e proteção passiva; exposição varia com evento, local e abrigo. | Atividade extraveicular aumenta exposição; proteção depende do abrigo e do cenário. | Transferir equipe ao abrigo e reforçar proteção antes do evento. Alertar com antecedência quando possível. Não inferir dose marciana diretamente de observações terrestres. |
| Equipe | Disponibilidade, fadiga e bem-estar agregados; fornece capacidade de trabalho e consumo. | Trabalho aumenta fadiga; descanso recupera; fadiga reduz eficiência ou bloqueia trabalho no limite. | Descanso e redução de carga. Explicar que esforço extra agora reduz capacidade posterior; não culpar a criança. |
| Equipamentos | Condição, eficiência, desgaste, modos de falha e necessidade de manutenção. | Uso, ambiente e eventos degradam equipamento; baixa condição pode reduzir produção ou causar falha visível. | Reparar com materiais, tempo, equipe e equipamento compatíveis. Mostrar sinais e custo de adiar manutenção. |
| Comunicação | Canal disponível, fila de mensagens, trânsito, processamento e retorno. | Canal indisponível impede entrega no prazo, mas não apaga a mensagem; contexto pode ficar desatualizado. | Reenviar apenas quando apropriado, esperar restauração do canal e decidir com recursos locais. Conselho não cria recursos nem envia suprimentos. |

As relações entre sistemas importam: energia alimenta filtragem, reciclagem, controle térmico e cultivo; água alimenta equipe, cultivo e produção de oxigênio; qualidade do ar e oxigênio são necessidades diferentes; localização e fadiga afetam atividades; equipamentos alteram as taxas dos sistemas.

## 3. Regras, atividades e eventos

### Atividades e comandos

Cada prévia, antes da confirmação, informa requisitos conhecidos, duração, custo/reserva, ocupação, efeitos esperados, riscos observáveis e possibilidade de cancelamento. A prévia não revela eventos aleatórios ocultos. O servidor repete a validação ao aceitar o comando; uma previsão nunca reserva recursos.

| Ação | Pré-condições e reservas/ocupação | Duração e efeitos | Cancelamento, falha e informação prévia |
|---|---|---|---|
| Explorar região | Equipe disponível, equipamento de exploração funcional; reservar equipe/equipamento e provisões. | Duração de ida/atividade/retorno definida pelo cenário; exposição e fadiga durante a saída; conclusão pode revelar recurso ou dado. | Interrompível quando seguro; custo já consumido não é devolvido, reservas não consumidas são liberadas. Prévia mostra janela ambiental e exposição estimada. |
| Pesquisar na base | Equipe e estação disponíveis; reservar estação; consumíveis explicitados pelo projeto. | Duração de pesquisa; ocupa equipe/estação; conclusão gera progresso de pesquisa. | Cancelamento libera o que não foi consumido, progresso parcial é registrado somente se a atividade declarar isso. Falha de energia suspende ou encerra segundo política publicada na prévia. |
| Construir/reforçar abrigo | Local e materiais compatíveis; reservar materiais e equipe/ferramenta. | Trabalho contínuo; conclusão aumenta proteção/capacidade. | Interrompível; material instalado não é recuperado automaticamente. Falhas preservam estado de obra parcial e explicável. |
| Transferir equipe ao abrigo | Rota segura e equipe não ocupada de modo incompatível; sem reserva de materiais. | Duração de deslocamento configurada, não uma hora padrão; muda a localização ao concluir. | Interrompível apenas em pontos seguros; prévia mostra a exposição da rota e destino. |
| Reparar equipamento | Falha ou desgaste reparável; peça/material, técnico e ferramenta reservados. | Duração baseada no reparo; equipamento pode ficar indisponível durante o trabalho. | Cancelamento mantém condição já recuperada apenas se etapas parciais forem explicitamente modeladas; peça consumida não retorna. |
| Ajustar prioridades de energia | Prioridades válidas, consumidores conhecidos, estado atual ainda vigente. | Comando de configuração imediato, sem duração artificial; distribuição recalculada na próxima fronteira de tick. | Sem cancelamento temporal; alteração rejeitada integralmente se inválida. A prévia mostra consumidores que poderão perder energia. |
| Plantar/colher | Plantar exige semente, espaço, água e recipiente; colher exige cultura madura e equipe disponível. | Plantar inicia ciclo de crescimento; colheita dura conforme cenário e adiciona rendimento observado ao estoque. | Plantio interrompido não produz cultura; cancelamento de colheita não duplica nem perde produto já contabilizado. |
| Reciclar recursos | Lote elegível, capacidade, equipamento e energia disponíveis; reservar lote e capacidade. | Duração e rendimento versionados; transfere água usada para limpa e registra perdas/resíduos. | Cancelamento mantém material no estado correspondente ao estágio; sem dupla reciclagem. Prévia informa rendimento esperado e descarte. |
| Descansar | Equipe disponível no local seguro. | Duração escolhida/configurada; reduz fadiga e pode melhorar bem-estar. | Cancelável; recuperação é proporcional ao tempo efetivamente concluído. Não ignora uma ameaça ativa. |
| Consultar controle da missão | Sem pré-condições de recurso ou ocupação. | Consulta imediata aos registros conhecidos; não altera relógio nem estado. | Não cancelável nem sujeita a falhas de simulação. |

Configurações imediatas (por exemplo, prioridade) não ocupam equipe. Trabalhos reservam recursos atomicamente ao início. Recursos reservados não podem ser prometidos por outra atividade; saldo disponível é saldo total menos reservas. Atividades que disputam o mesmo membro, equipamento, espaço ou lote são rejeitadas com motivo legível. Comando inválido não aplica efeitos parciais.

### Eventos

Eventos roteirizados de tutorial são determinados pelo cenário e ensinam sinais e respostas; eventos aleatórios usam gerador com semente, elegibilidade e limites de frequência declarados; registros científicos importados são contexto educativo ou inspiração editorial, nunca gatilhos de jogo ao vivo no MVP.

| Evento e origem | Ativação, aviso e duração | Efeito, mitigação e encerramento |
|---|---|---|
| Poeira reduz geração (tutorial/ambiental) | Após condição de cenário; alerta de queda de geração; duração definida no cenário. | Reduz geração solar; ajustar prioridades, poupar carga ou limpar equipamento; encerra no prazo ou quando a condição de poeira cessa. |
| Alerta de atividade solar (roteirizado ou cenário) | Agenda com antecedência e apresenta janela estimada. | Eleva risco externo do cenário; transferir equipe ao abrigo e suspender exploração; encerra após janela definida. Não traduz automaticamente dado terrestre em dose na superfície marciana. |
| Exposição elevada (derivado de cenário) | Limite de exposição local/equipe atingido; indicador e mensagem preventivos. | Exposição acumulada sobe; abrigo e menor permanência externa mitigam; encerra ao mudar de local ou condição. |
| Vazamento de oxigênio (falha técnica) | Falha elegível por condição do equipamento; sinal de perda antes de uma crise, quando possível; persiste até reparo. | Consome oxigênio por tick; isolar/reparar e priorizar recursos; encerra ao reparar ou substituir componente. |
| Falha de filtragem (falha técnica) | Desgaste/condição abaixo do limiar; aviso de eficiência reduzida. | CO₂ aumenta mais depressa; reparar filtro e garantir energia; encerra quando fluxo seguro for restaurado. |
| Problema no cultivo (falha técnica) | Cultura em crescimento com condição disparadora; sinais de rendimento em risco. | Reduz rendimento ou prolonga crescimento; dedicar manutenção/recursos; encerra por reparo ou perda explícita do lote. |
| Oportunidade de pesquisa (roteirizado/aleatório controlado) | Janela temporária com aviso e prazo. | Pesquisa oferece benefício, consumindo equipe/energia/tempo; aceitar ou renunciar; encerra ao terminar janela. |
| Interrupção de comunicação (ambiental/roteirizado) | Canal indisponível com aviso de status. | Impede entrega enquanto durar; fila permanece pendente; usar plano local e entregar mensagens válidas após restauração, respeitando prazo. |

Falhas críticas devem emitir indícios proporcionais à severidade quando o cenário permitir, dar tempo e alternativas de resposta, e registrar a mitigação tentada. Nenhuma falha pode ser introduzida silenciosamente como punição inevitável. Cenários de tutorial são repetíveis; aleatoriedade deve permitir investigação via semente.

### Cadeias causais de exemplo

1. Poeira reduz geração solar → prioridades protegem habitat e filtragem → cultivo recebe menos energia → crescimento atrasa → estoque alimentar cai mais tarde. A alternativa é reservar energia ao cultivo, aceitando menor margem em outro consumidor não essencial.
2. Filtro se desgasta → CO₂ aumenta mesmo com oxigênio suficiente → alerta mostra qualidade do ar → equipe redireciona energia e repara filtro → a reserva de energia para pesquisa diminui.
3. Equipe explora por mais tempo → fadiga e exposição sobem → trabalho de reparo demora ou fica bloqueado → equipamento continua ineficiente → descanso/retorno precoce sacrifica a oportunidade de exploração, mas recupera capacidade.

## 4. Ordem de execução da simulação

Proposta: passos fixos de **10 minutos de missão** no MVP. Essa granularidade deixa visíveis atividades, consumo e alertas sem exigir milhares de passos por dia; atividades curtas e transições ocorrem em fronteiras de tick. Se o balanceamento pedir mais detalhe, a granularidade muda em uma nova versão das regras e dos cenários, não silenciosamente.

Ordem determinística em cada tick:

1. Validar o comando externo contra `stateVersion`, estado terminal, regras, pré-condições e idempotência; aceitar tudo ou rejeitar sem mutação.
2. Agendar efeitos imediatos de configuração para esta fronteira, sem avançar atividades.
3. Aplicar eventos agendados cujo instante seja o início do tick, ordenados por instante, prioridade do cenário e `eventId`.
4. Calcular demanda e distribuição de energia em ordem explícita de prioridade; empate é resolvido por identificador estável do consumidor.
5. Aplicar produção, consumo, perdas e transferências de recursos em ordem fixa. Cada sistema emite um ledger de entradas, saídas e descartes.
6. Aplicar efeitos contínuos de ambiente, exposição, fadiga e atividades em execução.
7. Concluir atividades cujo tempo restante chegou a zero; consumir recursos reservados conforme contrato e gerar resultados.
8. Avaliar gatilhos de eventos futuros e objetivos; gerar alertas e explicações sem retroagir efeitos.
9. Avançar relógio e `stateVersion`; gravar snapshot quando a política exigir.

O fluxo dentro do tick usa uma visão consistente de início do tick para evitar que um recurso criado por um sistema seja gasto por outro de forma dependente da ordem acidental. Transferências permitidas entre fases têm ordenação declarada na versão das regras. Eventos coincidentes usam a mesma ordenação estável. Arredondamento é definido por recurso; não usar ponto flutuante não determinístico para saldos.

Pausar não executa ticks. Acelerar executa N ticks sequenciais com o mesmo algoritmo e mesmos checkpoints. Lote interrompe em erros e limites de segurança; não pula eventos, atividade, verificações ou efeitos contínuos. Assim, avanço acelerado e normal com mesmos comandos e semente produzem o mesmo estado e histórico. Offline pausa; não existe progresso por relógio de parede.

## 5. Contratos conceituais de comandos, consultas e eventos

Todo comando inclui `commandId` único, `missionId`, `expectedStateVersion`, versão do contrato e dados tipados da ação. O comando de criação inclui `scenarioId`/versão e semente fornecida ou gerada e persistida. Respostas incluem resultado, versão resultante e eventos novos. Rejeições incluem código estável, motivo compreensível e nenhum efeito parcial.

| Operação | Dados/resultado conceitual |
|---|---|
| Criar missão | Cenário e versão, parâmetros permitidos e semente; retorna estado inicial e IDs. |
| Consultar estado | Missão e versão observada; retorna recursos, sistemas, equipe, atividades, objetivos e versão. |
| Consultar ações disponíveis | Estado atual; retorna requisitos, custos/duração conhecidos e motivos de bloqueio por ação. |
| Iniciar atividade | `activityType`, parâmetros, alvos; valida, reserva e retorna atividade ou bloqueios. |
| Cancelar atividade | `activityId` e motivo opcional; retorna custo já aplicado, reservas liberadas e efeitos do cancelamento. |
| Alterar prioridades | Vetor de prioridades/consumidores válido; aplica na fronteira indicada e informa cortes previstos. |
| Avançar tempo | Quantidade de ticks limitada por política; retorna eventos, transições e versão final. Não aceita horário real. |
| Consultar eventos/mensagens | Cursor ou intervalo lógico; retorna apenas informações já observadas, entregues ou alertáveis. |
| Estimar consequências | Ação hipotética e estado-version observado; retorna pressupostos, faixa/risco, alternativas e incerteza, sem reservar recursos nem revelar eventos ocultos futuros. |
| Salvar/restaurar | Snapshot identificado e versão de cenário/regras; valida integridade e migração explícita antes de restaurar. |
| Resumo educativo | Objetivos, decisões e registros conhecidos; devolve o que aconteceu, contribuições, recursos afetados, alternativa disponível e princípio demonstrado. |

**Idempotência:** guardar a chave `commandId`, hash do conteúdo e resultado. Repetir a mesma chave e conteúdo retorna o mesmo resultado sem aplicar custos duas vezes; mesma chave com conteúdo diferente é conflito. Manter a chave pelo período de vida do save/histórico.

**Concorrência:** comando com `expectedStateVersion` desatualizada falha como conflito e devolve a versão corrente; cliente consulta novamente. Operações de iniciar atividade reservam recursos e ocupações em uma transação atômica. Repetir comandos não pode reservar novamente.

**Explicações estruturadas:** `whatHappened`, `contributingDecisionOrCondition`, `affectedResources`, `availableAlternative`, `principle`, severidade e referências aos registros de causa. Texto adequado à idade, sem culpa. Uma estimativa explicita hipóteses e incerteza, não promete resultado exato quando existe aleatoriedade.

Eventos de domínio incluem, no mínimo, `ActivityStarted`, `ActivityCancelled`, `ActivityCompleted`, `ResourceProduced`, `ResourceConsumed`, `SystemDegraded`, `SystemRecovered`, `EnvironmentalEventStarted/Ended`, `MessageSent/Delivered`, `ObjectiveChanged` e `MissionCompleted/Interrupted`. Cada evento tem ID, instante lógico, versão do esquema, origem e correlação com comando/atividade; consumidores não devem inferir causalidade apenas pela ordem de chegada.

### Comunicação com a Terra

Um pedido passa por estados distintos: **criado/enviado**, **em trânsito de ida**, **aguardando processamento**, **resposta em trânsito de volta**, **aguardando canal**, **entregue**. Tempo de ida, processamento e volta vem do cenário e é independente de transporte físico de carga. Interrupção do canal adia entrega, nunca antecipa prazo nem perde silenciosamente a mensagem.

O pedido armazena o snapshot das informações incluídas no envio. A resposta é elaborada com esse snapshot, então pode estar desatualizada ao chegar; a explicação indica a idade da informação. Conselho sugere opções e não cria recursos, repara sistemas nem envia suprimentos.

## 6. Persistência, determinismo e reprodução

Salvar um snapshot serializável com: estado de cada sistema e recurso, reservas, atividades e progresso, eventos e mensagens pendentes, relógio lógico, objetivos, semente e estado completo do gerador pseudoaleatório, versões de regras/cenário/contrato, `stateVersion` e posição do histórico. Identificadores usados para desempate também são persistidos.

Manter histórico append-only dos comandos **aceitos** e resultados, além de snapshots periódicos; isso é suficiente para reproduzir problemas sem impor event sourcing completo. Para reproduzir, restaurar o snapshot anterior e reaplicar comandos na ordem, com versões e semente originais; comparar hashes de estado por tick para localizar divergência. Comandos rejeitados podem ser registrados para diagnóstico, mas não alteram a simulação.

Save de versão antiga: primeiro tentar um migrador explícito e testado para a versão corrente. Se não existir migração segura, abrir em modo somente leitura/replay compatível ou solicitar reinício; nunca reinterpretar parâmetros antigos silenciosamente. O conteúdo original do save não deve ser sobrescrito antes do sucesso da migração. Mudanças que alterem resultado incrementam `rulesVersion` ou `scenarioVersion`.

## 7. Política de dados científicos

Quatro categorias claramente identificadas:

1. **Observados:** registros ou medidas publicadas pela fonte.
2. **Derivados de modelos:** resultado de transformação/modelo, com método e limitações.
3. **Balanceamento:** números escolhidos para tornar o jogo compreensível e viável.
4. **Simplificações pedagógicas:** abstrações deliberadas que não representam previsão científica.

O adaptador NASA roda fora do backend de simulação, podendo ser ferramenta de autoria/importação ou atualização de pacote. Para cada dataset incorporado, persistir fonte e URL/referência, identificador do registro, data da observação, data da consulta, unidade original, unidade no jogo, transformação, versão do adaptador/modelo e revisão editorial. Atribuição e licença são verificadas antes de redistribuir.

- **DONKI:** adequado como referência de contexto sobre eventos de clima espacial e para material educativo, após avaliar tipo de registro, cobertura temporal e significado das medidas. Eventos observados perto da Terra não determinam automaticamente dose na superfície de Marte. Sem modelo de propagação, ambiente e blindagem marcianos adequado, não usar o registro como dose ou efeito numérico da missão; qualquer evento de jogo é adaptação identificada.
- **OSDR:** portal de referências e dados de biologia espacial potencialmente útil para contextualizar experimentos e perguntas educativas. Avaliar cada estudo quanto a organismo, ambiente, protocolo, amostra, limites e comparabilidade; resultados biológicos não são taxas diretas para uma equipe humana em habitat marciano.

O cenário offline incluído é a fonte de balanceamento do MVP e possui versão/hash. Indisponibilidade, mudança de API ou divergência de dados não pausa a missão nem altera parâmetros. Uma importação nova precisa passar por validação de esquema, unidade, proveniência e revisão humana antes de gerar nova versão do pacote.

## 8. Backlog incremental e critérios de aceite

As dependências são explícitas; cada etapa seguinte usa a anterior.

| Ordem | Entrega e dependência | Critérios de aceite |
|---|---|---|
| 1 | Modelo de domínio, unidades, cenário Marte versionado e invariantes. | Estados serializáveis; unidades explícitas; valores dentro de limites; nenhuma dependência da interface ou rede. |
| 2 | Relógio fixo, fila ordenada, RNG com semente e avanço em lote. Depende de 1. | Mesmo comando/semente repete hashes por tick; execução em lote equivale a ticks individuais; pause não progride. |
| 3 | Livro-razão de recursos, energia/prioridades, oxigênio, CO₂, água, alimentos/cultivo, temperatura, radiação, equipe e equipamentos. Depende de 1–2. | Nunca há saldo negativo nem armazenamento acima da capacidade; perdas e descartes explícitos; energia insuficiente respeita prioridade e empate determinístico. |
| 4 | Atividades, reservas, incompatibilidades e cancelamento. Depende de 3. | Ações inválidas não têm mutação parcial; duplicação de uso/recurso é rejeitada; cancelamento libera apenas recursos não consumidos e respeita progresso declarado. |
| 5 | Eventos roteirizados e falhas com avisos, mitigação e explicações. Depende de 2–4. | Eventos simultâneos têm ordem estável; falhas geram sinais e alternativas; toda consequência importante referencia suas causas. |
| 6 | Contratos de aplicação, idempotência, concorrência, consultas e estimativas. Depende de 4–5. | Repetição da mesma chave não duplica efeito; chave conflitante e versão antiga são rejeitadas; consulta/estimativa não muta estado nem revela evento oculto. |
| 7 | Comunicação com trânsito, resposta atrasada e indisponibilidade de canal. Depende de 2 e 6. | Mensagem nunca entrega antes do prazo; contexto da resposta corresponde ao envio; canal indisponível adia sem apagar. |
| 8 | Snapshot, restauração, histórico e migração/replay. Depende de 1–7. | Restaurar mantém atividades/eventos/mensagens pendentes; replay reproduz hash; save incompatível não é migrado silenciosamente. |
| 9 | Cenário completo, estratégia viável, resumo educativo e balanceamento. Depende de 1–8. | Há ao menos uma estratégia segura para concluir; missão interrompida permite revisão e nova tentativa; relatório separa segurança, pesquisa e recursos. |
| 10 | Avaliação da adequação de datasets NASA e pacote de proveniência opcional. Depende de 9; não bloqueia missão. | Cenário offline continua suficiente; importação registra metadados/unidades/transformação e exige aprovação; nenhum registro DONKI vira dose marciana sem modelo adequado. |

### Matriz de cenários de validação

- **Conservação e limites:** executar ciclos de produção, consumo, reciclagem, descarte, armazenamento cheio e geração excedente; conferir livro-razão e que não há criação ou saldo negativo.
- **Competição por energia:** durante poeira, comparar prioridade para suporte de vida versus cultivo/pesquisa; confirmar cortes, consequências atrasadas e explicação coerente.
- **Ar e oxigênio distintos:** manter oxigênio positivo e interromper filtro; CO₂ deve subir, aviso ser emitido e reparo/energia permitir recuperação.
- **Água e plantio:** consumir água em reciclagem, oxigênio e cultivo; confirmar reservas atômicas e que colheita exige maturação/recursos prévios.
- **Cancelamento e falha:** cancelar construção ou reparo em diferentes etapas; saldo/reservas/progresso não duplicam nem retornam material já usado.
- **Concorrência e idempotência:** enviar duas vezes o mesmo início e enviar dois inícios concorrentes para um único recurso/equipamento; apenas um efeito/reserva ocorre.
- **Comunicação:** comparar mensagem enviada em dois estados e canal indisponível; nenhuma entrega antes de ida + processamento + volta, e aconselhamento permanece baseado no snapshot enviado.
- **Determinismo e restauração:** executar a mesma sequência normal, acelerada e restaurada com semente igual; estado e eventos coincidem.
- **Cadeias educativas:** poeira → bateria/prioridades → cultivo → alimentação; filtro → CO₂ → energia/reparo; exploração → fadiga/exposição → capacidade de reparo. Cada resultado deve ter sinal, alternativa e explicação.
- **Viabilidade e segurança:** executar estratégia conservadora com abrigo, manutenção, descanso, prioridades e reservas; concluir sem pontuação de pesquisa compensar risco de equipe.

## 9. Exemplo narrado de missão

Uma equipe inicia a missão em Marte com água, oxigênio, alimento, energia armazenada, cultivo em andamento e uma reserva ainda não reforçada. O cenário informa que uma janela de poeira pode reduzir a geração solar. Antes da janela, a equipe escolhe entre pesquisar, reforçar o abrigo ou descansar; cada opção mostra custo e tempo.

A equipe começa uma pesquisa curta, mas a poeira chega enquanto a atividade está em curso. O evento tem aviso e duração. No passo seguinte, a geração cai. A distribuição ainda mantém habitat e filtragem; a prioridade inferior deixa menos energia para o cultivo. A pesquisa continua apenas se sua política de energia permitir. O resumo não diz que houve azar: mostra que a geração caiu, a prioridade escolhida protegeu sistemas essenciais e o cultivo perdeu energia.

O jogador pode ajustar prioridade imediatamente, cancelar a pesquisa ou manter a configuração. Decide cancelar: o tempo e o consumível já usados não voltam, a equipe e a estação são liberadas e a energia disponível passa a sustentar o cultivo. A colheita não acontece instantaneamente, porque a cultura precisa completar seu ciclo.

Enquanto isso, chega um alerta de desgaste no filtro. Oxigênio ainda está disponível, mas a qualidade do ar começa a piorar. A equipe consulta a missão, transfere uma pessoa para reparar o filtro, usando peça e tempo; outra opção seria pedir orientação à Terra. O pedido leva tempo de ida, processamento e volta. A resposta chega baseada no relatório enviado antes da piora e avisa que pode estar desatualizada. Ela sugere verificar o filtro, mas não o conserta.

A equipe usa a peça e a energia poupada, restaura a filtragem e registra a manutenção. Durante o descanso, a fadiga diminui. Quando a poeira termina, a geração se recupera; mais tarde o cultivo amadurece e uma colheita recompõe parte do alimento. O resumo final separa: segurança preservada, pesquisa adiada, água e energia gastas, causa da queda de produção e alternativa disponível. Se o jogador tivesse escolhido outra prioridade, a missão mostraria uma consequência diferente, não uma nota moral.

## 10. Decisões em aberto e recomendações

1. **Valores iniciais de taxas e limites:** calibrar com testes de estratégia e linguagem etária; manter todos em cenário versionado. Não alegar realismo físico para valores de balanceamento.
2. **Exatidão da unidade temporal:** adotar dez minutos por tick no MVP; testar se a quantidade de decisões é compreensível em uma missão curta. Alterar somente junto a nova versão de regras.
3. **Previsibilidade de eventos aleatórios:** recomendar eventos aleatórios com sinais e janela de resposta; semente fixa por missão reproduzível, mas a interface não precisa expor a semente à criança.
4. **Falha irreversível e encerramento:** preferir condições recuperáveis e avisos escalonados; tornar interrupção terminal apenas quando o cenário provar que não há resposta viável, sempre preservando replay.
5. **Precisão de exposição e clima espacial:** usar categorias pedagógicas locais no MVP. Dados de clima espacial servem como contexto, não como dose de radiação marciana sem modelo validado.
6. **Granularidade de equipe:** usar disponibilidade/fadiga agregadas agora; adicionar membros individuais somente se um objetivo educativo justificar o custo e as regras de privacidade.
7. **Persistência e formato de save:** selecionar armazenamento conforme implantação, mas preservar contrato serializável, migração explícita e exportação/importação versionada; não acoplar o núcleo a um banco.
8. **Conteúdo educativo:** revisar textos com educadores e especialistas, usar linguagem de causa e alternativa, evitar culpa e evitar falsa precisão científica.

**Hipótese geral:** quando faltarem dados, o cenário escolhe valores simples e identificados como balanceamento/simplificação. A missão deve permanecer jogável, offline, explicável e reproduzível sem depender de serviços NASA.

## Estado do protótipo

O núcleo executável está em `engine.js` e recebe regras do cenário versionado em `scenario-mars.json`. Implementa relógio fixo, prioridades de energia, água/reciclagem, oxigênio, CO2, temperatura simplificada, exposição, abrigo, cultivo, atividades, falha de filtro, tempestade de poeira, comunicação atrasada, explicações, livro-razão de recursos, saves/replay e comandos com versão/idempotência.

O protótipo usa somente Node.js e não faz chamadas NASA, não importa dados científicos, não inclui persistência em banco nem servidor Express ligado à engine. As referências OSDR-1010, CSA e Mars Trek são metadados/contexto; nenhum dado científico delas virou taxa numérica. Para executar os testes, na pasta `LIFE`, use `npm test`.

O repositório [`18juba/data`](https://github.com/18juba/data) está clonado em `data-pipeline/repo/` e é a fonte local do container Python separado. `repo/data/` é montado para persistir os dados e resultados fora do container. A engine ainda não consome os dados produzidos por esse pipeline.
