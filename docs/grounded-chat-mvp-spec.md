# Grounded Chat MVP Spec

This spec defines the next BRIDGE slice:

> allow chat sessions to be grounded in one attached dataset so imported internal data can be used directly in chat.

## Goal

Make chat materially more useful for internal-WAN engineering users by letting a session carry one dataset context into every completion.

## MVP scope

### Included
- attach one dataset to a chat session via session metadata
- show attached dataset in chat UI
- include compact dataset context in the provider prompt
- support create/edit session flows with attached dataset
- include dataset grounding info in chat context metadata

### Excluded
- multi-dataset retrieval
- semantic search/vector retrieval
- row-level citations in generated output
- per-message dataset switching

## Session metadata

Store grounding config in `ChatSession.metadata`:

```json
{
  "grounding": {
    "dataset_id": "ds_123"
  }
}
```

## Prompting behavior

When a dataset is attached:
- inject a grounding system block before chat history
- include:
  - dataset id
  - dataset name
  - row count if known
  - compact preview/sample rows or text excerpt
- instruct the assistant to prefer attached dataset context and say when information is not present in it

## UI

### Chat page
- dataset selector when creating a session
- dataset selector in session settings
- visible “grounded by dataset X” indicator in active session
- quick link to open dataset in Workbench

## Acceptance criteria

1. A chat session can be created with an attached dataset.
2. A chat session can be updated to change/remove the attached dataset.
3. Chat completions for grounded sessions include dataset context in provider messages.
4. The UI clearly shows when a session is grounded and by which dataset.
5. Existing chats without grounding continue to work unchanged.
