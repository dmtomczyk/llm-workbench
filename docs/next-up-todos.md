# Next-up TODOs

This is the next pickup list for BRIDGE.

## Chat / provider runtime

- Implement true provider-native streaming for providers that support it
  - OpenAI-compatible SSE streaming
  - Ollama streaming
- Keep the current pragmatic chunk-streaming path as fallback when native streaming is unavailable
- Add better stream lifecycle/error states in the chat UI

## Chat product polish

- Add per-session/provider capability hints (for example: supports streaming / local / requires credentials)
- Improve transcript export options and naming
- Consider copy/export for single messages

## Future slices already discussed

- Continue expanding workflow/scheduler support
- Deepen connector implementations beyond scaffold/test stubs
- Improve provider setup UX and diagnostics
