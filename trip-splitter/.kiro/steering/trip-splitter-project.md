# Trip Splitter — contexto obrigatório do workspace Kiro

O método principal deste projeto é o tlc-spec-driven, adaptado ao Kiro pelos arquivos `.kiro/references/` e `.kiro/scripts/`. Essas duas pastas são a fonte operacional do processo: as referências orientam Specify, Discuss, Design, Tasks, Execute, Verifier, memória e lessons; os scripts executam os gates determinísticos. Não criar uma pasta adicional do tlc-spec-driven dentro de `.kiro`.

As pastas `.specs/`, `tlc-spec-driven/`, `.kiro/skills/` e `.kiro/specs/` foram removidas intencionalmente. Não recriá-las. Artefatos específicos de uma feature, quando necessários, devem ser criados em um caminho explicitamente decidido para aquela tarefa, sem transformar este workspace em uma segunda metodologia.

## Missão do produto

O Trip Splitter ajuda grupos de viagem a registrar despesas, calcular saldos e executar uma quitação compartilhável. O MVP atual é a rachadinha: uma viagem em BRL, participantes, despesas com divisão igualitária, saldos e transferências de quitação.

## Como aplicar o tlc-spec-driven

1. **Specify sempre:** problema, objetivo, fora de escopo, stories, ACs EARS com IDs, edge cases e assumptions.
2. **Discuss quando houver gray area:** persistência, estado, chamadas externas, autenticação, concorrência ou transição de estado. Registrar decisões no artefato de contexto da própria tarefa quando ele existir.
3. **Design para Large/Complex:** carregar as decisões relevantes do projeto e lessons confirmadas antes; descrever arquitetura, interfaces, dados, erros e riscos.
4. **Tasks para Large/Complex ou mais de cinco passos:** tarefas atômicas, dependências, arquivos, requisitos, testes, gates e done-when.
5. **Execute por tarefa:** implementar somente o necessário, rodar o gate e revisar se os testes afirmam o resultado da spec.
6. **Verifier sempre:** checar cada AC por evidência `file:line` + asserção, executar gate, aplicar 1–3 mutações em scratch isolado e registrar o resultado no caminho de validação definido para a tarefa.
7. **Lessons somente com sinal real:** usar `.kiro/scripts/lessons.py` para registrar gaps, mutações sobreviventes, desvios ou falhas de gate; não editar lessons manualmente.

A complexidade determina a profundidade: mudanças pequenas podem ser especificadas e verificadas inline; mudanças multi-componente devem produzir os artefatos de Specify/Discuss/Design/Tasks/Validation em um local explícito e aprovado no contexto da tarefa.

## Integração com sessões do Kiro

- **Vibe:** exploração e mudanças pequenas; se surgirem mais de três arquivos, ambiguidade ou dependências, parar e aplicar o fluxo formal.
- **Spec:** mudanças multi-componente, persistência, comportamento de usuário ou risco de regressão.
- **Autopilot:** pode executar o ciclo autorizado até o fim e chamar o Verifier independente.
- **Supervised:** manter cada mudança revisável; não presumir aprovação de hunks, commits ou ações externas.
- Não criar push, deploy, alteração de banco de produção ou operação destrutiva sem autorização explícita do usuário. Para código local, cada task concluída deve seguir a Política permanente de tasks e commits.

## Invariantes do produto

- Backend: Node.js + TypeScript + Express; frontend: HTML/CSS/JS estático.
- Persistência: PostgreSQL via Drizzle; migração atual é DDL idempotente no boot.
- Dinheiro: centavos inteiros; moeda atual BRL.
- API: prefixo `/api`; frontend e API são servidos pelo mesmo processo.
- Saldo: `total pago - total consumido`; soma esperada é zero.
- Split: igualitário; resto distribuído aos primeiros participantes na ordem enviada.
- Settlement: algoritmo guloso; não prometer mínimo teórico absoluto.
- Acesso: sem autenticação no MVP; UUID dá acesso à viagem.
- Services possuem regras de negócio; rotas devem permanecer finas.

## Gates no Windows/PowerShell

```powershell
npm run build
npm test
python .kiro/scripts/validate_spec.py <caminho\para\spec.md> --root .
python .kiro/scripts/validate_tasks.py <caminho\para\tasks.md> --root .
python .kiro/scripts/validate_state.py <caminho\para\diretorio-da-feature> --root .
python .kiro/scripts/lessons.py --root . list --status confirmed
python .kiro/scripts/check_commit.py --message "feat(scope): descricao"
```

