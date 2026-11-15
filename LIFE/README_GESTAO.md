# LIFE — gestão de suporte vital

Abra `/lab-training/` e clique em **SUPORTE VITAL · GESTÃO**, no painel superior direito. A simulação começa protegida. **Ativar gestão e consumo** habilita o relógio quando você volta ao jogo. Os indicadores já exibem as reservas reais antes da ativação, não 100% fictícios.

O painel permite explorar, pesquisar, construir/ocupar abrigo, reparar filtro, plantar, colher, reciclar água e descansar. Cada ação mostra duração, insumos reservados, energia necessária e impedimentos. Só uma atividade ocorre por vez. É possível cancelar e liberar reservas não consumidas. Prioridades de 1 a 10 são aplicadas na próxima distribuição de energia. A equipe gerenciada é a equipe agregada da LIFE: andar com o avatar não dispara atividades ou consumo adicional.

## Tempo e proteção do treinamento

Por padrão, 10 segundos de jogo ativo equivalem a um passo de 10 minutos simulados. A gestão congela em pausa, abas ocultas, painel LIFE, briefings, equipamentos, câmera, mapa, inventário, ferramentas e sala de lançamento. Nenhum tempo suspenso é cobrado ao voltar. O adaptador lê `MapEngine.elapsed`, sem alterar movimentação, colisões ou o loop existente. A missão de gestão tem seu próprio resultado; falhas não reiniciam ou bloqueiam o tutorial.

`Nova gestão` substitui somente o save LIFE e retorna ao modo protegido. Reiniciar o tutorial não apaga a gestão. Não há avanço offline. Atividades de descanso não interrompem o consumo dos sistemas.

## Configuração

- `scenario-mars.json`: estoques/capacidades, taxas por passo, atividades, eventos, geração, prioridades, limites e duração. As quantidades são unidades pedagógicas de balanceamento, sem equivalência física implícita.
- `management-config.json`: segundos reais por passo, alerta de fadiga, taxas de trabalho/descanso, demanda do reciclador e identificador/versão do cenário de gestão.
- `limits.resourceWarningFraction` e `limits.co2Warning`: limiares de alerta do cenário.
- Alterações incompatíveis de balanceamento exigem incrementar `scenarioVersion` em `management-config.json`, para rejeitar saves anteriores explicitamente.

`management.js` prepara uma cópia do cenário existente, adicionando o consumidor de energia da reciclagem e as taxas de fadiga de todas as atividades de trabalho. Os padrões do cenário original são preservados. O cenário de gestão tem identidade própria para não confundir seus saves com os da sobrevivência.

## Persistência e arquitetura

`engine.js` é o mesmo núcleo CommonJS usado nos testes e no navegador, encapsulado para evitar variáveis globais acidentais. O navegador fornece explicitamente o cenário carregado por HTTP; não usa `require`. `management.js` controla apenas ativação, relógio e comandos versionados, com um único `MissionEngine` como fonte de verdade. As tendências vêm do livro-razão do último passo, não de previsões inventadas.

O save mantém o formato `MissionEngine.save()` dentro de um envelope que inclui ativação e fração do passo. É salvo em `localStorage` (`nasaJourney.life.management.v1`) após comandos, passos e saída da página. Não salva posição do personagem nem progresso do tutorial. Save incompatível ou ilegível retorna ao modo protegido com aviso. Falhas de armazenamento são exibidas no painel.

`browser-ui.js` liga esse estado ao HUD e ao painel. A API de inspeção `window.lifeManagement.getState()` retorna cópia do estado. As rotas `/life/` expõem somente os três runtimes e dois JSONs autorizados; pipeline, relatórios e testes não são publicados.

## Verificação

Execute `npm test` na raiz e `npm test --prefix LIFE`. Os testes LIFE incluem consumo, limites, prioridades, cultivo, fadiga, descanso, reciclagem dependente de energia, pausa, restauração, determinismo entre taxas de quadros e execução sem globais Node.

O painel de gestão usa textos em português nesta primeira versão. Os demais elementos do jogo mantêm a tradução existente. O cenário tem duração finita e recursos limitados: ao concluir ou interromper, a gestão para e oferece uma nova tentativa.
