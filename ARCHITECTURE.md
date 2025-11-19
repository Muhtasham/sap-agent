# SAP Agent Architecture

Comprehensive diagrams showing the multi-agent architecture, MCP tools, and data flow.

## 1. Agent Overview & Responsibilities

```mermaid
graph TB
    subgraph "User Interface"
        CLI[CLI Tool]
        API[HTTP API]
        SDK[Programmatic SDK]
    end

    subgraph "Orchestrator Layer"
        ORCH[quoteEndpointAgent<br/>Orchestrator<br/>Tools: Task, Read, Write, Edit, Bash, Grep, Glob]
    end

    subgraph "Specialized Agents"
        CTX[sapContextAgent<br/>Context Analyzer<br/>Tools: Read, Write, Grep, Glob<br/>MCP: parse_sap_table, extract_sap_customizations]

        CODE[abapCodeGenerator<br/>Code Generator<br/>Tools: Read, Write, Edit, Grep<br/>MCP: validate_abap_syntax, generate_odata_metadata]

        TEST[testGenerator<br/>Test Generator<br/>Tools: Read, Write]

        DEPLOY[deploymentGuide<br/>Deployment Guide<br/>Tools: Read, Write]
    end

    subgraph "MCP Tool Server"
        MCP[MCP Server<br/>SAP-specific tools]
    end

    subgraph "File System"
        INPUT[Input<br/>Config Files]
        OUTPUT[Output<br/>Generated Code]
        TEMPLATES[Templates<br/>ABAP/OData]
    end

    CLI --> ORCH
    API --> ORCH
    SDK --> ORCH

    ORCH -->|Delegate| CTX
    ORCH -->|Delegate| CODE
    ORCH -->|Delegate| TEST
    ORCH -->|Delegate| DEPLOY

    CTX -.->|Uses| MCP
    CODE -.->|Uses| MCP

    CTX -->|Read| INPUT
    CTX -->|Write| OUTPUT

    CODE -->|Read| TEMPLATES
    CODE -->|Read| OUTPUT
    CODE -->|Write| OUTPUT

    TEST -->|Read| OUTPUT
    TEST -->|Write| OUTPUT

    DEPLOY -->|Read| OUTPUT
    DEPLOY -->|Write| OUTPUT

    style ORCH fill:#e1f5ff,stroke:#0066cc,stroke-width:3px
    style CTX fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style CODE fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style TEST fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style DEPLOY fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style MCP fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
```

## 2. MCP Tools & Agent Mapping

```mermaid
graph LR
    subgraph "Agents"
        CTX[Context Analyzer<br/>sapContextAgent]
        CODE[Code Generator<br/>abapCodeGenerator]
    end

    subgraph "MCP Server"
        MCP[MCP Tool Server<br/>Port: stdio]
    end

    subgraph "SAP Domain Tools"
        T1[parse_sap_table<br/>Parse DDIC structures]
        T2[extract_sap_customizations<br/>Extract Z*/Y* fields]
        T3[validate_abap_syntax<br/>Validate ABAP code]
        T4[generate_odata_metadata<br/>Generate OData XML]
    end

    subgraph "Parsers & Validators"
        P1[DDIC Parser<br/>src/parsers/ddic-parser.ts]
        P2[Custom Parser<br/>src/parsers/customization-parser.ts]
        P3[ABAP Validator<br/>src/validators/abap-syntax.ts]
        P4[OData Validator<br/>src/validators/odata-validator.ts]
    end

    CTX -->|Calls| T1
    CTX -->|Calls| T2
    CODE -->|Calls| T3
    CODE -->|Calls| T4

    MCP --> T1
    MCP --> T2
    MCP --> T3
    MCP --> T4

    T1 --> P1
    T2 --> P2
    T3 --> P3
    T4 --> P4

    style CTX fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style CODE fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style MCP fill:#f3e5f5,stroke:#9c27b0,stroke-width:3px
    style T1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style T2 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style T3 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style T4 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
```

