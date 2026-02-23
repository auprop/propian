-- ============================================================
-- 044: Add UPDATE policy on messages for pinning & admin actions
-- ============================================================
-- The messages table had no UPDATE policy, causing the
-- is_pinned_to_library update in pinMessage() to silently fail.

-- Allow community members with pin permission (or owner/admin)
-- to update the is_pinned_to_library flag on messages.
-- Also allow message authors to update their own messages (future editing).

CREATE POLICY "Authors can update own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin/owner can update any message (for pinning, moderation, etc.)
CREATE POLICY "Admins can update messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
    OR room_id IN (
      SELECT cr.id FROM public.chat_rooms cr
      JOIN public.communities c ON c.id = cr.community_id
      WHERE c.owner_id = auth.uid()
    )
  );
