# Adaptação do tlc-spec-driven ao Trip Splitter

**Data do registro:** 2026-09-18  
**Objetivo:** registrar, de forma objetiva, como o tlc-spec-driven foi adaptado ao Kiro e às necessidades do Trip Splitter.

## Resultado final

O tlc-spec-driven continua sendo a mecânica principal de desenvolvimento. Seu conteúdo foi preservado e adaptado para funcionar diretamente no workspace Kiro, sem criar uma pasta própria da metodologia.

```text
.kiro/
├── references/   # instruções das fases e princípios do método
├── scripts/      # gates e automações determinísticas
└── steering/     # contexto permanente específico do Trip Splitter
```

As estruturas abaixo foram removidas intencionalmente e não devem ser recriadas:

- `.specs/`;
- `tlc-spec-driven/`;
- `.kiro/skills/`;
- `.kiro/specs/`.

## O que foi preservado

A adaptação mantém os elementos centrais do método original:

- Specify com requisitos, escopo, stories, ACs EARS, edge cases e assumptions;
- Discuss para ambiguidades de persistência, estado, UX, API, autenticação e concorrência;
- Design para arquitetura, interfaces, dados, riscos e reutilização;
- Tasks para decomposição atômica e dependências;
- Execute por task, com testes derivados da spec e gate obrigatório;
- Verifier independente, com evidência `file:line`, outcome check e discrimination sensor;
- lessons grounded em sinais reais de validação;
- validação de Conventional Commits;
- princípio de não inventar comportamento nem ampliar escopo silenciosamente.

## Adaptações estruturais

| Área | Como era no tlc-spec-driven original | Como ficou neste projeto |
| --- | --- | --- |
| Local das referências | Diretório próprio da skill | `.kiro/references/` |
| Local dos scripts | Diretório `scripts/` da skill | `.kiro/scripts/` |
| Artefatos de feature | Estrutura fixa `.specs/` | Caminho definido explicitamente por feature/task |
| Memória de projeto | `STATE.md` em diretório padrão | Arquivo de memória definido no contexto da tarefa, quando necessário |
| Lessons | Store em diretório fixo de specs | `.kiro/lessons.json` e `.kiro/LESSONS.md`, criados somente quando o script for usado |
| Execução | Instruções genéricas | Adaptada ao Kiro, Windows/PowerShell e às sessões Vibe/Spec |
| Commits | Regra de commit atômico | Uma task concluída exige exatamente um commit local coerente |

A remoção do diretório padrão de specs evita criar uma segunda metodologia no workspace. Cada feature decide explicitamente onde seus artefatos serão armazenados, e os validadores recebem os caminhos desses artefatos como argumentos.

## Adaptações nos scripts

### `validate_spec.py`

- aceita caminho explícito de `spec.md` ou diretório da feature;
- não presume `.specs` nem `.kiro/specs`;
- pode localizar uma spec única por autodetecção no root informado;
- mantém as verificações de seções obrigatórias, EARS/`SHALL`, assumptions e IDs de requisitos.

### `validate_tasks.py`

- aceita caminho explícito de `tasks.md` ou diretório da feature;
- não presume uma pasta padrão de specs;
- mantém as verificações de granularidade, dependências, diagrama, `Tests` e `Gate`.

### `validate_state.py`

- trabalha com diretório explícito de feature ou autodetecção de diretórios que contenham artefatos de validação;
- não depende de `.kiro/specs`;
- mantém a exigência de relatório Verifier com verdict PASS e evidência `file:line`.

### `lessons.py`

- usa `.kiro/lessons.json` como estado canônico;
- gera `.kiro/LESSONS.md` somente quando houver inicialização ou registro de lesson;
- mantém promoção candidate → confirmed, recorrência, pruning, penalização e self-test;
- lessons só podem ser adicionadas quando existe sinal grounded de validação.

### `check_commit.py`

- mantém a validação de Conventional Commits;
- é executado como `python .kiro/scripts/check_commit.py`;
- valida a mensagem antes de cada commit de task.

