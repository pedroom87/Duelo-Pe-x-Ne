# Decisions

## Duel Legacy e Duelo Pe x Ne

Decisao: Duel Legacy e o produto; Duelo Pe x Ne e o campeonato atual.

Motivo: separar plataforma de conjunto de dados evita amarrar arquitetura, rotas e documentacao a um unico campeonato.

## Fonte historica validada

Decisao: planilha original, JSON extraido e partidas conferidas sao fontes historicas validadas.

Motivo: a homologacao precisa comparar dados do site contra uma origem rastreavel e revisada.

## Eventos posteriores ao JSON

Decisao: eventos posteriores a cobertura do JSON nao devem virar falsos positivos contra o historico oficial.

Motivo: um evento valido no site pode ser posterior ao ultimo jogo coberto pela fonte historica extraida.

## Rankings por identidade

Decisao: rankings devem melhorar por correcao de identidade, alias e vinculo de eventos, nao por edicao direta do ranking.

Motivo: rankings derivados preservam rastreabilidade e evitam ajuste manual sem origem.

## Confirmacao para correcoes sensiveis

Decisao: toda correcao sensivel exige confirmacao manual.

Motivo: mesclagens, reatribuicoes e exclusoes podem afetar historico e rankings.

## Aliases nao sobrescritos automaticamente

Decisao: aliases conflitantes nao podem ser sobrescritos automaticamente.

Motivo: o mesmo texto normalizado pode apontar para identidades diferentes; a decisao precisa de contexto humano.

## Centro de Curadoria separado de Jogadores

Decisao: o Centro de Curadoria fica separado da tela comum de Jogadores.

Motivo: curadoria e operacao administrativa; a lista de jogadores deve continuar simples para uso cotidiano.

## Sem mudanca de banco sem autorizacao

Decisao: migrations e alteracoes de schema exigem autorizacao explicita.

Motivo: o historico e a confiabilidade dos rankings dependem de mudancas rastreaveis e revisadas.

## Sistema sugere; administrador decide

Decisao: o Assistente de Curadoria pode sugerir jogadores candidatos, mas nenhuma sugestao e aplicada automaticamente.

Motivo: divergencias sem destino unico dependem de julgamento humano. A pontuacao ajuda a ordenar candidatos, mas a escrita continua exigindo selecao e confirmacao explicita do administrador.
