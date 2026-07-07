# Tropic Together Agent Rules

- Never expose secret keys, provider API keys, service-role keys, database passwords, booking references, passport data, or private travel documents.
- Do not modify Supabase migrations, RLS, Auth logic, deployment configuration, provider integrations, or production secrets unless the requested phase explicitly includes that work and the design has been explained first.
- Implement only the phase the product owner explicitly approves. Do not pre-build later modules.
- Do not implement maps, tasks, file uploads, AI features, expenses, reminders, or push notifications before those phases are requested.
- Mainland China accessibility is a product constraint. Do not introduce browser-side dependencies on services that require VPN for normal mainland users.

## AI Provider Policy

- AI providers must be selected server-side only. Browser clients must call our own typed backend API and must never receive provider API keys.
- Do not choose OpenAI based on VPN availability, client IP, or a user toggle.
- Mainland China production must default to a mainland-accessible provider. OpenAI may exist only in a separately configured global environment where access and account usage are supported.
- User-facing UI should expose planning modes and quality tiers, not raw provider or model names by default.
- AI calls must use minimized, structured trip data. Never send original tickets, hotel PDFs, booking references, passport data, full email addresses, or unnecessary private notes.
- Maintain an internal model registry and evaluation workflow so providers can be swapped without changing product logic.
