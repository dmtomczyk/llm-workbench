# Transform Rules MVP Spec

This spec defines the next import-system slice after file-backed and HTTP-backed recipes:

> add a small, explicit transform-rules layer so imported record sets can be normalized into stable workflow-ready shapes.

## Goal

Allow BRIDGE users to apply lightweight, predictable transformations to imported record-set data during preview and run.

## MVP scope

Supported only for payloads where `normalized_payload.type == "record_set"` and `items` is a list of objects.

### Included rules
- `rename_fields`
- `drop_fields`
- `keep_fields`
- `add_static_fields`

### Excluded for now
- arbitrary scripting
- nested-path extraction
- row filtering
- type coercion
- computed expressions
- non-record-set transforms

## Rule shape

```json
{
  "rename_fields": {"ticketId": "ticket_id", "sev": "severity"},
  "drop_fields": ["html_blob", "raw_payload"],
  "keep_fields": ["ticket_id", "severity", "summary"],
  "add_static_fields": {"source": "jira", "team": "platform"}
}
```

## Rule application order

1. rename fields
2. drop fields
3. keep fields
4. add static fields

## Preview behavior

Preview/test endpoints should apply transforms before returning preview, and include diagnostics:
- original field names
- transformed field names
- transformed row count
- applied rule summary

## Run behavior

Recipe runs should persist the transformed dataset version, not the raw parsed record set.

## UI

Expose the four rule groups in the `/imports` form using simple text inputs / textareas:
- rename mappings textarea (`from=to`, one per line)
- drop fields comma-separated
- keep fields comma-separated
- static fields textarea (`key=value`, one per line)

This should stay intentionally simple.

## Acceptance criteria

1. A file or HTTP recipe can define transform rules.
2. Preview reflects transformed record-set output.
3. Run persists transformed dataset content.
4. Non-record-set imports are left unchanged, with a warning if transform rules were supplied.
5. Existing recipes with no transform rules behave exactly as before.
