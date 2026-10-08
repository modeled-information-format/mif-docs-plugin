---
id: 00b58029-88ca-52bb-960a-58c21cce1528
type: semantic
created: 2026-06-29T10:00:00Z
---

# Internet Banking System — C4 Model

This model describes the Internet Banking System at three C4 levels of
abstraction. Each diagram zooms in one level; the Code level (Level 4) is
deliberately omitted. The element catalogs below each diagram are the durable
record — the diagrams are one Mermaid rendering of those abstractions.

## Level 1 — System Context

How the Internet Banking System fits into the world: who uses it and which
other systems it depends on.

```mermaid
C4Context
    title System Context diagram for Internet Banking System
    Person(customer, "Banking Customer", "A personal banking customer")
    System(banking, "Internet Banking System", "Lets customers view accounts and make payments")
    System_Ext(mainframe, "Mainframe Banking System", "Stores all core banking information")
    System_Ext(email, "E-mail System", "Sends e-mail to customers")
    Rel(customer, banking, "Views accounts and makes payments using")
    Rel(banking, mainframe, "Gets account data from, makes payments using")
    Rel(banking, email, "Sends e-mail using")
    Rel(email, customer, "Sends e-mails to")
```

| Element | Kind | Responsibility |
| --- | --- | --- |
| Banking Customer | person | Views balances and makes payments online. |
| Internet Banking System | system (in scope) | Provides online banking to customers. |
| Mainframe Banking System | external system | System of record for accounts and transactions. |
| E-mail System | external system | Delivers notifications to customers. |

## Level 2 — Container

Zooming into the Internet Banking System to show its deployable/runnable
containers and how they communicate.

```mermaid
C4Container
    title Container diagram for Internet Banking System
    Person(customer, "Banking Customer", "A personal banking customer")
    System_Ext(mainframe, "Mainframe Banking System", "Stores core banking information")
    System_Ext(email, "E-mail System", "Sends e-mail to customers")
    Container_Boundary(c1, "Internet Banking System") {
        Container(spa, "Single-Page App", "JavaScript, React", "Delivers the banking UI in the browser")
        Container(api, "API Application", "Java, Spring Boot", "Provides banking features over JSON/HTTPS")
        ContainerDb(db, "Database", "PostgreSQL", "Stores accounts, credentials, and audit log")
    }
    Rel(customer, spa, "Views accounts and makes payments using", "HTTPS")
    Rel(spa, api, "Makes API calls to", "JSON/HTTPS")
    Rel(api, db, "Reads from and writes to", "JDBC")
    Rel(api, mainframe, "Makes API calls to", "XML/HTTPS")
    Rel(api, email, "Sends e-mail using", "SMTP")
```

| Element | Kind | Responsibility |
| --- | --- | --- |
| Single-Page App | container | Renders the banking interface in the browser. |
| API Application | container | Serves banking functionality to the SPA. |
| Database | container (datastore) | Persists accounts, credentials, and audit records. |
| Mainframe Banking System | external system | Source of truth reached via the API Application. |
| E-mail System | external system | Sends customer notifications. |

## Level 3 — Component

Zooming into the **API Application** container to show its major components.
The container name matches the Level 2 diagram exactly.

```mermaid
C4Component
    title Component diagram for Internet Banking System - API Application
    Container(spa, "Single-Page App", "JavaScript, React", "Delivers the banking UI")
    ContainerDb(db, "Database", "PostgreSQL", "Stores accounts, credentials, audit log")
    System_Ext(mainframe, "Mainframe Banking System", "Core banking system of record")
    Container_Boundary(api, "API Application") {
        Component(sign, "Sign In Controller", "Spring MVC Controller", "Handles authentication requests")
        Component(accounts, "Accounts Controller", "Spring MVC Controller", "Serves account data to the SPA")
        Component(security, "Security Component", "Spring Bean", "Verifies credentials and issues tokens")
        Component(facade, "Mainframe Facade", "Spring Bean", "Wraps the mainframe banking API")
    }
    Rel(spa, sign, "Submits credentials to", "JSON/HTTPS")
    Rel(spa, accounts, "Requests account data from", "JSON/HTTPS")
    Rel(sign, security, "Uses")
    Rel(security, db, "Reads credentials from", "JDBC")
    Rel(accounts, facade, "Uses")
    Rel(facade, mainframe, "Makes API calls to", "XML/HTTPS")
```

| Element | Kind | Responsibility |
| --- | --- | --- |
| Sign In Controller | component | Accepts sign-in requests and delegates to security. |
| Accounts Controller | component | Returns account data for the authenticated customer. |
| Security Component | component | Validates credentials and mints session tokens. |
| Mainframe Facade | component | Adapts the mainframe protocol for internal use. |

## Notes

- Level 4 (Code) is intentionally omitted: it ages quickly and is better
  generated on demand from the IDE.
- Every relationship is labelled with intent and, where it matters, protocol.
- Technology tags sit on containers and components only — never on people or
  external systems.

<!--
MIF Level 1 (floor): id, type, created + body only. This is a complete, valid
C4 model — but to a machine consumer it is opaque prose with embedded diagrams.
It cannot be queried for "is this architecture view still current?", "what
larger architecture document embeds it?", or "where did this model come from
and can I trust it?". Compare good.md (full L3: namespace + temporal validity,
W3C-PROV provenance, an architecture-view ontology type, and a typed
relationship to the arc42 document genre that embeds these diagrams).
-->