Os validadores devem receber caminhos explícitos para os artefatos; eles não presumem uma pasta de specs do projeto. Não iniciar servidores long-running pelo agente; orientar o usuário a executar `npm --prefix backend run dev` manualmente quando necessário.

## Regras de edição

- Não inventar comportamento não presente no código ou nos requisitos; declarar incerteza e abrir Discuss.
- Ler as referências necessárias em `.kiro/references/` antes de agir na fase correspondente.
- Não criar uma segunda metodologia nem recriar os diretórios removidos.
- Atualizar docs permanentes quando o contrato/arquitetura/dados/testes mudarem.
- Não instalar dependências ou mudar infraestrutura sem explicitar impacto.
- Não criar push, deploy, alteração de banco de produção ou operação destrutiva sem autorização explícita do usuário. Cada task concluída deve receber seu commit local conforme a Política permanente de tasks e commits; a mensagem deve passar pelo `check_commit.py`.

## Direção visual e experiência do usuário

Toda interface do Trip Splitter deve priorizar uma experiência **clean, clara, bonita e fácil de entender**. O visual deve transmitir simplicidade, confiança e organização, reduzindo a carga mental do usuário em vez de apenas exibir funcionalidades.

Princípios obrigatórios para novas telas e fluxos:

- **Modo claro como padrão permanente:** a plataforma não terá modo escuro nem seletor de tema, salvo decisão explícita futura do usuário.
- **Clareza antes de ornamentação:** hierarquia visual evidente, textos curtos, labels compreensíveis, ações principais destacadas e linguagem acessível para pessoas não técnicas.
- **Clean e consistente:** poucos elementos por vez, espaçamento confortável, tipografia legível, cores com propósito e componentes visuais reutilizáveis.
- **UX orientada ao fluxo:** o usuário deve entender onde está, o que pode fazer, o que aconteceu e qual é o próximo passo sem precisar descobrir a interface por tentativa e erro.
- **Feedback completo:** projetar estados de sucesso, erro, loading, vazio, indisponibilidade e validação; nunca deixar uma ação sem resposta perceptível.
- **Acessibilidade e legibilidade:** contraste suficiente, foco visível, alvos de toque adequados, navegação compreensível e informação não dependente apenas de cor.
- **Responsividade:** a experiência deve funcionar bem em celular, tablet e desktop, priorizando o contexto real de uso durante uma viagem.
- **Beleza funcional:** estética deve reforçar compreensão e confiança; não adicionar efeitos, animações ou elementos decorativos que prejudiquem desempenho ou entendimento.

Antes de implementar uma feature de UI, o Design deve explicar como esses princípios serão aplicados, quais estados serão exibidos e como o fluxo será compreendido por um usuário não técnico.

## Política permanente de tasks e commits

Toda unidade de trabalho deve existir em um registro persistente `tasks.md` da feature antes da implementação. O caminho desse arquivo é definido explicitamente quando a feature começa; não usar a lista temporária da sessão como substituto.

Ciclo obrigatório de cada task:

1. **Adicionar:** criar a task com ID único, título, objetivo, arquivos, requisito, dependências, testes, gate, critério `Done when` e mensagem de commit planejada. O status inicial é `Proposed`.
2. **Iniciar:** mudar para `In Progress` somente quando as dependências estiverem resolvidas e a implementação começar.
3. **Executar:** alterar apenas o escopo declarado, escrever/atualizar os testes da task e rodar o gate definido.
4. **Concluir:** após gate verde e revisão de adequação, marcar a task como `Done` no próprio `tasks.md`, mantendo o histórico e a rastreabilidade.
5. **Commitar:** criar exatamente um commit local por task concluída, com mensagem Conventional Commit coerente com o que foi feito. O commit inclui a implementação, seus testes e a atualização de status da task.

Tasks concluídas nunca devem ser apagadas, reescritas para parecerem pendentes ou removidas para “limpar” o arquivo. Novas necessidades viram novas tasks com novos IDs; uma task bloqueada permanece registrada como `Blocked` com motivo e próximo passo. O histórico de tasks é parte da memória operacional do projeto.

Mesmo em features pequenas, quando a fase formal de Tasks for pulada, o Execute deve adicionar as unidades de trabalho ao `tasks.md` persistente antes de editar código. A lista temporária do Kiro serve apenas para acompanhamento da sessão; o `tasks.md` é a fonte durável.
