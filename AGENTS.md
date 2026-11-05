<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- AI chats (child Learn `sendChildLearningChatFn`, adult dashboard `sendAdultFinanceChatFn`) call the existing OpenRouter service only through authenticated server functions that build context server-side from the caller's own rows and require the `ai_advisor` Premium entitlement (family plans cover children/teens) via `src/lib/ai-chat.server.ts`; why: the browser must never supply the system prompt or another person's data.
- Parent → child management (`src/lib/child-management.functions.ts`) verifies an active guardian link, then changes name/language/money records only through guardian-checked SECURITY DEFINER functions (`wazen_*managed_child*`) that also refuse demo accounts; only login email/password changes use the admin client; why: the app is also self-hosted (Render) without the private server key, and demo data must stay intact.
