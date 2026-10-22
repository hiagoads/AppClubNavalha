# Sistema de Dependentes para Fidelidade e Agendamento

Adição de suporte a dependentes (filhos/familiares) vinculados à conta do cliente principal (pai/mãe), permitindo que o pai agende cortes para seus filhos, e o barbeiro/administrador decida na conclusão do serviço se os pontos acumulados serão creditados na conta do pai ou na subconta do dependente.

## Decisões Confirmadas pelo Usuário

> [!IMPORTANT]
> As seguintes definições operacionais foram confirmadas e norteiam toda a arquitetura:
> 1. **Cadastro e Gestão de Dependentes**: Exclusivo para o barbeiro ou administrador no painel administrativo (`AdminDashboard` / `GamificationManager`).
> 2. **Identificação no Agendamento/Fila**: O pai seleciona no painel do cliente (`ClientPanel`) se o corte é para ele ou para qual de seus dependentes cadastrados.
> 3. **Acúmulo e Transferência de Pontos**: Ao concluir o corte na comanda, o administrador tem a opção de direcionar os pontos para a conta do pai ou para o saldo do dependente.

---

## 1. Visão Geral e Conceito do Recurso

Na barbearia, é muito comum pais levarem filhos pequenos ou adolescentes para cortar o cabelo e efetuarem o pagamento. O Sistema de Dependentes resolve esse cenário com precisão:
- **Conta Matriz (Pai/Mãe)**: Mantém o cadastro principal com WhatsApp, e-mail e autenticação.
- **Subcontas de Dependentes (Filhos)**: Vinculadas diretamente à conta matriz, contendo nome do dependente, data de nascimento e saldo de pontos próprio.
- **Flexibilidade na Pontuação**: O admin escolhe na finalização se a pontuação vai para o pai (ajudando o pai a subir de nível no ranking) ou para a subconta do filho (para o filho acumular seus próprios pontos para resgatar cortes infantis ou brindes).

---

## 2. Experiência do Usuário e Fluxos de Interface

### A. Painel Administrativo: Cadastro e Gestão de Dependentes
- **Onde**: Na aba de Clientes / Gestão de Clientes do `GamificationManager` e no painel admin.
- **Ação**: Ao visualizar os dados de um cliente selecionado, haverá uma seção dedicada: **"Dependentes Vinculados"**.
- **Controles**:
  - Botão **"+ Adicionar Dependente"** (Nome completo/apelido e Data de Nascimento opcional).
  - Lista de dependentes cadastrados com seus saldos de pontos atuais.
  - Opções de editar nome ou desvincular dependente.
  - Botão de ajuste rápido de pontos do dependente (caso o admin queira transferir saldo entre pai e filho).

### B. Painel do Cliente: Seleção do Beneficiário no Agendamento
- **Onde**: No modal de agendamento e entrada na fila (`ClientPanel.tsx`).
- **Comportamento**:
  - Se o cliente autenticado tiver dependentes cadastrados pelo admin, é exibido um seletor intuitivo no topo do formulário:
    - `[•] Para mim (Nome do Pai)`
    - `[ ] Filho 1 (Nome do Dependente)`
    - `[ ] Filho 2 (Nome do Dependente)`
  - Ao selecionar um dependente, o campo de nome do agendamento é automaticamente preenchido com o nome do filho, mantendo o telefone do pai para notificações e salvando `dependentId` e `dependentName` na comanda (`Booking`).
  - Se o cliente não tiver dependentes cadastrados, o fluxo padrão permanece limpo e idêntico ao atual.

### C. Finalização do Corte (`CompletingBookingModal.tsx`)
- **Onde**: Ao clicar no botão de concluir corte no painel de atendimento do barbeiro.
- **Comportamento**:
  - Além de selecionar o barbeiro que atendeu, se o corte pertencer a um cliente com dependentes cadastrados (ou foi agendado para um dependente):
    - É exibida a seção **"Destino dos Pontos do Corte"** com valor em pontos (ex: `+5.000 pts`):
      - Opção 1: **Creditar para o Responsável (Pai)**
      - Opção 2: **Creditar para o Dependente (Filho)**
  - O administrador clica na opção desejada e confirma. O sistema credita imediatamente os pontos no destino escolhido e registra a transação.