## Adaptações para o Kiro

O steering `.kiro/steering/trip-splitter-project.md` conecta o método ao ambiente Kiro e define:

- uso em sessões Vibe e Spec;
- mudança para o fluxo formal quando uma alteração passa de três arquivos ou possui ambiguidade;
- distinção entre Autopilot e Supervised;
- necessidade de manter mudanças revisáveis;
- proibição de push, deploy, banco de produção ou operação destrutiva sem autorização;
- comandos compatíveis com Windows/PowerShell;
- orientação para não iniciar servidores long-running pelo agente.

## Adaptações ao domínio do Trip Splitter

O método foi contextualizado para as invariantes do produto:

- backend Node.js, TypeScript e Express;
- frontend HTML/CSS/JavaScript estático;
- PostgreSQL via Drizzle;
- valores monetários em centavos inteiros;
- moeda atual BRL;
- API sob `/api` e frontend servido pelo mesmo processo;
- saldo calculado como `total pago - total consumido`;
- divisão igualitária com resto distribuído na ordem enviada;
- settlement guloso, sem prometer mínimo teórico absoluto;
- acesso por UUID, sem autenticação no MVP;
- regras de negócio nos services e rotas finas.

## Direção visual incorporada

O steering e `.kiro/references/design.md` passaram a exigir que features de UI sejam:

- clean, claras, bonitas e fáceis de entender;
- orientadas à jornada e à próxima ação do usuário;
- responsivas para celular, tablet e desktop;
- acessíveis em contraste, foco, labels e alvos de toque;
- completas em loading, sucesso, erro, vazio e indisponibilidade;
- baseadas em beleza funcional, sem ornamentação que prejudique a compreensão;
- exclusivamente em modo claro, sem dark mode ou seletor de tema.

Antes de Execute, uma feature de UI deve explicar sua hierarquia visual, jornada, estados, responsividade e acessibilidade.

## Política permanente de tasks e commits

A política foi reforçada no steering, em `.kiro/references/tasks.md`, `.kiro/references/implement.md` e `.kiro/references/validate.md`.

Cada task deve:

1. ser adicionada ao `tasks.md` persistente antes da implementação;
2. começar como `Proposed`;
3. passar para `In Progress` quando começar;
4. conter objetivo, arquivos, dependências, requisito, testes, gate, `Done when` e commit planejado;
5. ser marcada `Done` somente após gate verde e revisão de adequação;
6. receber exatamente um commit local com mensagem Conventional Commit coerente;
7. permanecer no histórico após concluída.

Tasks bloqueadas permanecem registradas com motivo e próximo passo. Novo escopo cria nova task, nunca altera uma task antiga para esconder histórico.

## Comandos adaptados

```powershell
python .kiro/scripts/validate_spec.py <caminho\para\spec.md> --root .
python .kiro/scripts/validate_tasks.py <caminho\para\tasks.md> --root .
python .kiro/scripts/validate_state.py <caminho\para\diretorio-da-feature> --root .
python .kiro/scripts/lessons.py --root . list --status confirmed
python .kiro/scripts/check_commit.py --message "feat(scope): descricao"
```

## Validações realizadas na adaptação

- Estrutura final confirmou apenas `.kiro/references`, `.kiro/scripts` e `.kiro/steering` como núcleo operacional/contextual.
- `.specs`, `tlc-spec-driven`, `.kiro/skills` e `.kiro/specs` não existem.
- Os cinco scripts Python foram analisados sintaticamente com sucesso.
- `lessons.py selftest` passou.
- `check_commit.py` aceitou uma mensagem Conventional Commit de exemplo.
- `validate_state.py` passou quando não havia artefatos de feature para validar.
- Os arquivos alterados passaram em `git diff --check`.

## Limite desta documentação

Este arquivo registra a adaptação do método. Ele não substitui uma spec, um design, um `tasks.md` ou um relatório de validação de uma feature futura. Esses artefatos devem ser criados somente quando a feature exigir e no caminho explicitamente definido para ela.