## 3. Complete Generation Workflow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Orch as Orchestrator<br/>quoteEndpointAgent
    participant CTX as Context Analyzer<br/>sapContextAgent
    participant MCP1 as MCP: extract_sap_customizations
    participant MCP2 as MCP: parse_sap_table
    participant CODE as Code Generator<br/>abapCodeGenerator
    participant MCP3 as MCP: validate_abap_syntax
    participant MCP4 as MCP: generate_odata_metadata
    participant TEST as Test Generator<br/>testGenerator
    participant DEPLOY as Deployment Guide<br/>deploymentGuide
    participant FS as File System

    User->>CLI: sap-generate quote --customer acme ...
    CLI->>Orch: Start generation workflow

    Note over Orch: Phase 1: Analysis
    Orch->>CTX: Delegate: Analyze SAP configuration
    CTX->>FS: Read config files
    CTX->>MCP1: extract_sap_customizations(config)
    MCP1-->>CTX: Custom fields: ZZPRIORITY, ZZREFERRAL
    CTX->>MCP2: parse_sap_table(VBAK)
    MCP2-->>CTX: Table structure with fields
    CTX->>FS: Write analysis.json
    CTX-->>Orch: ✅ Analysis complete

    Note over Orch: Phase 2: Code Generation
    Orch->>CODE: Delegate: Generate ABAP code
    CODE->>FS: Read templates/*.abap
    CODE->>FS: Read analysis.json
    CODE->>CODE: Generate Function Module
    CODE->>MCP3: validate_abap_syntax(function_module)
    MCP3-->>CODE: ✅ Valid ABAP
    CODE->>FS: Write Z_CREATE_QUOTE_ACME.abap

    CODE->>CODE: Generate OData Service
    CODE->>MCP4: generate_odata_metadata(entity_def)
    MCP4-->>CODE: ✅ Valid OData XML
    CODE->>FS: Write ZACME_QUOTE_SRV.xml

    CODE->>CODE: Generate DPC_EXT Class
    CODE->>MCP3: validate_abap_syntax(dpc_class)
    MCP3-->>CODE: ✅ Valid ABAP
    CODE->>FS: Write ZCL_ACME_QUOTE_DPC_EXT.abap

    CODE->>CODE: Generate MPC_EXT Class
    CODE->>MCP3: validate_abap_syntax(mpc_class)
    MCP3-->>CODE: ✅ Valid ABAP
    CODE->>FS: Write ZCL_ACME_QUOTE_MPC_EXT.abap
    CODE-->>Orch: ✅ Code generation complete

    Note over Orch: Phase 3: Test Generation
    Orch->>TEST: Delegate: Create test suites
    TEST->>FS: Read analysis.json
    TEST->>FS: Read generated ABAP files
    TEST->>FS: Write tests/Z_CREATE_QUOTE_ACME_TEST.abap
    TEST->>FS: Write tests/integration_tests.md
    TEST->>FS: Write tests/acme_quote_api_tests.json
    TEST-->>Orch: ✅ Tests generated

    Note over Orch: Phase 4: Documentation
    Orch->>DEPLOY: Delegate: Create deployment guide
    DEPLOY->>FS: Read analysis.json
    DEPLOY->>FS: Read generated files
    DEPLOY->>FS: Write DEPLOYMENT_GUIDE.md
    DEPLOY-->>Orch: ✅ Guide created

    Orch-->>CLI: ✅ Generation complete
    CLI-->>User: Output: ./output/acme/<br/>9 files generated

    Note over User,FS: Total: analysis.json + 4 ABAP files + 3 test files + 1 guide
```

## 4. Data Flow & File Dependencies

```mermaid
graph TD
    subgraph "Input"
        I1[VBAK_structure.txt]
        I2[custom_fields.txt]
        I3[CLI Parameters<br/>customer, sap_version, fields]
    end

    subgraph "Phase 1: Analysis"
        CTX[Context Analyzer]
        A1[analysis.json]
    end

    subgraph "Phase 2: Code Generation"
        CODE[Code Generator]
        T1[templates/function-module.abap]
        T2[templates/odata-service.xml]
        T3[templates/dpc-class.abap]
        T4[templates/mpc-class.abap]

        O1[Z_CREATE_QUOTE_*.abap]
        O2[Z*_QUOTE_SRV.xml]
        O3[ZCL_*_DPC_EXT.abap]
        O4[ZCL_*_MPC_EXT.abap]
    end

    subgraph "Phase 3: Testing"
        TEST[Test Generator]
        O5[tests/Z_CREATE_QUOTE_*_TEST.abap]
        O6[tests/integration_tests.md]
        O7[tests/*_quote_api_tests.json]
    end

    subgraph "Phase 4: Documentation"
        DEPLOY[Deployment Guide]
        O8[DEPLOYMENT_GUIDE.md]
    end

    I1 --> CTX
    I2 --> CTX
    I3 --> CTX
    CTX --> A1

    A1 --> CODE
    T1 --> CODE
    T2 --> CODE
    T3 --> CODE
    T4 --> CODE

    CODE --> O1
    CODE --> O2
    CODE --> O3
    CODE --> O4

    A1 --> TEST
    O1 --> TEST
    O2 --> TEST
    O3 --> TEST
    O4 --> TEST

    TEST --> O5
    TEST --> O6
    TEST --> O7

    A1 --> DEPLOY
    O1 --> DEPLOY
    O2 --> DEPLOY

    DEPLOY --> O8

    style CTX fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style CODE fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style TEST fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style DEPLOY fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    style A1 fill:#e1f5ff,stroke:#0066cc,stroke-width:2px
    style O1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style O2 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style O3 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style O4 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style O5 fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style O6 fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style O7 fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style O8 fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
```

## 5. MCP Tool Details

```mermaid
graph TB
    subgraph "MCP Server Process"
        SERVER[MCP Server<br/>@modelcontextprotocol/sdk<br/>StdioServerTransport]
    end

    subgraph "Tool: parse_sap_table"
        T1[parse_sap_table]
        T1_IN[Input: Table config text]
        T1_PROC[DDIC Parser<br/>Extracts fields, types, lengths]
        T1_OUT[Output: Structured table definition]

        T1_IN --> T1
        T1 --> T1_PROC
        T1_PROC --> T1_OUT
    end

    subgraph "Tool: extract_sap_customizations"
        T2[extract_sap_customizations]
        T2_IN[Input: Config files]
        T2_PROC[Custom Parser<br/>Finds Z*/Y* fields & tables]
        T2_OUT[Output: List of customizations]

        T2_IN --> T2
        T2 --> T2_PROC
        T2_PROC --> T2_OUT
    end

    subgraph "Tool: validate_abap_syntax"
        T3[validate_abap_syntax]
        T3_IN[Input: ABAP code]
        T3_PROC[ABAP Validator<br/>Checks keywords, structure]
        T3_OUT[Output: Valid/Invalid + errors]

        T3_IN --> T3
        T3 --> T3_PROC
        T3_PROC --> T3_OUT
    end

    subgraph "Tool: generate_odata_metadata"
        T4[generate_odata_metadata]
        T4_IN[Input: Entity definition]
        T4_PROC[OData Validator<br/>Generates XML metadata]
        T4_OUT[Output: OData XML]

        T4_IN --> T4
        T4 --> T4_PROC
        T4_PROC --> T4_OUT
    end

    SERVER -.-> T1
    SERVER -.-> T2
    SERVER -.-> T3
    SERVER -.-> T4

    style SERVER fill:#f3e5f5,stroke:#9c27b0,stroke-width:3px
    style T1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style T2 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style T3 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style T4 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
