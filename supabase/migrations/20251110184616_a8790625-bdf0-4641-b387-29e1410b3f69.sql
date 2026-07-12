-- Allow admins to view conversation summaries
CREATE POLICY "Admins can view conversation summaries"
ON public.conversation_summaries
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Allow admins to manage conversation summaries
CREATE POLICY "Admins can insert conversation summaries"
ON public.conversation_summaries
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update conversation summaries"
ON public.conversation_summaries
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete conversation summaries"
ON public.conversation_summaries
FOR DELETE
TO authenticated
USING (public.is_admin());