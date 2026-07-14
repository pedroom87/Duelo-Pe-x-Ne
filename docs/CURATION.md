# Curation

O Centro de Curadoria fica em `/curadoria` e existe para homologar dados historicos sem esconder a origem das divergencias.

## Saude dos Dados

Resumo geral de confiabilidade dos rankings.

Contadores principais:

- total de eventos;
- eventos com `player_id`;
- eventos sem `player_id`;
- percentual de eventos vinculados;
- total de jogadores;
- total de aliases;
- conflitos de alias;
- grupos de jogadores possivelmente duplicados.

E uma area de leitura e triagem. Acoes relacionadas aparecem nas ferramentas especificas.

## Reconciliacao Segura

Mostra eventos sem jogador vinculado e tenta encontrar destinos provaveis por nome normalizado, lado e aliases.

Contadores:

- eventos sem vinculo;
- eventos sem vinculo em partidas conferidas;
- eventos sem vinculo em partidas nao conferidas;
- casos seguros;
- casos ambiguos;
- casos sem candidato.

A reatribuicao so deve ocorrer quando houver exatamente um destino confirmado e exige confirmacao manual. A acao altera `events.player_id`.

## Cobertura da Importacao

Compara o historico esperado do JSON com os eventos existentes no banco.

Interprete como auditoria de importacao:

- eventos esperados;
- eventos encontrados;
- eventos faltantes;
- eventos com `source_cell`;
- diferencas por jogador;
- partidas possivelmente incompletas.

Ferramenta de leitura para priorizacao. Qualquer importacao ou correcao derivada precisa de tarefa propria e confirmacao.

## Validador Oficial

Compara gols do historico oficial com gols do site por jogador.

No codigo atual, o validador separa:

- gols no historico oficial;
- gols do site dentro da cobertura do JSON;
- gols posteriores ao historico;
- gols sem `match_number` confiavel;
- jogadores comparados;
- divergencias reais.

Status:

- `OK`: historico e site dentro da cobertura batem.
- `Divergente`: existe diferenca dentro da cobertura historica.
- `Somente posterior`: nao ha gol comparavel dentro da cobertura, mas existem gols posteriores.

Publicacao dessa regra temporal em producao: a confirmar, pois a ultima versao publicada confirmada nesta tarefa e `0.9.8`.

Na Sprint `0.9.10`, divergencias reais podem ter correcao guiada quando todas as condicoes forem verdadeiras:

- a linha esta `Divergente`;
- a diferenca homologavel e positiva, ou seja, o site tem menos gols dentro da cobertura;
- existe exatamente um jogador destino valido;
- existe ao menos um evento concreto para atualizar ou um alias concreto para criar;
- o usuario confirma explicitamente a previa.

A previa deve mostrar jogador atual, jogador destino, alias a criar, eventos que terao `events.player_id` atualizado, partidas envolvidas, eventos em partidas conferidas e impacto esperado.

Antes de aplicar, o sistema revalida no banco que:

- o destino ainda existe;
- os eventos ainda possuem o `player_id` esperado;
- o alias nao passou a pertencer a outro jogador.

A escrita permitida pela correcao guiada e limitada a:

- `events.player_id`, apenas nos eventos selecionados;
- `player_aliases`, apenas para criar alias ainda inexistente e sem conflito.

Se qualquer condicao falhar, a acao permanece bloqueada como `Revisao manual necessaria`.

Na Sprint `0.9.11`, quando nao houver destino unico automatico, o Validador mostra `Sugestoes de destino`.

As sugestoes sao deterministicas e consideram:

- nome normalizado identico;
- alias normalizado identico;
- mesmo lado;
- similaridade de nome;
- conflito de lado;
- conflito claro de identidade.

Cada candidato mostra `player_id`, nome, lado, aliases, score/confianca, motivos positivos e alertas. A lista e ordenada por score decrescente.

O sistema nunca seleciona candidato automaticamente. Em empate ou candidatos muito proximos, mostra aviso de ambiguidade. O administrador precisa clicar em `Selecionar`, revisar a previa segura e confirmar explicitamente antes de qualquer escrita.

## Curadoria de Identidades

Agrupa problemas de identidade:

- jogadores duplicados;
- aliases conflitantes;
- aliases orfaos ou inconsistentes;
- eventos provaveis para jogadores sem vinculo;
- mesclagens e reatribuicoes.

Acoes sensiveis, como mesclar jogadores, reatribuir alias ou reatribuir eventos, exigem confirmacao manual.

## Investigador de Eventos

Mostra divergencias ate o evento individual.

Campos exibidos:

- `event_id`;
- `event_type`;
- partida;
- `player_name_raw`;
- `player_id`;
- `source_cell`;
- `side`;
- partida conferida;
- diagnostico;
- causa provavel.

Diagnosticos conhecidos:

- alias ausente;
- identidade;
- evento excedente;
- evento faltante;
- jogador errado;
- sem diagnostico.

Ferramenta somente leitura na Sprint em que foi criada. Nao deve corrigir, excluir ou reatribuir.

## Revisao de Eventos sem Equivalente

Fila de revisao para eventos do banco sem par exato no historico oficial.

Classificacoes:

- `Sem equivalente no historico`: a partida existe no JSON, mas nao ha evento compativel por partida, tipo, lado e nome normalizado.
- `Sem source_cell, mas com equivalente provavel`: `source_cell` esta vazio no banco, mas existe evento compativel por partida, tipo, lado e nome normalizado.
- `Evento posterior/manual provavel`: a partida e posterior a cobertura conhecida do JSON.
- `Indeterminado`: falta evidencia para classificar com seguranca.

Contadores:

- total para revisao;
- sem equivalente;
- equivalentes provaveis;
- manuais/posteriores provaveis;
- indeterminados.

O badge critico deve contar somente `Sem equivalente` e `Indeterminado`. Equivalentes provaveis nao devem ser tratados como erro critico.

Ferramenta somente leitura. A acao `Ver no Investigador` navega para o contexto do evento; nao corrige dados.

## Confirmacoes

Exigem confirmacao manual:

- mesclar jogadores;
- reatribuir eventos;
- reatribuir aliases;
- excluir jogador quando o fluxo permitir;
- qualquer correcao sensivel de identidade.

Somente leitura:

- Investigador de Eventos;
- Revisao de Eventos sem Equivalente;
- Cobertura da Importacao enquanto nao houver tarefa de escrita;
- Validador Oficial quando usado apenas para homologacao.