```

## 6. Agent Tool Access Matrix

| Agent | Built-in Tools | MCP Tools | Purpose |
|-------|----------------|-----------|---------|
| **quoteEndpointAgent**<br/>(Orchestrator) | Task, Read, Write, Edit, Bash, Grep, Glob | None | Coordinate workflow, delegate to subagents |
| **sapContextAgent**<br/>(Context Analyzer) | Read, Write, Grep, Glob | `parse_sap_table`<br/>`extract_sap_customizations` | Analyze SAP config, extract customizations |
| **abapCodeGenerator**<br/>(Code Generator) | Read, Write, Edit, Grep | `validate_abap_syntax`<br/>`generate_odata_metadata` | Generate & validate ABAP code |
| **testGenerator**<br/>(Test Generator) | Read, Write | None | Create test suites from generated code |
| **deploymentGuide**<br/>(Deployment Guide) | Read, Write | None | Write deployment documentation |

## 7. Execution Flow with Error Handling

```mermaid
stateDiagram-v2
    [*] --> Initialization

    Initialization --> Analysis

    state Analysis {
        [*] --> ReadConfig
        ReadConfig --> ExtractCustomizations
        ExtractCustomizations --> ParseTables
        ParseTables --> WriteAnalysis
        WriteAnalysis --> [*]

        note right of ExtractCustomizations
            MCP: extract_sap_customizations
        end note

        note right of ParseTables
            MCP: parse_sap_table
        end note
    }

    Analysis --> CodeGeneration
    Analysis --> Error

    state CodeGeneration {
        [*] --> LoadTemplates
        LoadTemplates --> GenFunctionModule
        GenFunctionModule --> ValidateFM
        ValidateFM --> GenODataService
        ValidateFM --> FixFM
        FixFM --> ValidateFM

        GenODataService --> ValidateOData
        ValidateOData --> GenDPC
        ValidateOData --> FixOData
        FixOData --> ValidateOData

        GenDPC --> ValidateDPC
        ValidateDPC --> GenMPC
        ValidateDPC --> FixDPC
        FixDPC --> ValidateDPC

        GenMPC --> ValidateMPC
        ValidateMPC --> [*]
        ValidateMPC --> FixMPC
        FixMPC --> ValidateMPC

        note right of ValidateFM
            MCP: validate_abap_syntax
        end note

        note right of ValidateOData
            MCP: generate_odata_metadata
        end note

        note right of ValidateDPC
            MCP: validate_abap_syntax
        end note

        note right of ValidateMPC
            MCP: validate_abap_syntax
        end note
    }

    CodeGeneration --> TestGeneration
    CodeGeneration --> Error

    state TestGeneration {
        [*] --> ReadAnalysis
        ReadAnalysis --> GenUnitTests
        GenUnitTests --> GenIntegrationTests
        GenIntegrationTests --> GenAPITests
        GenAPITests --> [*]
    }

    TestGeneration --> Documentation

    state Documentation {
        [*] --> ReadGeneratedFiles
        ReadGeneratedFiles --> GenerateGuide
        GenerateGuide --> [*]
    }

    Documentation --> Complete
    Complete --> [*]

    Error --> [*]
