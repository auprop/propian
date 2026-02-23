-- ============================================================
-- 045: Update knowledge_pins DELETE policy to include admins
-- ============================================================

DROP POLICY IF EXISTS "Pin creator or owner can delete pins" ON public.knowledge_pins;

CREATE POLICY "Pin creator, owner, or admin can delete pins"
  ON public.knowledge_pins FOR DELETE
  USING (
    auth.uid() = pinned_by
    OR community_id IN (
      SELECT id FROM public.communities WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