---

## 3. Arquitetura Técnica e Modelo de Dados

### Diagrama de Relacionamento e Fluxo

```
┌────────────────────────────────────────────────────────┐
│                   Coleção: clients                     │
│  - id: "parent_uid"                                    │
│  - username, firstName, whatsapp, points...            │
│  - dependents: [                                       │
│      { id: "dep_1", name: "Enzo Silva", points: 2500 } │
│    ]                                                   │
└───────────────────────────┬────────────────────────────┘
                            │
               Pai agenda corte do filho
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Coleção: bookings                     │
│  - id: "booking_xyz"                                   │
│  - clientId: "parent_uid"                              │
│  - clientWhatsapp: "(11) 99999-9999" (Pai)             │
│  - clientName: "Enzo Silva (Filho)"                    │
│  - dependentId: "dep_1"                                │
│  - dependentName: "Enzo Silva"                         │
└───────────────────────────┬────────────────────────────┘
                            │
              Barbeiro conclui no Admin
                            ▼
┌────────────────────────────────────────────────────────┐
│             CompletingBookingModal                     │
│  [ Selecionar Barbeiro ]                               │
│  [ Destino dos Pontos: ]                               │
│   (•) Creditar no Pai      ( ) Creditar no Filho       │
└───────────────────────────┬────────────────────────────┘
                            │
            Atualização Atômica no Firestore
                            ▼
           Saldo do Pai OU Saldo do Dependente
```

### Alterações no Modelo de Dados (`src/types/index.ts`)

1. **Nova Interface `ClientDependent`**:
   ```typescript
   export interface ClientDependent {
     id: string;
     name: string;
     dateOfBirth?: string;
     points: number;
     createdAt: string;
   }
   ```

2. **Extensão de `ClientProfile`**:
   ```typescript
   export interface ClientProfile {
     // ...campos existentes...
     dependents?: ClientDependent[];
   }
   ```

3. **Extensão de `Booking`**:
   ```typescript
   export interface Booking {
     // ...campos existentes...
     dependentId?: string;
     dependentName?: string;
     awardedToDependentId?: string;
     awardedDependentName?: string;
   }
   ```

4. **Regras de Segurança (`firestore.rules`)**:
   - Manter a integridade de `dependents` no documento do cliente, permitindo leitura pelo próprio pai e escrita/gerenciamento seguro pelos administradores.

---

## 4. Plano de Execução em Fases

1. **Fase 1: Tipagem e Estrutura**
   - Atualizar `src/types/index.ts` adicionando `ClientDependent` e os novos campos em `Booking` e `ClientProfile`.

2. **Fase 2: Gestão de Dependentes no Painel Administrativo**
   - No `GamificationManager.tsx` e `AdminDashboard.tsx`, adicionar a seção de "Dependentes" na ficha do cliente selecionado.
   - Permitir ao administrador: adicionar novo dependente, remover dependente e editar informações.

3. **Fase 3: Seleção de Dependente no Agendamento (`ClientPanel.tsx`)**
   - No formulário de agendamento/entrada na fila, carregar os dependentes do cliente logado.
   - Exibir o seletor quando houver dependentes cadastrados, preenchendo automaticamente o nome do beneficiário.

4. **Fase 4: Modal de Conclusão e Atribuição de Pontos (`CompletingBookingModal.tsx` & `AdminDashboard.tsx`)**
   - Atualizar `CompletingBookingModal.tsx` para apresentar as opções de destino dos pontos quando o booking estiver vinculado a dependentes.
   - Atualizar a função `confirmCompleteService` no `AdminDashboard.tsx` para processar a pontuação no saldo do dependente ou no saldo do pai conforme a seleção.

5. **Fase 5: Verificação e Testes**
   - Testar o fluxo completo de cadastro de dependente, agendamento em nome do filho e conclusão de serviço com crédito no filho ou no pai.
   - Rodar compilação (`compile_applet`) e linting (`lint_applet`) para garantir build 100% livre de erros.
