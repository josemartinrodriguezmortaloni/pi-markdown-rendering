// Real diagrams used by the tests. CLASS_LR and SEQUENCE_COMPLETE come from a real Pi answer.

export const FLOWCHART_LR = `flowchart LR
    Request[Incoming HTTP request] --> Auth[Authentication middleware]
    Auth --> Router[Route resolution]
    Router --> Handler[Use case handler]
    Handler --> Store[(Persistent storage)]`;

export const SEQUENCE_LONG_MESSAGES = `sequenceDiagram
    participant Client
    participant Gateway
    participant Billing
    Client->>Gateway: POST /subscriptions/renew with the stored payment method
    Gateway->>Billing: charge(customerId, planId, idempotencyKey)
    Billing-->>Client: 200 OK with the renewed subscription and the next invoice date`;

export const SEQUENCE_EIGHT_PARTICIPANTS = `sequenceDiagram
    participant A as Browser
    participant B as Gateway
    participant C as Auth
    participant D as Orders
    participant E as Inventory
    participant F as Payments
    participant G as Ledger
    participant H as Mailer
    A->>B: checkout
    B->>C: verify
    B->>D: create
    D->>E: reserve
    D->>F: charge
    F->>G: record
    D->>H: confirm`;

export const SMALL_FLOWCHART = `flowchart LR
    A --> B`;

export const CLASS_LR = `classDiagram
    direction LR
    class ChecklistModule
    class SharedModule {
      AttachmentService
      ReportGenerationService
      ReportCacheService
      PdfDocumentRenderer
    }
    class UserManagementModule {
      UserRepository
      Permissions
    }
    class ChecklistTargetsIntegrationModule {
      VehicleChecklistTargetResolver
      DocumentValidityChecklistEvaluator
      DocumentEvidenceResourceResolver
    }
    class ChecklistDeviationsIntegrationModule {
      ChecklistDeviationsRegistrar
    }
    class FleetManagementModule
    class DocumentsModule
    class AssetRegistryModule
    class DeviationsModule
    ChecklistModule ..> SharedModule : imports
    ChecklistModule ..> UserManagementModule : imports
    ChecklistTargetsIntegrationModule ..> ChecklistModule : registra en registries
    ChecklistTargetsIntegrationModule ..> FleetManagementModule
    ChecklistTargetsIntegrationModule ..> DocumentsModule
    ChecklistTargetsIntegrationModule ..> AssetRegistryModule
    ChecklistDeviationsIntegrationModule ..> ChecklistModule : CompletionRegistry
    ChecklistDeviationsIntegrationModule ..> DeviationsModule : DeviationRecorder`;

export const SEQUENCE_COMPLETE = `sequenceDiagram
    participant FE as Frontend
    participant UC as CompleteUseCase
    participant TX as Transaction
    participant CR as CompletionRegistry
    participant DV as DeviationRecorder
    FE->>UC: POST /:id/complete
    UC->>UC: load execution + template
    UC->>UC: targetName (fallback si falla)
    UC->>TX: run()
    TX->>TX: execution.complete() + save
    TX->>CR: notify(FinishedExecution)
    CR->>DV: record(OBSERVED/NOT_ACCEPTABLE)
    Note over TX,DV: si falla el desvío, rollback
    TX-->>FE: 200 FINISHED`;

export const fenced = (src: string): string => `\`\`\`mermaid\n${src}\n\`\`\`\n`;