```

## 8. Session Management & Resumption

```mermaid
graph LR
    subgraph "Initial Request"
        U1[User: Generate endpoint]
    end

    subgraph "Session Creation"
        S1[Create Session ID<br/>UUID]
        S2[Store Full Context<br/>Request + Config]
    end

    subgraph "Generation Process"
        G1[Phase 1: Analysis]
        G2[Phase 2: Code Gen]
        G3[Phase 3: Tests]
        G4[Phase 4: Docs]
    end

    subgraph "Session Actions"
        A1{Action?}
        A2[Resume<br/>Continue original session]
        A3[Fork<br/>Create new branch]
    end

    subgraph "Benefits"
        B1[✅ Resume interrupted generation]
        B2[✅ Try different approaches]
        B3[✅ No state loss]
        B4[✅ Full conversation history]
    end

    U1 --> S1
    S1 --> S2
    S2 --> G1
    G1 --> G2
    G2 --> G3
    G3 --> G4

    G4 --> A1
    A1 -->|--resume session-id| A2
    A1 -->|--resume session-id --fork| A3

    A2 --> G2
    A3 --> G2

    A2 --> B1
    A2 --> B3
    A3 --> B2
    A3 --> B4

    style S1 fill:#e1f5ff,stroke:#0066cc,stroke-width:2px
    style A2 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style A3 fill:#fff3e0,stroke:#ff9800,stroke-width:2px
```

## Key Architectural Principles

### 1. Separation of Concerns
- **Orchestrator**: Workflow coordination only
- **Specialized Agents**: Domain-specific tasks
- **MCP Tools**: SAP-specific operations

### 2. Delegation Pattern
- Main agent delegates to subagents
- Each subagent has focused responsibility
- Clear inputs/outputs between agents

### 3. Tool Specialization
- **Context Analyzer**: Uses SAP parsing tools
- **Code Generator**: Uses validation tools
- **Test/Docs Generators**: Use file I/O only

### 4. Validation at Every Step
- ABAP syntax validation after each code gen
- OData metadata validation
- Analysis data validation
- Configuration file validation

### 5. Stateless Execution with Session Support
- Each agent execution is independent
- Sessions preserve full context for resumption
- Forking enables exploration without loss

### 6. File-Based Communication
- `analysis.json` is the contract between agents
- Templates drive code generation
- Generated files are inputs to downstream agents
